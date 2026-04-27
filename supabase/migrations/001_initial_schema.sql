-- ================================================================
-- FrenchLearno — Supabase Database Schema (Staging)
-- Run each block in the Supabase SQL Editor, one at a time.
-- ================================================================

-- ----------------------------------------------------------------
-- Step 1: profiles
-- Extends auth.users with app-specific user data.
-- ----------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  name        text not null,
  username    text unique not null,
  email       text unique not null,

  phone       text,
  class       text,

  role        text not null default 'student'
                check (role in ('student', 'admin')),

  created_at  timestamptz default now()
);

-- Allow each user to read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Allow each user to update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Allow admins to read all profiles
create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

alter table public.profiles enable row level security;

-- ----------------------------------------------------------------
-- Step 2: courses
-- ----------------------------------------------------------------
create table public.courses (
  id                  uuid primary key default gen_random_uuid(),

  title               text not null,
  description         text,

  level               text not null check (level in ('A1', 'B1', 'B2')),

  content_text        text,
  content_audio_url   text,
  content_image_url   text,
  content_video_url   text,

  is_published        boolean default false,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Public: anyone can read published courses
create policy "Anyone can read published courses"
  on public.courses for select
  using (is_published = true);

-- Admins: full access
create policy "Admins have full access to courses"
  on public.courses for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

alter table public.courses enable row level security;

-- ----------------------------------------------------------------
-- Step 3: quizzes
-- ----------------------------------------------------------------
create table public.quizzes (
  id            uuid primary key default gen_random_uuid(),

  course_id     uuid references public.courses(id) on delete cascade,

  title         text not null,
  description   text,

  passing_score integer default 70,
  is_published  boolean default false,

  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create policy "Anyone can read published quizzes"
  on public.quizzes for select
  using (is_published = true);

create policy "Admins have full access to quizzes"
  on public.quizzes for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

alter table public.quizzes enable row level security;

-- ----------------------------------------------------------------
-- Step 4: quiz_questions
-- ----------------------------------------------------------------
create table public.quiz_questions (
  id          uuid primary key default gen_random_uuid(),

  quiz_id     uuid references public.quizzes(id) on delete cascade,

  question    text not null,
  type        text default 'mcq',
  points      integer default 1,
  explanation text,

  created_at  timestamptz default now()
);

create policy "Admins have full access to quiz_questions"
  on public.quiz_questions for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Students can read questions for published quizzes
create policy "Students can read questions for published quizzes"
  on public.quiz_questions for select
  using (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_id and q.is_published = true
    )
  );

alter table public.quiz_questions enable row level security;

-- ----------------------------------------------------------------
-- Step 5: quiz_answers
-- ----------------------------------------------------------------
create table public.quiz_answers (
  id           uuid primary key default gen_random_uuid(),

  question_id  uuid references public.quiz_questions(id) on delete cascade,

  answer       text not null,
  is_correct   boolean default false
);

create policy "Admins have full access to quiz_answers"
  on public.quiz_answers for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Students can read answers (without is_correct revealed at query time — handle in API)
create policy "Students can read quiz answers"
  on public.quiz_answers for select
  using (true);

alter table public.quiz_answers enable row level security;

-- ----------------------------------------------------------------
-- Step 6: quiz_attempts
-- ----------------------------------------------------------------
create table public.quiz_attempts (
  id          uuid primary key default gen_random_uuid(),

  user_id     uuid references public.profiles(id) on delete cascade,
  quiz_id     uuid references public.quizzes(id) on delete cascade,

  score       integer,
  passed      boolean,

  created_at  timestamptz default now()
);

create policy "Users can read own quiz attempts"
  on public.quiz_attempts for select
  using (auth.uid() = user_id);

create policy "Users can insert own quiz attempts"
  on public.quiz_attempts for insert
  with check (auth.uid() = user_id);

create policy "Admins can read all quiz attempts"
  on public.quiz_attempts for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

alter table public.quiz_attempts enable row level security;

-- ----------------------------------------------------------------
-- Step 7: user_progress
-- ----------------------------------------------------------------
create table public.user_progress (
  id            uuid primary key default gen_random_uuid(),

  user_id       uuid references public.profiles(id) on delete cascade,
  course_id     uuid references public.courses(id) on delete cascade,

  completed     boolean default false,
  completed_at  timestamptz
);

create policy "Users can read and write own progress"
  on public.user_progress for all
  using (auth.uid() = user_id);

create policy "Admins can read all progress"
  on public.user_progress for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

alter table public.user_progress enable row level security;

-- ----------------------------------------------------------------
-- Step 8: subscriptions
-- ----------------------------------------------------------------
create table public.subscriptions (
  id          uuid primary key default gen_random_uuid(),

  user_id     uuid references public.profiles(id) on delete cascade,

  plan        text default 'free',
  status      text default 'active',

  start_date  timestamptz,
  end_date    timestamptz,

  created_at  timestamptz default now()
);

create policy "Users can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Admins have full access to subscriptions"
  on public.subscriptions for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

alter table public.subscriptions enable row level security;

-- ----------------------------------------------------------------
-- Step 9: showcase_content (CMS)
-- ----------------------------------------------------------------
create table public.showcase_content (
  id           uuid primary key default gen_random_uuid(),

  section_key  text unique not null, -- e.g. 'hero', 'features', 'testimonials', 'cta'

  title        text,
  subtitle     text,
  body         text,

  image_url    text,
  cta_text     text,
  cta_url      text,

  is_visible   boolean default true,

  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Anyone can read visible CMS content (public website rendering)
create policy "Anyone can read visible showcase content"
  on public.showcase_content for select
  using (is_visible = true);

create policy "Admins have full access to showcase content"
  on public.showcase_content for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

alter table public.showcase_content enable row level security;

-- ----------------------------------------------------------------
-- Step 10: Trigger — auto-update updated_at timestamps
-- ----------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger courses_updated_at
  before update on public.courses
  for each row execute procedure public.handle_updated_at();

create trigger quizzes_updated_at
  before update on public.quizzes
  for each row execute procedure public.handle_updated_at();

create trigger showcase_content_updated_at
  before update on public.showcase_content
  for each row execute procedure public.handle_updated_at();

-- ----------------------------------------------------------------
-- Step 11: Seed initial showcase content sections
-- ----------------------------------------------------------------
insert into public.showcase_content (section_key, title, subtitle, body, is_visible)
values
  ('hero',         'Learn French the Smart Way', 'Structured courses, quizzes, and guided progression', null, true),
  ('features',     'Why FrenchLearno?',           'Everything you need to master French',              null, true),
  ('testimonials', 'What Our Students Say',        null,                                                null, true),
  ('cta',          'Ready to Start?',              'Join FrenchLearno today',                           null, true);
