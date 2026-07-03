# 🗄️ FrenchLearno — Database Schema (Supabase)

---

## 1. 📌 Overview

This database is designed using **PostgreSQL (Supabase)** with a relational structure.

Key principles:

- Use **UUIDs** for all primary keys
- Avoid nested data (no Firestore-style structure)
- Maintain clear relationships between tables
- Keep schema simple and scalable

---

## 2. 👤 Users & Profiles

### 🔐 `auth.users` (Supabase default)

Managed by Supabase:

- id (UUID)
- email
- password

---

### 📄 `profiles`

Stores all user-related data.

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  name text not null,
  username text unique not null,
  email text unique not null,

  phone text,
  class text,

  role text not null default 'student' check (role in ('student', 'admin')),

  is_active boolean not null default true,
  has_subscription boolean not null default false,

  created_at timestamptz default now()
);
```

---

## 3. 📚 Courses

```sql
create table public.courses (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  description text,

  level text not null check (level in ('A1', 'B1', 'B2')),

  content_text text,
  content_audio_url text,
  content_image_url text,
  content_video_url text,

  is_published boolean default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 4. 📝 Quizzes

```sql
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),

  course_id uuid references public.courses(id) on delete cascade,

  title text not null,
  description text,

  passing_score integer default 70,
  is_published boolean default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 5. ❓ Quiz Questions

```sql
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),

  quiz_id uuid references public.quizzes(id) on delete cascade,

  question text not null,
  type text default 'mcq',
  points integer default 1,
  explanation text,

  created_at timestamptz default now()
);
```

---

## 6. ✅ Quiz Answers

```sql
create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),

  question_id uuid references public.quiz_questions(id) on delete cascade,

  answer text not null,
  is_correct boolean default false
);
```

---

## 7. 📊 Quiz Attempts

```sql
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references public.profiles(id) on delete cascade,
  quiz_id uuid references public.quizzes(id) on delete cascade,

  score integer,
  passed boolean,

  created_at timestamptz default now()
);
```

---

## 8. 📝 Quiz Attempt Answers

Stores per-question student responses for each quiz attempt, enabling detailed result breakdowns.

```sql
create table if not exists public.quiz_attempt_answers (
  id                 uuid primary key default gen_random_uuid(),
  attempt_id         uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id        uuid not null references public.quiz_questions(id) on delete cascade,
  selected_answer_id uuid references public.quiz_answers(id) on delete set null,
  is_correct         boolean not null,
  created_at         timestamptz default now()
);
```

---

## 9. 📈 Progress Tracking

```sql
create table public.user_progress (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,

  completed boolean default false,
  completed_at timestamptz
);
```

---

## 10. 💳 Subscriptions

```sql
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references public.profiles(id) on delete cascade,

  plan text default 'free',
  status text default 'active',

  start_date timestamptz,
  end_date timestamptz,

  created_at timestamptz default now()
);
```

---

## 11. 🌐 CMS — Showcase Content

```sql
create table public.showcase_content (
  id uuid primary key default gen_random_uuid(),

  section_key text unique not null, -- hero, features, etc.

  title text,
  subtitle text,
  body text,

  image_url text,
  cta_text text,
  cta_url text,

  is_visible boolean default true,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 12. 🔔 Notifications

```sql
create table public.notifications (
  id          uuid        primary key default gen_random_uuid(),

  type        text        not null
                check (type in ('login', 'quiz_complete', 'course_complete', 'signup')),

  title       text        not null,
  message     text        not null,

  user_id     uuid        references public.profiles(id) on delete set null,

  metadata    jsonb       not null default '{}',

  is_read     boolean     not null default false,
  created_at  timestamptz not null default now()
);
```

---

## 13. 🔗 Relationships Summary

```txt
auth.users
   ↓ (id → profiles.id)
profiles
   ├─→ quiz_attempts  (profiles.id → quiz_attempts.user_id)
   ├─→ user_progress  (profiles.id → user_progress.user_id)
   ├─→ subscriptions  (profiles.id → subscriptions.user_id)
   └─→ notifications  (profiles.id → notifications.user_id)

courses
   ↓ (courses.id → quizzes.course_id)
quizzes
   ↓ (quizzes.id → quiz_questions.quiz_id)
quiz_questions
   ↓ (quiz_questions.id → quiz_answers.question_id)
quiz_answers

quiz_attempts
   ↓ (quiz_attempts.id → quiz_attempt_answers.attempt_id)
quiz_attempt_answers
```

> **Note:** `quiz_questions` and `quiz_answers` are linked via `question_id`. Each question has multiple answer options; `is_correct` marks the right answer. `quiz_attempt_answers` stores per-question responses for detailed result breakdowns.

---

## 14. 🔐 Basic Constraints

- `username` must be unique
- `email` must be unique
- `role` must be:
  - student
  - admin
- `notifications.type` must be:
  - login
  - quiz_complete
  - course_complete
  - signup

---

## 15. ⚡ Performance: Indexes

```sql
-- quiz_attempts lookups
create index on public.quiz_attempts (user_id);
create index on public.quiz_attempts (quiz_id);

-- user_progress lookups
create index on public.user_progress (user_id);
create index on public.user_progress (course_id);

-- quizzes by course
create index on public.quizzes (course_id);

-- quiz_questions by quiz
create index on public.quiz_questions (quiz_id);

-- quiz_answers by question
create index on public.quiz_answers (question_id);

-- subscriptions by user
create index on public.subscriptions (user_id);

-- quiz_attempt_answers by attempt
create index if not exists idx_quiz_attempt_answers_attempt_id
  on public.quiz_attempt_answers(attempt_id);

-- notifications indexes
create index notifications_is_read_idx   on public.notifications (is_read);
create index notifications_created_at_idx on public.notifications (created_at desc);
```

---

## 16. 🔧 Triggers

Auto-update `updated_at` timestamps:

```sql
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
```

---

## 17. 🚀 Future Extensions

- Add payments table (Razorpay/Stripe)
- Add analytics tables
- Add AI interaction logs

---

## ✅ Summary

This schema supports:

- Authentication
- Learning system
- Quiz system (with per-question attempt tracking)
- Progress tracking
- Subscription model
- CMS for website
- Notifications

It is:

- simple
- scalable
- production-ready

---

## 🛠️ RLS Fixes / Known Issues

The following RLS policies must be applied manually via Supabase SQL Editor if profile inserts are being blocked.

### ❌ Issue: RLS blocking profile insert (ROOT CAUSE)

If users cannot insert their own profile after signup, run the following in **Supabase → SQL Editor**:

```sql
-- Allow users to insert their own profile
create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

-- Allow users to read their own profile
create policy "Users can read own profile"
on public.profiles
for select
using (auth.uid() = id);
```

> ✅ Apply this fix before testing any auth flow.

## Cleanup scripts (optional)

```sql
-- ============================================
-- FrenchLearno — Cleanup Script
-- Wipes all test data except the admin account
-- contact@learnwithpoorvi.in
-- ============================================
-- Run in Supabase SQL Editor
-- Double check the admin email before running
-- ============================================

-- Step 1: Store the admin ID so we never touch it
do $$
declare
  admin_id uuid;
begin
  select id into admin_id
  from auth.users
  where email = 'contact@learnwithpoorvi.in';

  if admin_id is null then
    raise exception 'Admin account not found. Aborting — do not run this script.';
  end if;
end $$;

-- Step 2: Wipe per-question attempt answers
delete from public.quiz_attempt_answers;

-- Step 3: Wipe quiz attempts
delete from public.quiz_attempts;

-- Step 4: Wipe user progress
delete from public.user_progress;

-- Step 5: Wipe subscriptions (except admin)
delete from public.subscriptions
where user_id != (
  select id from auth.users where email = 'contact@learnwithpoorvi.in'
);

-- Step 6: Wipe quiz answers
delete from public.quiz_answers;

-- Step 7: Wipe quiz questions
delete from public.quiz_questions;

-- Step 8: Wipe quizzes
delete from public.quizzes;

-- Step 9: Wipe courses
delete from public.courses;

-- Step 10: Wipe student profiles (keep admin)
delete from public.profiles
where id != (
  select id from auth.users where email = 'contact@learnwithpoorvi.in'
);

-- Step 11: Wipe student auth accounts (keep admin)
delete from auth.users
where email != 'contact@learnwithpoorvi.in';

-- ============================================
-- Verify — run this after to confirm
-- ============================================
select
  (select count(*) from auth.users) as total_auth_users,
  (select count(*) from public.profiles) as total_profiles,
  (select count(*) from public.courses) as total_courses,
  (select count(*) from public.quizzes) as total_quizzes,
  (select count(*) from public.quiz_attempts) as total_attempts,
  (select count(*) from public.subscriptions) as total_subscriptions;

-- Expected result after cleanup:
-- total_auth_users → 1
-- total_profiles → 1
-- total_courses → 0
-- total_quizzes → 0
-- total_attempts → 0
-- total_subscriptions → 0 (or 1 if admin has one)
```
