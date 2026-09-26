-- Run only through check-account-role-security.mjs. Every fixture is rolled back.
create temporary table test_accounts (label text primary key, id uuid not null);
insert into test_accounts values
  ('student', gen_random_uuid()), ('other', gen_random_uuid()),
  ('teacher', gen_random_uuid()), ('admin', gen_random_uuid());
grant select on test_accounts to authenticated, service_role;
insert into auth.users (id, email)
  select id, id::text || '@example.test' from test_accounts;
insert into public.profiles (id, name, username, email, role)
  select id, label, id::text, id::text || '@example.test',
    case when label in ('teacher', 'admin') then label else 'student' end
  from test_accounts;

create function pg_temp.check_true(ok boolean, description text)
returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAILED: %', description; end if;
end;
$$;
create function pg_temp.expect_denied(statement text)
returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when insufficient_privilege then return;
  end;
  raise exception 'Expected permission/RLS denial: %', statement;
end;
$$;
create function pg_temp.as_user(label_name text)
returns void language sql as $$
  select set_config('request.jwt.claim.sub',
    (select id::text from test_accounts where label = label_name), true)::void;
$$;

set local role authenticated;
select pg_temp.as_user('student');
update public.profiles set name = 'Editable name' where id = auth.uid();
select pg_temp.check_true(
  (select name = 'Editable name' from public.profiles where id = auth.uid()),
  'student can edit safe profile fields without recursive policy');
select pg_temp.expect_denied('update public.profiles set role = ''admin'' where id = auth.uid()');
select pg_temp.expect_denied('update public.profiles set has_subscription = true where id = auth.uid()');
select pg_temp.expect_denied('update public.profiles set is_active = true where id = auth.uid()');
select pg_temp.expect_denied('update public.profiles set must_change_password = false where id = auth.uid()');
select pg_temp.expect_denied('update public.profiles set has_real_email = true where id = auth.uid()');
select pg_temp.expect_denied('update public.profiles set email = ''changed@example.test'' where id = auth.uid()');
do $$
declare affected integer;
begin
  update public.profiles set name = 'Forbidden'
    where id = (select id from test_accounts where label = 'other');
  get diagnostics affected = row_count;
  perform pg_temp.check_true(affected = 0, 'student cannot edit another profile');
end;
$$;
select pg_temp.expect_denied('insert into public.teacher_profiles (id) values (auth.uid())');

select pg_temp.as_user('teacher');
select pg_temp.expect_denied(
  'insert into public.teacher_profiles (id, verification_status) values (auth.uid(), ''approved'')');
insert into public.teacher_profiles (id, bio) values (auth.uid(), 'Pending teacher');
select pg_temp.check_true(
  (select verification_status = 'pending' and reviewed_by is null and reviewed_at is null
    from public.teacher_profiles where id = auth.uid()), 'teacher starts pending');
update public.teacher_profiles set bio = 'Edited biography' where id = auth.uid();
select pg_temp.expect_denied(
  'update public.teacher_profiles set verification_status = ''approved'' where id = auth.uid()');
select pg_temp.expect_denied(
  'update public.teacher_profiles set reviewed_by = auth.uid() where id = auth.uid()');
select pg_temp.expect_denied(
  'insert into public.teacher_students (teacher_id, student_id) select auth.uid(), id from test_accounts where label = ''student''');

reset role;
insert into public.teacher_students (teacher_id, student_id)
  select t.id, s.id from test_accounts t cross join test_accounts s
  where t.label = 'teacher' and s.label = 'student';
set local role authenticated;
select pg_temp.check_true(not public.is_approved_teacher(), 'pending teacher has no approved access');
select pg_temp.check_true(not public.teaches_student(
  (select id from test_accounts where label = 'student')), 'pending teacher cannot access assigned progress');

-- Existing admin mutations use service_role; they must retain their privileges.
reset role;
set local role service_role;
update public.teacher_profiles set verification_status = 'approved',
  reviewed_by = (select id from test_accounts where label = 'admin'), reviewed_at = now()
  where id = (select id from test_accounts where label = 'teacher');
update public.profiles set has_subscription = true, has_real_email = false
  where id = (select id from test_accounts where label = 'student');
insert into public.admin_audit_log (actor_id, action, target_id)
  select a.id, 'teacher_approved', t.id from test_accounts a cross join test_accounts t
  where a.label = 'admin' and t.label = 'teacher';
select pg_temp.expect_denied('update public.admin_audit_log set action = ''rewritten''');
select pg_temp.expect_denied('delete from public.admin_audit_log');

reset role;
set local role authenticated;
select pg_temp.as_user('teacher');
select pg_temp.check_true(public.is_approved_teacher(), 'approved active teacher recognized');
select pg_temp.check_true(public.teaches_student(
  (select id from test_accounts where label = 'student')), 'approved teacher has assigned access');
select pg_temp.check_true(not public.teaches_student(
  (select id from test_accounts where label = 'other')), 'unassigned student inaccessible');
select pg_temp.check_true(not exists (select 1 from public.admin_audit_log), 'teacher cannot read audit log');

reset role;
update public.teacher_profiles set verification_status = 'suspended'
  where id = (select id from test_accounts where label = 'teacher');
set local role authenticated;
select pg_temp.check_true(not public.teaches_student(
  (select id from test_accounts where label = 'student')), 'suspension removes assigned access');
reset role;
update public.teacher_profiles set verification_status = 'approved'
  where id = (select id from test_accounts where label = 'teacher');
update public.profiles set is_active = false
  where id = (select id from test_accounts where label = 'teacher');
set local role authenticated;
select pg_temp.check_true(public.current_app_role() is null, 'inactive teacher rejected');
select pg_temp.check_true(not coalesce(public.is_approved_teacher(), false), 'inactive approval rejected');
reset role;
update public.profiles set is_active = true, must_change_password = true
  where id = (select id from test_accounts where label = 'teacher');
set local role authenticated;
select pg_temp.check_true(public.current_app_role() is null, 'password-change gate recognized');
reset role;
update public.profiles set must_change_password = false
  where id = (select id from test_accounts where label = 'teacher');
update public.teacher_students set ended_at = now()
  where teacher_id = (select id from test_accounts where label = 'teacher');
set local role authenticated;
select pg_temp.check_true(not public.teaches_student(
  (select id from test_accounts where label = 'student')), 'ended assignment removes access');

select pg_temp.as_user('admin');
select pg_temp.check_true(public.is_admin(), 'active admin recognized');
select pg_temp.check_true(exists (select 1 from public.admin_audit_log
  where actor_id = auth.uid()), 'admin can read audit log');
select pg_temp.check_true((select count(*) = 4 from public.profiles
  where id in (select id from test_accounts)), 'admin profile visibility preserved');
select pg_temp.as_user('student');
select pg_temp.check_true(not exists (select 1 from public.admin_audit_log), 'student cannot read audit log');
select pg_temp.check_true((select has_subscription and not has_real_email
  from public.profiles where id = auth.uid()), 'existing service-role admin update preserved');
reset role;
select pg_temp.check_true(not has_table_privilege('anon', 'public.profiles', 'SELECT'), 'anonymous profile reads denied');
select pg_temp.check_true(not exists (select 1 from pg_policies where schemaname = 'public'
  and policyname in ('Approved teachers can delete own courses', 'Approved teachers can delete own quizzes')),
  'teacher cascade-delete policies removed');

rollback;
\echo Account and teacher security checks passed; migration and all fixtures rolled back.
