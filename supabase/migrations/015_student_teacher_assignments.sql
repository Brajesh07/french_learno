-- One active teacher per student, admin-managed assignment and delivery access.
-- Apply after 014. Safe to rerun; assignment and learning history are retained.
begin;
do $$ begin
 if exists(select 1 from public.teacher_students where ended_at is null group by student_id having count(*)>1) then
  raise exception 'Resolve students with multiple active assignments before applying migration 015.';
 end if;
end $$;
create unique index if not exists teacher_students_one_active_teacher on public.teacher_students(student_id) where ended_at is null;
revoke insert,update,delete on public.teacher_students from authenticated;

create or replace function public.assigned_teacher_id() returns uuid
language sql stable security definer set search_path='' as $$
 select ts.teacher_id from public.teacher_students ts
 join public.profiles s on s.id=ts.student_id join public.profiles t on t.id=ts.teacher_id
 join public.teacher_profiles tp on tp.id=t.id
 where s.id=auth.uid() and s.role='student' and s.is_active and not s.must_change_password
 and ts.ended_at is null and ts.assigned_at<=now()
 and t.role='teacher' and t.is_active and not t.must_change_password and tp.verification_status='approved';
$$;
revoke all on function public.assigned_teacher_id() from public,anon;
grant execute on function public.assigned_teacher_id() to authenticated;

create or replace function public.get_admin_student_assignment(p_student_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 if not exists(select 1 from public.profiles where id=p_student_id and role='student') then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
 return jsonb_build_object('assignment',(
  select jsonb_build_object('id',ts.id,'teacherId',t.id,'teacherName',coalesce(t.name,t.email),'status',tp.verification_status,'active',t.is_active and not t.must_change_password)
  from public.teacher_students ts join public.profiles t on t.id=ts.teacher_id left join public.teacher_profiles tp on tp.id=t.id
  where ts.student_id=p_student_id and ts.ended_at is null
 ),'teachers',(
  select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'name',coalesce(t.name,t.email),'email',t.email) order by t.name,t.id),'[]')
  from public.profiles t join public.teacher_profiles tp on tp.id=t.id
  where t.role='teacher' and t.is_active and not t.must_change_password and tp.verification_status='approved'
 ));
end $$;

create or replace function public.assign_student_teacher(p_student_id uuid,p_teacher_id uuid,p_expected_assignment_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_link public.teacher_students; s public.profiles;
begin
 perform 1 from public.profiles where id=auth.uid() and role='admin' and is_active and not must_change_password for share;
 if not found then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 -- Delivery/submission also locks this profile. Reassignment cannot race a reward commit.
 select * into s from public.profiles where id=p_student_id for update;
 if not found or s.role<>'student' then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
 if p_teacher_id is not null then
  if not s.is_active then raise exception 'Activate the student before assigning a teacher.' using errcode='22023'; end if;
  perform 1 from public.profiles where id=p_teacher_id and role='teacher' and is_active and not must_change_password for share;
  if not found then raise exception 'Choose an active, approved teacher.' using errcode='22023'; end if;
  perform 1 from public.teacher_profiles where id=p_teacher_id and verification_status='approved' for share;
  if not found then raise exception 'Choose an active, approved teacher.' using errcode='22023'; end if;
 end if;
 select * into current_link from public.teacher_students where student_id=p_student_id and ended_at is null for update;
 -- Repeating the same desired state after a lost response is harmless.
 if current_link.teacher_id is not distinct from p_teacher_id then return public.get_admin_student_assignment(p_student_id); end if;
 if current_link.id is distinct from p_expected_assignment_id then raise exception 'ASSIGNMENT_CHANGED' using errcode='40001'; end if;
 update public.teacher_students set ended_at=now() where id=current_link.id;
 if p_teacher_id is not null then
  insert into public.teacher_students(teacher_id,student_id,assigned_by) values(p_teacher_id,p_student_id,auth.uid());
 end if;
 insert into public.admin_audit_log(actor_id,action,target_id) values(auth.uid(),case when p_teacher_id is null then 'teacher_unassigned' else 'teacher_assigned' end,p_student_id);
 return public.get_admin_student_assignment(p_student_id);
end $$;

create or replace function public.list_assigned_students() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not coalesce(public.is_approved_teacher(),false) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'email',s.email,'level',s.class,'active',s.is_active,'assignedAt',ts.assigned_at) order by s.name,s.id),'[]')
 from public.teacher_students ts join public.profiles s on s.id=ts.student_id
 where ts.teacher_id=auth.uid() and ts.ended_at is null and ts.assigned_at<=now() and s.role='student');
