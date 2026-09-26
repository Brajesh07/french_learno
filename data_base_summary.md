# French Learno — Current Database Schema Dump & Analysis

**Source:** `supabase/migrations/001_initial_schema.sql` through `004_quiz_attempt_answers.sql`  
**Database:** Supabase PostgreSQL  
**Auth dependency:** `auth.users` (Supabase-managed)

---

## Migration History

| File | Description |
| --- | --- |
| `001_initial_schema.sql` | Core tables, RLS policies, triggers, showcase seed data |
| `002_add_student_fields.sql` | Adds `is_active`, `has_subscription` to `profiles` |
| `003_notifications.sql` | Creates `notifications` table with RLS and indexes |
| `004_quiz_attempt_answers.sql` | Creates `quiz_attempt_answers` table with RLS and index |

---

## ENUMs & Constrained Types

**No PostgreSQL `ENUM` types are defined.** All constrained values use `TEXT` columns with `CHECK` constraints.

### `profiles.role`

```sql
check (role in ('student', 'admin'))
```

Default: `'student'`

### `courses.level`

```sql
check (level in ('A1', 'B1', 'B2'))
```

### `notifications.type`

```sql
check (type in ('login', 'quiz_complete', 'course_complete', 'signup'))
```

### Unconstrained TEXT defaults (no CHECK)

| Table | Column | Default |
| --- | --- | --- |
| `quiz_questions` | `type` | `'mcq'` |
| `subscriptions` | `plan` | `'free'` |
| `subscriptions` | `status` | `'active'` |

---

## Core Table Definitions (Effective Current State)

### `profiles`

> Base: `001_initial_schema.sql`  
> Altered by: `002_add_student_fields.sql`

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  name        text not null,
  username    text unique not null,
  email       text unique not null,

  phone       text,
  class       text,

  role        text not null default 'student'
                check (role in ('student', 'admin')),

  is_active         boolean not null default true,       -- added in 002
  has_subscription  boolean not null default false,      -- added in 002

  created_at  timestamptz default now()
);
```

**Foreign Keys**

| Column | References | On Delete |
| --- | --- | --- |
| `id` | `auth.users(id)` | CASCADE |

---

### `courses`

```sql
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
```

**Foreign Keys:** None (root content table; no `created_by` / owner column)

---

### `quizzes`

```sql
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
```

**Foreign Keys**

| Column | References | On Delete |
| --- | --- | --- |
| `course_id` | `courses(id)` | CASCADE |

> `course_id` is nullable — quizzes can exist without a parent course.

---

### `quiz_questions`

```sql
create table public.quiz_questions (
  id          uuid primary key default gen_random_uuid(),

  quiz_id     uuid references public.quizzes(id) on delete cascade,

  question    text not null,
  type        text default 'mcq',
  points      integer default 1,
  explanation text,

  created_at  timestamptz default now()
);
```

**Foreign Keys**

| Column | References | On Delete |
| --- | --- | --- |
| `quiz_id` | `quizzes(id)` | CASCADE |

---

### `quiz_answers`

```sql
create table public.quiz_answers (
  id           uuid primary key default gen_random_uuid(),

  question_id  uuid references public.quiz_questions(id) on delete cascade,

  answer       text not null,
  is_correct   boolean default false
);
```

**Foreign Keys**

| Column | References | On Delete |
| --- | --- | --- |
| `question_id` | `quiz_questions(id)` | CASCADE |

---

### `quiz_attempts`

```sql
create table public.quiz_attempts (
  id          uuid primary key default gen_random_uuid(),

  user_id     uuid references public.profiles(id) on delete cascade,
  quiz_id     uuid references public.quizzes(id) on delete cascade,

  score       integer,
  passed      boolean,

  created_at  timestamptz default now()
);
```

**Foreign Keys**

| Column | References | On Delete |
| --- | --- | --- |
| `user_id` | `profiles(id)` | CASCADE |
| `quiz_id` | `quizzes(id)` | CASCADE |

---

### `user_progress`

```sql
create table public.user_progress (
  id            uuid primary key default gen_random_uuid(),

  user_id       uuid references public.profiles(id) on delete cascade,
  course_id     uuid references public.courses(id) on delete cascade,

  completed     boolean default false,
  completed_at  timestamptz
);
```

**Foreign Keys**

| Column | References | On Delete |
| --- | --- | --- |
| `user_id` | `profiles(id)` | CASCADE |
| `course_id` | `courses(id)` | CASCADE |

> No unique constraint on `(user_id, course_id)` — duplicate progress rows are possible.

---

### `subscriptions`

```sql
create table public.subscriptions (
  id          uuid primary key default gen_random_uuid(),

  user_id     uuid references public.profiles(id) on delete cascade,

  plan        text default 'free',
  status      text default 'active',

  start_date  timestamptz,
  end_date    timestamptz,

  created_at  timestamptz default now()
);
```

**Foreign Keys**

| Column | References | On Delete |
| --- | --- | --- |
| `user_id` | `profiles(id)` | CASCADE |

> Subscription access is also mirrored on `profiles.has_subscription` (boolean flag). No CHECK on `plan` or `status` values.

---

## Ancillary Tables (Present in Migrations)

### `quiz_attempt_answers` — `004_quiz_attempt_answers.sql`

```sql
create table public.quiz_attempt_answers (
  id                 uuid primary key default gen_random_uuid(),
  attempt_id         uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id        uuid not null references public.quiz_questions(id) on delete cascade,
  selected_answer_id uuid references public.quiz_answers(id) on delete set null,
  is_correct         boolean not null,
  created_at         timestamptz default now()
);
```

### `notifications` — `003_notifications.sql`

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

### `showcase_content` — `001_initial_schema.sql`

```sql
create table public.showcase_content (
  id           uuid primary key default gen_random_uuid(),

  section_key  text unique not null,

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
```

---

## Row Level Security (RLS)

RLS is **enabled** on all tables listed below.

### `profiles`

```sql
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
```

> **Gap (documented, not in migrations):** No `INSERT` policy exists in migrations. `doc/03_database_schema.md` documents a required manual fix:
>
> ```sql
> create policy "Users can insert own profile"
>   on public.profiles for insert
>   with check (auth.uid() = id);
> ```
>
> Signup flows that insert into `profiles` may rely on the **service role key** to bypass RLS.

---

### `courses`

```sql
alter table public.courses enable row level security;

create policy "Anyone can read published courses"
  on public.courses for select
  using (is_published = true);

create policy "Admins have full access to courses"
  on public.courses for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
```

---

### `quizzes`

```sql
alter table public.quizzes enable row level security;

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
```

---

### `quiz_questions`

```sql
alter table public.quiz_questions enable row level security;

create policy "Admins have full access to quiz_questions"
  on public.quiz_questions for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Students can read questions for published quizzes"
  on public.quiz_questions for select
  using (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_id and q.is_published = true
    )
  );
