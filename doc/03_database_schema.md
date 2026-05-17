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

  level text not null check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),

  content_text text,
  content_audio_url text,
  content_image_url text,
  content_video_url text,

  is_published boolean default false,

  created_at timestamptz default now()
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

  created_at timestamptz default now()
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

  user_id uuid references public.profiles(id),
  quiz_id uuid references public.quizzes(id),

  score integer,
  passed boolean,

  created_at timestamptz default now()
);
```

---

## 8. 📈 Progress Tracking

```sql
create table public.user_progress (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references public.profiles(id),
  course_id uuid references public.courses(id),

  completed boolean default false,
  completed_at timestamptz
);
```

---

## 9. 💳 Subscriptions

```sql
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references public.profiles(id),

  plan text default 'free',
  status text default 'active',

  start_date timestamptz,
  end_date timestamptz,

  created_at timestamptz default now()
);
```

---

## 10. 🌐 CMS — Showcase Content

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

## 11. 🔗 Relationships Summary

```txt
auth.users
   ↓ (id → profiles.id)
profiles
   ├─→ quiz_attempts  (profiles.id → quiz_attempts.user_id)
   ├─→ user_progress  (profiles.id → user_progress.user_id)
   └─→ subscriptions  (profiles.id → subscriptions.user_id)

courses
   ↓ (courses.id → quizzes.course_id)
quizzes
   ↓ (quizzes.id → quiz_questions.quiz_id)
quiz_questions
   ↓ (quiz_questions.id → quiz_answers.question_id)
quiz_answers
```

> **Note:** `quiz_questions` and `quiz_answers` are linked via `question_id`. Each question has multiple answer options; `is_correct` marks the right answer.

---

## 12. 🔐 Basic Constraints

- `username` must be unique
- `email` must be unique
- `role` must be:
  - student
  - admin

---

## 13. ⚡ Performance: Recommended Indexes

For production performance, add indexes on frequently queried foreign key columns:

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
```

> **Note:** These indexes are especially important as the student count grows. Add them after creating tables.

---

## 14. 🚀 Future Extensions

- Add payments table (Razorpay/Stripe)
- Add analytics tables
- Add AI interaction logs

---

## ✅ Summary

This schema supports:

- Authentication
- Learning system
- Quiz system
- Progress tracking
- Subscription model
- CMS for website

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