end $$;
revoke all on function public.get_admin_student_assignment(uuid),public.assign_student_teacher(uuid,uuid,uuid),public.list_assigned_students() from public,anon;
grant execute on function public.get_admin_student_assignment(uuid),public.assign_student_teacher(uuid,uuid,uuid),public.list_assigned_students() to authenticated;

create or replace function public.learning_delivery_module(p_revision uuid) returns public.quiz_revisions
language plpgsql security definer set search_path = '' as $$
declare m public.quiz_revisions; live public.quiz_revisions; q public.quizzes; c public.courses; s public.profiles; t public.profiles; approval text;
begin
  select * into s from public.profiles where id=auth.uid() for share;
  if not found or s.role<>'student' or not s.is_active or s.must_change_password then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select * into m from public.quiz_revisions where id=p_revision;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  select * into q from public.quizzes where id=m.quiz_id;
  if q.created_by is distinct from public.assigned_teacher_id() or q.created_by is null then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select * into t from public.profiles where id=q.created_by for share;
  select verification_status into approval from public.teacher_profiles where id=t.id for share;
  if t.id is null or t.role<>'teacher' or not t.is_active or t.must_change_password or approval is distinct from 'approved' then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select * into q from public.quizzes where id=m.quiz_id for share;
  select * into c from public.courses where id=q.course_id for share;
  select * into live from public.quiz_revisions where quiz_id=q.id and status='published' for share;
  select * into m from public.quiz_revisions where id=p_revision for share;
  if c.id is null or not c.is_published or not q.is_published or c.created_by<>t.id or q.created_by<>t.id
    or live.id is null or m.status not in ('published','archived')
    or ((m.access_tier='premium' or live.access_tier='premium') and not s.has_subscription) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  return m;
end $$;

create or replace function public.get_learning_catalogue() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.profiles; modules jsonb; totals jsonb; v_teacher_id uuid; assignment jsonb;
begin
  select * into s from public.profiles where id=auth.uid() for share;
  if not found or s.role<>'student' or not s.is_active or s.must_change_password then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  v_teacher_id:=public.assigned_teacher_id();
  select jsonb_build_object('id',ts.id,'teacherId',t.id,'teacherName',coalesce(t.name,t.email)) into assignment
    from public.teacher_students ts join public.profiles t on t.id=ts.teacher_id where ts.student_id=s.id and ts.teacher_id=v_teacher_id and ts.ended_at is null and ts.assigned_at<=now();
  select coalesce(jsonb_agg(jsonb_build_object('id',r.quiz_id,'revisionId',r.id,'courseId',c.id,'courseTitle',c.title,'title',r.title,'objective',r.objective,
    'proficiency',r.proficiency,'accessTier',r.access_tier,'locked',r.access_tier='premium' and not s.has_subscription,
    'questionCount',(select count(*) from public.quiz_revision_items where quiz_revision_id=r.id),
    'types',(select jsonb_agg(distinct qr.type) from public.quiz_revision_items i join public.quiz_question_revisions qr on qr.id=i.question_revision_id where i.quiz_revision_id=r.id),
    'completed',exists(select 1 from public.learning_reward_events where user_id=s.id and source_key='lesson:'||r.quiz_id),
    'dueReviews',(select count(*) from public.learning_review_state rs join public.quiz_revision_items i on i.question_id=rs.question_id where rs.user_id=s.id and i.quiz_revision_id=r.id and rs.due_date<=(now() at time zone 'UTC')::date)
  ) order by r.published_at,r.quiz_id),'[]') into modules
  from public.quiz_revisions r join public.quizzes q on q.id=r.quiz_id join public.courses c on c.id=q.course_id
  join public.profiles t on t.id=q.created_by join public.teacher_profiles tp on tp.id=t.id
  where t.id=v_teacher_id and r.status='published' and q.is_published and c.is_published and c.created_by=t.id and t.role='teacher' and t.is_active and not t.must_change_password and tp.verification_status='approved';
  select jsonb_build_object('xp',xp,'coins',coins,'hearts',hearts,'revision',revision) into totals from public.learning_totals where user_id=s.id;
  return jsonb_build_object('assignment',assignment,'modules',modules,'totals',coalesce(totals,'{"xp":0,"coins":0,"hearts":5,"revision":0}'),
   'activeSessions',(select coalesce(jsonb_agg(x),'[]') from (select id,mode,created_at as "createdAt" from public.learning_sessions ls where user_id=s.id and status='active' and exists(select 1 from public.quiz_revisions r join public.quizzes q on q.id=r.quiz_id where r.id=ls.quiz_revision_id and q.created_by=v_teacher_id and q.is_published and exists(select 1 from public.courses c where c.id=q.course_id and c.created_by=v_teacher_id and c.is_published)) order by created_at desc limit 10) x),
   'completedSessions',(select count(*) from public.learning_sessions where user_id=s.id and status='completed'),
   'days',(select coalesce(jsonb_agg(d),'[]') from (select distinct (completed_at at time zone 'UTC')::date d from public.learning_sessions where user_id=s.id and status='completed') dates),'timeZone','UTC');