```

---

### `quiz_answers`

```sql
alter table public.quiz_answers enable row level security;

create policy "Admins have full access to quiz_answers"
  on public.quiz_answers for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Students can read quiz answers"
  on public.quiz_answers for select
  using (true);
```

> `is_correct` is exposed at the RLS layer. The API is expected to strip it before returning to students.

---

### `quiz_attempts`

```sql
alter table public.quiz_attempts enable row level security;

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
```

---

### `user_progress`

```sql
alter table public.user_progress enable row level security;

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
```

---

### `subscriptions`

```sql
alter table public.subscriptions enable row level security;

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
```

---

### `quiz_attempt_answers`

```sql
alter table public.quiz_attempt_answers enable row level security;

create policy "Users can read own attempt answers"
  on public.quiz_attempt_answers for select
  using (
    exists (
      select 1 from public.quiz_attempts
      where quiz_attempts.id = attempt_id
        and quiz_attempts.user_id = auth.uid()
    )
  );

create policy "Admins can read all attempt answers"
  on public.quiz_attempt_answers for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "Service role can insert attempt answers"
  on public.quiz_attempt_answers for insert
  with check (true);
```

---

### `notifications`

```sql
alter table public.notifications enable row level security;

create policy "Admins can manage notifications"
  on public.notifications for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
```

> Students have **no direct RLS access**. Inserts are performed via service role in API routes.

---

### `showcase_content`

```sql
alter table public.showcase_content enable row level security;

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
```

---

## RLS Access Matrix (Current Roles)

| Table | `student` (authenticated) | `admin` | Anonymous |
| --- | --- | --- | --- |
| `profiles` | SELECT/UPDATE own row | SELECT all | — |
| `courses` | SELECT published | ALL | SELECT published |
| `quizzes` | SELECT published | ALL | SELECT published |
| `quiz_questions` | SELECT (published quiz) | ALL | — |
| `quiz_answers` | SELECT all rows | ALL | — |
| `quiz_attempts` | SELECT/INSERT own | SELECT all | — |
| `quiz_attempt_answers` | SELECT own (via attempt) | SELECT all | — |
| `user_progress` | ALL own rows | SELECT all | — |
| `subscriptions` | SELECT own | ALL | — |
| `notifications` | — | ALL | — |
| `showcase_content` | SELECT visible | ALL | SELECT visible |

**Pattern:** Every content-management policy checks `profiles.role = 'admin'`. There is no intermediate role.

---

## Indexes

### Defined in migrations

```sql
-- 003_notifications.sql
create index notifications_is_read_idx   on public.notifications (is_read);
create index notifications_created_at_idx on public.notifications (created_at desc);

-- 004_quiz_attempt_answers.sql
create index idx_quiz_attempt_answers_attempt_id
  on public.quiz_attempt_answers(attempt_id);
