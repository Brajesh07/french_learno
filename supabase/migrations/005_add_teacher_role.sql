-- ================================================================
-- Migration 005: Add Teacher Role + Critical Security Fixes
-- FrenchLearno — Supabase PostgreSQL
-- ================================================================

-- ----------------------------------------------------------------
-- Phase 1: Critical Security Fixes to Existing Schema
-- ----------------------------------------------------------------

-- 1a. Role escalation fix: users cannot change their own role
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (
      select p.role
      from public.profiles p
      where p.id = auth.uid()
    )
  );

-- 1b. Cheat prevention: restrict quiz_answers to published quizzes only
drop policy if exists "Students can read quiz answers" on public.quiz_answers;

create policy "Students can read quiz answers for published quizzes"
  on public.quiz_answers
  for select
  using (
    exists (
      select 1
      from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      where qq.id = question_id
        and q.is_published = true
    )
  );

-- 1c. Remove insecure attempt-answer insert policy (service role bypasses RLS)
drop policy if exists "Service role can insert attempt answers" on public.quiz_attempt_answers;

-- 1d. Progress duplication: enforce one row per user per course
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_progress_user_id_course_id_key'
      and conrelid = 'public.user_progress'::regclass
  ) then
    delete from public.user_progress up1
    using public.user_progress up2
    where up1.user_id = up2.user_id
      and up1.course_id = up2.course_id
      and up1.id > up2.id;

    alter table public.user_progress
      add constraint user_progress_user_id_course_id_key
      unique (user_id, course_id);
  end if;
end
$$;

-- ----------------------------------------------------------------
-- Phase 2: RLS Helper Functions (Security Definer)
-- ----------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ----------------------------------------------------------------
-- Phase 3: Schema Updates (The Teacher Role)
-- ----------------------------------------------------------------

-- 3a. Extend profiles.role to include teacher
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'teacher', 'admin'));

-- 3b. teacher_profiles (1:1 with profiles)
create table if not exists public.teacher_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  bio text,
  expertise text,
  address text,
  verification_status text not null default 'pending'
    check (verification_status in (
      'draft', 'pending', 'needs_info', 'approved', 'rejected', 'suspended'
    )),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3c. teacher_documents (private KYC)
create table if not exists public.teacher_documents (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  doc_type text not null,
  storage_path text not null,
  delete_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_documents_teacher_id
  on public.teacher_documents (teacher_id);

-- 3d. teacher_students (junction table)
create table if not exists public.teacher_students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint teacher_students_teacher_student_distinct
    check (teacher_id <> student_id)
);

create unique index if not exists teacher_students_active_pair_unique
  on public.teacher_students (teacher_id, student_id)
  where ended_at is null;

create index if not exists idx_teacher_students_teacher_id
  on public.teacher_students (teacher_id)
  where ended_at is null;

create index if not exists idx_teacher_students_student_id
  on public.teacher_students (student_id)
  where ended_at is null;

-- 3e. Content ownership columns
alter table public.courses
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.quizzes
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_courses_created_by
  on public.courses (created_by);

create index if not exists idx_quizzes_created_by
  on public.quizzes (created_by);

-- Auto-update updated_at on new teacher tables
drop trigger if exists teacher_profiles_updated_at on public.teacher_profiles;
create trigger teacher_profiles_updated_at
  before update on public.teacher_profiles
  for each row execute procedure public.handle_updated_at();

drop trigger if exists teacher_documents_updated_at on public.teacher_documents;
create trigger teacher_documents_updated_at
  before update on public.teacher_documents
  for each row execute procedure public.handle_updated_at();

-- Phase 2 (continued): teacher-dependent helper functions require Phase 3 tables
create or replace function public.is_approved_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.teacher_profiles tp on tp.id = p.id
    where p.id = auth.uid()
      and p.role = 'teacher'
      and tp.verification_status = 'approved'
  );
$$;

create or replace function public.teaches_student(student_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teacher_students ts
    where ts.teacher_id = auth.uid()
      and ts.student_id = student_uuid
      and ts.ended_at is null
  );
$$;

revoke all on function public.is_approved_teacher() from public;
revoke all on function public.teaches_student(uuid) from public;

grant execute on function public.is_approved_teacher() to authenticated;
grant execute on function public.teaches_student(uuid) to authenticated;

-- ----------------------------------------------------------------
-- Phase 4: Apply RLS Policies
-- ----------------------------------------------------------------

-- 4a. Enable RLS on new tables
alter table public.teacher_profiles enable row level security;
alter table public.teacher_documents enable row level security;
alter table public.teacher_students enable row level security;