end $$;

-- Keep the audited grader intact and put an assignment gate in front of it.
-- Its historical-receipt retry branch must also respect revoked assignment.
-- Rename the original grader exactly once. On replay, the public function is
-- already the assignment wrapper: renaming it would replace/conflict with the
-- original implementation and could introduce recursive calls.
do $$
begin
 if to_regprocedure('public.submit_learning_answer_v1(uuid,jsonb)') is null then
  if to_regprocedure('public.submit_learning_answer(uuid,jsonb)') is null then
   raise exception 'Migration 015 requires the submission grader from migration 011.';
  end if;
  if position('submit_learning_answer_v1' in pg_get_functiondef(
    to_regprocedure('public.submit_learning_answer(uuid,jsonb)'))) > 0 then
   raise exception 'Original submission grader is missing; restore it before applying migration 015.';
  end if;
  alter function public.submit_learning_answer(uuid,jsonb) rename to submit_learning_answer_v1;
 end if;
end $$;
revoke all on function public.submit_learning_answer_v1(uuid,jsonb) from public,anon,authenticated,service_role;
create or replace function public.submit_learning_answer(p_session_id uuid,p_submission jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare owner_id uuid; assigned_id uuid;
begin
 perform 1 from public.profiles where id=auth.uid() and role='student' and is_active and not must_change_password for share;
 if not found then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 if not exists(select 1 from public.learning_sessions where id=p_session_id and user_id=auth.uid()) then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
 select q.created_by into owner_id from public.learning_session_questions sq
 join public.quiz_question_revisions qr on qr.id=sq.question_revision_id join public.quizzes q on q.id=qr.quiz_id
 where sq.session_id=p_session_id and sq.id=(p_submission->>'sessionQuestionId')::uuid;
 if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
 assigned_id:=public.assigned_teacher_id();
 if assigned_id is null or owner_id is distinct from assigned_id then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 return public.submit_learning_answer_v1(p_session_id,p_submission);
end $$;
revoke all on function public.submit_learning_answer(uuid,jsonb) from public,anon,service_role;
grant execute on function public.submit_learning_answer(uuid,jsonb) to authenticated;

-- Close legacy/direct-table catalogue paths as well. Admin and teacher read
-- policies remain unchanged; rich delivery still applies its own live checks.
create or replace function public.student_can_read_course(p_course_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.courses c join public.profiles s on s.id=auth.uid()
 where c.id=p_course_id and c.is_published and c.created_by=public.assigned_teacher_id()
 and (s.has_subscription or exists(select 1 from public.quizzes q join public.quiz_revisions r on r.quiz_id=q.id
 where q.course_id=c.id and q.created_by=c.created_by and q.is_published and r.status='published' and r.access_tier='free')));
$$;
create or replace function public.student_can_read_quiz(p_quiz_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.quizzes q join public.courses c on c.id=q.course_id join public.profiles s on s.id=auth.uid()
 where q.id=p_quiz_id and q.is_published and c.is_published and q.created_by=c.created_by and q.created_by=public.assigned_teacher_id()
 and (s.has_subscription or exists(select 1 from public.quiz_revisions r where r.quiz_id=q.id and r.status='published' and r.access_tier='free')));
$$;
revoke all on function public.student_can_read_course(uuid),public.student_can_read_quiz(uuid) from public,anon;
grant execute on function public.student_can_read_course(uuid),public.student_can_read_quiz(uuid) to authenticated;
drop policy if exists "Anyone can read published courses" on public.courses;
drop policy if exists "Anyone can read published quizzes" on public.quizzes;
drop policy if exists "Students read assigned courses" on public.courses;
drop policy if exists "Students read assigned quizzes" on public.quizzes;
create policy "Students read assigned courses" on public.courses for select to authenticated using(public.student_can_read_course(id));
create policy "Students read assigned quizzes" on public.quizzes for select to authenticated using(public.student_can_read_quiz(id));
commit;