```

### Documented in `doc/03_database_schema.md` (not in migration files)

```sql
create index on public.quiz_attempts (user_id);
create index on public.quiz_attempts (quiz_id);
create index on public.user_progress (user_id);
create index on public.user_progress (course_id);
create index on public.quizzes (course_id);
create index on public.quiz_questions (quiz_id);
create index on public.quiz_answers (question_id);
create index on public.subscriptions (user_id);
```

> Verify index existence in the live Supabase instance before assuming they are applied.

---

## Triggers

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

## Schema Relationship Summary

```
auth.users
   │
   │  FK: profiles.id → auth.users.id  (ON DELETE CASCADE)
   ▼
profiles ─────────────────────────────────────────────────────────────┐
   │                                                                   │
   ├──► quiz_attempts.user_id                                         │
   ├──► user_progress.user_id                                         │
   ├──► subscriptions.user_id                                         │
   └──► notifications.user_id  (ON DELETE SET NULL)                  │
                                                                       │
courses ◄──────────────────────────────────────────────────────────────┤
   │                                                                   │
   │  FK: quizzes.course_id → courses.id  (ON DELETE CASCADE, nullable)│
   ▼                                                                   │
quizzes ◄──────────────── quiz_attempts.quiz_id                        │
   │                                                                   │
   │  FK: quiz_questions.quiz_id → quizzes.id  (ON DELETE CASCADE)   │
   ▼                                                                   │
quiz_questions ◄──────── quiz_attempt_answers.question_id              │
   │                                                                   │
   │  FK: quiz_answers.question_id → quiz_questions.id  (CASCADE)     │
   ▼                                                                   │
quiz_answers ◄────────── quiz_attempt_answers.selected_answer_id       │
                                                                       │
quiz_attempts                                                          │
   │                                                                   │
   │  FK: quiz_attempt_answers.attempt_id → quiz_attempts.id (CASCADE)│
   ▼                                                                   │
quiz_attempt_answers                                                   │
                                                                       │
user_progress.course_id ──► courses.id  (ON DELETE CASCADE) ◄────────┘

showcase_content  — standalone (no FKs)
```

### Relationship Notes

| Relationship | Cardinality | Notes |
| --- | --- | --- |
| `auth.users` → `profiles` | 1:1 | Profile PK equals auth user UUID |
| `courses` → `quizzes` | 1:N | `course_id` nullable on quizzes |
| `quizzes` → `quiz_questions` | 1:N | Questions belong to one quiz |
| `quiz_questions` → `quiz_answers` | 1:N | MCQ options per question |
| `profiles` → `quiz_attempts` | 1:N | One student, many attempts per quiz |
| `quizzes` → `quiz_attempts` | 1:N | Many students can attempt same quiz |
| `quiz_attempts` → `quiz_attempt_answers` | 1:N | Per-question response breakdown |
| `profiles` → `user_progress` | 1:N | Per-course completion tracking |
| `courses` → `user_progress` | 1:N | Many students per course |
| `profiles` → `subscriptions` | 1:N | Multiple subscription records possible |
| `profiles` → `notifications` | 1:N | Nullable `user_id` for system events |

### Content Ownership Gap (Relevant to Instructor Role)

- `courses`, `quizzes`, `quiz_questions`, and `quiz_answers` have **no `created_by`, `instructor_id`, or ownership FK** to `profiles`.
- All content write access is gated exclusively by `role = 'admin'` in RLS policies.
- Students interact only with **published** content and their own progress/attempt data.

---

## Constraints & Uniqueness

| Table | Constraint |
| --- | --- |
| `profiles` | `username` UNIQUE, `email` UNIQUE |
| `showcase_content` | `section_key` UNIQUE |
| `user_progress` | No UNIQUE on `(user_id, course_id)` |
| `quiz_attempts` | No UNIQUE on `(user_id, quiz_id)` — retakes allowed |

---

## Instructor Role — Pre-Planning Observations

1. **`profiles.role` CHECK** must be extended: `('student', 'admin')` → add `'instructor'` (or `'teacher'`).
2. **No content ownership columns** exist — instructor-scoped content requires new FKs (e.g., `courses.instructor_id`, `quizzes.instructor_id`) or a junction table.
3. **All RLS content policies** reference `role = 'admin'` only — every content table policy needs instructor-aware rules.
4. **Admin vs instructor boundary** is undefined: can instructors manage only their own courses/quizzes, or also view student attempts across all content?
5. **`has_subscription` on profiles** is a denormalized flag separate from `subscriptions` table — instructor role has no billing implications in current schema.
6. **Middleware** (`src/middleware.ts`) types role as `'admin' | 'student'` — application layer must align with DB role expansion.
7. **Service role bypass** is used heavily in admin API routes — instructor APIs will need explicit policy design, not just service role access.

---

*Generated from migration files in `supabase/migrations/`. Last updated: September 2026.*