-- 4b. teacher_profiles policies
drop policy if exists "Teachers can read own teacher profile" on public.teacher_profiles;
create policy "Teachers can read own teacher profile"
  on public.teacher_profiles
  for select
  using (id = auth.uid());

drop policy if exists "Teachers can insert own teacher profile" on public.teacher_profiles;
create policy "Teachers can insert own teacher profile"
  on public.teacher_profiles
  for insert
  with check (
    id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
    )
  );

drop policy if exists "Admins can read all teacher profiles" on public.teacher_profiles;
create policy "Admins can read all teacher profiles"
  on public.teacher_profiles
  for select
  using (public.is_admin());

drop policy if exists "Admins can update all teacher profiles" on public.teacher_profiles;
create policy "Admins can update all teacher profiles"
  on public.teacher_profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- 4c. teacher_documents policies
drop policy if exists "Teachers can read own documents" on public.teacher_documents;
create policy "Teachers can read own documents"
  on public.teacher_documents
  for select
  using (teacher_id = auth.uid());

drop policy if exists "Teachers can insert own documents" on public.teacher_documents;
create policy "Teachers can insert own documents"
  on public.teacher_documents
  for insert
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
    )
  );

drop policy if exists "Admins can read all teacher documents" on public.teacher_documents;
create policy "Admins can read all teacher documents"
  on public.teacher_documents
  for select
  using (public.is_admin());

drop policy if exists "Admins can update all teacher documents" on public.teacher_documents;
create policy "Admins can update all teacher documents"
  on public.teacher_documents
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- 4d. teacher_students policies
drop policy if exists "Admins have full access to teacher_students" on public.teacher_students;
create policy "Admins have full access to teacher_students"
  on public.teacher_students
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Teachers can read own student assignments" on public.teacher_students;
create policy "Teachers can read own student assignments"
  on public.teacher_students
  for select
  using (teacher_id = auth.uid());

-- 4e. Teacher read access to assigned student progress
drop policy if exists "Teachers can read assigned student progress" on public.user_progress;
create policy "Teachers can read assigned student progress"
  on public.user_progress
  for select
  using (public.teaches_student(user_id));

drop policy if exists "Teachers can read assigned student quiz attempts" on public.quiz_attempts;
create policy "Teachers can read assigned student quiz attempts"
  on public.quiz_attempts
  for select
  using (public.teaches_student(user_id));

-- 4f. Teacher content creation on courses
drop policy if exists "Approved teachers can read own courses" on public.courses;
create policy "Approved teachers can read own courses"
  on public.courses
  for select
  using (
    public.is_approved_teacher()
    and created_by = auth.uid()
  );

drop policy if exists "Approved teachers can insert own courses" on public.courses;
create policy "Approved teachers can insert own courses"
  on public.courses
  for insert
  with check (
    public.is_approved_teacher()
    and created_by = auth.uid()
  );

drop policy if exists "Approved teachers can update own courses" on public.courses;
create policy "Approved teachers can update own courses"
  on public.courses
  for update
  using (
    public.is_approved_teacher()
    and created_by = auth.uid()
  )
  with check (
    public.is_approved_teacher()
    and created_by = auth.uid()
  );

drop policy if exists "Approved teachers can delete own courses" on public.courses;
create policy "Approved teachers can delete own courses"
  on public.courses
  for delete
  using (
    public.is_approved_teacher()
    and created_by = auth.uid()
  );

-- 4g. Teacher content creation on quizzes
drop policy if exists "Approved teachers can read own quizzes" on public.quizzes;
create policy "Approved teachers can read own quizzes"
  on public.quizzes
  for select
  using (
    public.is_approved_teacher()
    and created_by = auth.uid()
  );

drop policy if exists "Approved teachers can insert own quizzes" on public.quizzes;
create policy "Approved teachers can insert own quizzes"
  on public.quizzes
  for insert
  with check (
    public.is_approved_teacher()
    and created_by = auth.uid()
  );

drop policy if exists "Approved teachers can update own quizzes" on public.quizzes;
create policy "Approved teachers can update own quizzes"
  on public.quizzes
  for update
  using (
    public.is_approved_teacher()
    and created_by = auth.uid()
  )
  with check (
    public.is_approved_teacher()
    and created_by = auth.uid()
  );

drop policy if exists "Approved teachers can delete own quizzes" on public.quizzes;
create policy "Approved teachers can delete own quizzes"
  on public.quizzes
  for delete
  using (
    public.is_approved_teacher()
    and created_by = auth.uid()
  );
