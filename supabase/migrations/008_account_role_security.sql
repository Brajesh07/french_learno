-- Block 1: account and teacher security foundations.
-- Requires migrations 001-007, including the three teacher tables from 005.
-- Signup/email-confirmation settings are deliberately unchanged.
-- Password recovery OTP and route enforcement arrive in later code blocks.
begin;

alter table public.profiles
  add column must_change_password boolean not null default false,
  add column has_real_email boolean not null default true;

comment on column public.profiles.must_change_password is
  'Server-managed. Clear only after successful password replacement. Existing accounts are not forced to reset by this migration.';
comment on column public.profiles.has_real_email is
  'Recovery delivery eligibility, NOT email verification. Admin-created placeholder accounts must explicitly set false.';

-- Read routing state from profiles directly. This helper is for protected
-- operations: inactive accounts or accounts awaiting password change get null.
create function public.current_app_role()
returns text
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = (select auth.uid())
    and p.is_active and not p.must_change_password;
$$;
revoke all on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated, service_role;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

create or replace function public.is_approved_teacher()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.current_app_role() = 'teacher' and exists (
    select 1 from public.teacher_profiles tp
    where tp.id = (select auth.uid()) and tp.verification_status = 'approved'
  );
$$;
revoke all on function public.is_approved_teacher() from public, anon;
grant execute on function public.is_approved_teacher() to authenticated, service_role;

create or replace function public.teaches_student(student_uuid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.is_approved_teacher(), false) and exists (
    select 1 from public.teacher_students ts
    join public.profiles s on s.id = ts.student_id
    where ts.teacher_id = (select auth.uid())
      and ts.student_id = student_uuid
      and ts.ended_at is null and ts.assigned_at <= now()
      and s.role = 'student' and s.is_active
  );
$$;
revoke all on function public.teaches_student(uuid) from public, anon;
grant execute on function public.teaches_student(uuid) to authenticated, service_role;

-- Replace the recursive self-update policy. RLS controls rows; column grants
-- control fields. Identity, role, subscription and recovery flags are writable
-- only by trusted server operations, including the existing admin APIs.
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, phone, class) on public.profiles to authenticated;

drop policy "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and public.current_app_role() is not null)
  with check (id = (select auth.uid()) and public.current_app_role() is not null);

-- Existing teacher tables are reused, never recreated or backfilled as approved.
alter table public.teacher_profiles enable row level security;
revoke all on public.teacher_profiles from public, anon, authenticated;
grant select on public.teacher_profiles to authenticated;
grant insert (id, bio, expertise, address) on public.teacher_profiles to authenticated;
grant update (bio, expertise, address) on public.teacher_profiles to authenticated;

drop policy "Teachers can insert own teacher profile" on public.teacher_profiles;
create policy "Teachers can insert own teacher profile"
  on public.teacher_profiles for insert to authenticated
  with check (
    id = (select auth.uid()) and public.current_app_role() = 'teacher'
    and verification_status = 'pending'
    and reviewed_by is null and reviewed_at is null
  );

create policy "Teachers can edit own profile details"
  on public.teacher_profiles for update to authenticated
  using (id = (select auth.uid()) and public.current_app_role() = 'teacher')
  with check (id = (select auth.uid()) and public.current_app_role() = 'teacher');

-- Administrative approval uses the verified admin API + service-role client.
-- Browsers cannot write verification_status, reviewer fields, IDs or timestamps.
alter table public.teacher_documents enable row level security;
revoke all on public.teacher_documents from public, anon, authenticated;
grant select on public.teacher_documents to authenticated;
grant insert (teacher_id, doc_type, storage_path)
  on public.teacher_documents to authenticated;

drop policy "Teachers can insert own documents" on public.teacher_documents;
create policy "Teachers can insert own documents"
  on public.teacher_documents for insert to authenticated
  with check (
    teacher_id = (select auth.uid()) and public.current_app_role() = 'teacher'
    and delete_after is null
  );

alter table public.teacher_students enable row level security;
revoke all on public.teacher_students from public, anon, authenticated;
grant select, insert, update, delete on public.teacher_students to authenticated;
-- Existing admin-only mutation policy remains; teachers have SELECT only in RLS.
drop policy "Teachers can read own student assignments" on public.teacher_students;
create policy "Teachers can read own student assignments"
  on public.teacher_students for select to authenticated
  using (teacher_id = (select auth.uid()) and public.is_approved_teacher());

-- Stop teacher deletion from cascading into student attempts and course history.
-- Admin content-management policies and existing admin service-role APIs remain.
drop policy "Approved teachers can delete own courses" on public.courses;
drop policy "Approved teachers can delete own quizzes" on public.quizzes;

-- Audit identifiers intentionally have no cascading profile FK: deleting an
-- account must not delete or rewrite the record of who performed an action.
-- No JSON payload or password field: credentials must never be written here.
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  action text not null check (char_length(action) between 1 and 100),
  target_id uuid not null,
  created_at timestamptz not null default now()
);
create index admin_audit_log_target_created_idx
  on public.admin_audit_log (target_id, created_at desc);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from public, anon, authenticated, service_role;
grant select on public.admin_audit_log to authenticated;
grant select, insert on public.admin_audit_log to service_role;
create policy "Admins read audit log"
  on public.admin_audit_log for select to authenticated
  using (public.is_admin());

comment on table public.admin_audit_log is
  'Append-only to application roles. Written by authorized server operations; never store passwords, OTPs or tokens.';

commit;
