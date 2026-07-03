# FrenchLearno — Project Context & Build Instructions

## 🧠 Your Role

You are a senior full-stack developer helping me build FrenchLearno from scratch.
Before writing any code, scan the entire project structure, read all existing files,
and give me a current status report. Then proceed to build what's missing, phase by phase.

---

## 📌 Project Overview

FrenchLearno is a French language learning platform with three surfaces:

| Surface         | Tech               | Audience          |
| --------------- | ------------------ | ----------------- |
| Mobile App      | React Native CLI   | Students          |
| Admin Dashboard | Next.js App Router | Admins            |
| Public Website  | Next.js App Router | Prospective users |

Backend: Supabase (PostgreSQL + Auth + RLS)
Media: Cloudinary (images, audio, video) — env configured

---

## 🗂️ Actual Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── admin/          # 15 admin API routes
│   │   ├── auth/           # 5 auth API routes
│   │   ├── mobile/         # 6 mobile API routes
│   │   └── public/         # 1 public API route
│   ├── dashboard/          # Admin dashboard pages
│   │   ├── analytics/      # Analytics page with 4 chart components
│   │   ├── courses/        # Course management (list, create, edit, detail)
│   │   ├── notifications/  # Notifications page
│   │   ├── quizzes/        # Quiz management (list, create, edit, detail)
│   │   └── students/       # Student management (list, detail)
│   ├── login/              # Login page
│   └── temp/               # Student-facing test pages (login, signup, dashboard)
├── components/
│   ├── auth/               # AuthProvider, LoginForm
│   ├── layout/             # Sidebar, Header, DashboardLayout
│   └── ui/                 # Button, Input, Textarea, SimpleRichTextEditor, ThemeProvider
├── hooks/                  # useAuth
├── lib/
│   ├── supabase/           # client.ts, server.ts, auth-helpers.ts, notifications.ts
│   ├── types.ts            # TypeScript types
│   ├── theme-types.ts      # Theme types
│   └── utils.ts            # Utility functions (cn)
├── styles/                 # Global styles
└── middleware.ts           # Auth middleware

supabase/
├── migrations/             # 4 SQL migration files
│   ├── 001_initial_schema.sql
│   ├── 002_add_student_fields.sql
│   ├── 003_notifications.sql
│   └── 004_quiz_attempt_answers.sql
└── seeds/
    └── seed.ts             # Seed script
```

---

## 🗄️ Database Schema (Supabase / PostgreSQL)

### profiles

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

### courses

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

### quizzes

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

### quiz_questions

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

### quiz_answers

```sql
create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.quiz_questions(id) on delete cascade,
  answer text not null,
  is_correct boolean default false
);
```

### quiz_attempts

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

### quiz_attempt_answers

```sql
create table if not exists public.quiz_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  selected_answer_id uuid references public.quiz_answers(id) on delete set null,
  is_correct boolean not null,
  created_at timestamptz default now()
);
```

### user_progress

```sql
create table public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  completed boolean default false,
  completed_at timestamptz
);
```

### subscriptions

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

### showcase_content (CMS)

```sql
create table public.showcase_content (
  id uuid primary key default gen_random_uuid(),
  section_key text unique not null,
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

### notifications

```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('login', 'quiz_complete', 'course_complete', 'signup')),
  title text not null,
  message text not null,
  user_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
```

---

## 👥 User Roles & Auth

- All users (students + admins) use Supabase Auth (JWT)
- Role stored in profiles.role: 'student' | 'admin'
- Students sign up via mobile app
- Admins log in via dashboard only

---

## 📱 Mobile App Features (React Native)

### Auth

- Signup: name, username, email, phone, class (optional), password
- Login: email OR username + password

### Core

- Dashboard: profile, current level, progress overview
- Courses: grouped by level (A1, B1, B2), supports text/audio/image/video
- Quizzes: free (demo) + paid; multiple attempts; passing unlocks next level
- Progress: track completed courses, quiz attempts, scores
- Subscription: free plan (demo content) vs paid plan (full access)
- Profile: update personal details, view level and progress

---

## 🖥️ Admin Dashboard Features (Next.js)

- Secure login (email + password, admin role only)
- Student management: view, update info, assign levels, track progress
- Course management: CRUD + Cloudinary media upload
- Quiz management: create quizzes, add MCQ questions + answers, set passing score
- Subscription management: toggle users between free and paid
- CMS editor: edit showcase_content rows for the public /french-learning page
- Analytics: KPIs, activity charts, quiz performance, level distribution, subscription metrics
- Notifications: student activity events (login, signup, quiz/course completion)

---

## 🌐 Public Website Features (Next.js)

- `/` → Developer/owner portfolio page
- `/contact` → Contact form page
- `/french-learning` → App showcase page (fully CMS-driven from showcase_content table)
  - Sections: hero, features, testimonials, CTA
  - Content editable from admin dashboard without redeployment

---

## ⚙️ Tech Stack Summary

| Layer     | Technology                         |
| --------- | ---------------------------------- |
| Mobile    | React Native CLI                   |
| Web/Admin | Next.js 15.5 (App Router)          |
| Styling   | Tailwind CSS 4                     |
| Backend   | Supabase (Auth + PostgreSQL + RLS) |
| Media     | Cloudinary                         |
| Language  | TypeScript throughout              |

---

## 🌍 Environment Strategy

- Two Supabase projects: staging (dev/test) + production (live)
- Workflow: build in staging → migrate schema → push to production → switch env vars

---

## 🚧 Constraints

- Solo developer
- Keep it simple and maintainable
- No over-engineering
- RLS policies required on all user-facing tables

---

## 🚀 Recommended Build Order

Phase 1 — Foundation

1. Supabase staging setup + all schema migrations ✅
2. RLS policies for all tables ✅
3. Seed data (admin user, sample courses, quizzes) ✅

Phase 2 — Admin Dashboard 4. Admin auth (login, protected routes) ✅ 5. Course management (CRUD + Cloudinary upload) ✅ 6. Quiz management (questions + answers) ✅ 7. Student management + subscription toggle ✅ 8. CMS editor for showcase content ⚠️ **API built, UI missing** 9. Basic analytics ✅

Phase 3 — Mobile App 10. Auth (signup + login) 11. Student dashboard 12. Course listing + content viewer 13. Quiz flow (attempt, score, pass/fail, level unlock) 14. Progress tracking 15. Profile management

Phase 4 — Public Website 16. Static pages (/, /contact) 17. /french-learning with live CMS data

Phase 5 — Production 18. Mirror schema to production Supabase 19. Environment variable switch 20. End-to-end testing + launch

---

## ✅ Current Status (as of scan)

### What's Built (~80% of admin dashboard)

- Auth system (login, session, middleware)
- Dashboard layout (sidebar, header, theme)
- Dashboard page (live stats, activity feed)
- Course management (full CRUD)
- Quiz management (full CRUD with question builder + live preview)
- Student management (list with search/pagination, detail page)
- Analytics page (KPIs, 4 chart types, all connected to real APIs)
- Notifications page (list, mark all read, unread badges)
- All admin APIs (15 endpoints)
- All mobile APIs (6 endpoints)
- All auth APIs (5 endpoints)
- All public APIs (1 endpoint)
- Database schema (10 tables with RLS)
- Environment variables configured

### What's Missing

- CMS editor UI (API exists, no frontend)
- `/api/mobile/progress` endpoint
- Mobile app frontend (React Native)
- Public website (Next.js)
- Upload Test page (sidebar link exists, no page)
- Production deployment

---

## 📝 Key Notes for AI Assistant

1. **Environment variables ARE configured** — `.env.local` has Supabase and Cloudinary keys
2. **Student endpoints use `/api/admin/list-students` and `/api/admin/student/[uid]`** — there is NO `/api/admin/students` route
3. **Dashboard stats are NOT hardcoded** — they fetch from real API routes
4. **Analytics page IS fully built** with real API connections
5. **Notifications page IS fully built** with mark-all-read functionality
6. **4 Supabase migrations** exist in `supabase/migrations/`
7. **Sidebar links**: Dashboard, Students, Courses, Quizzes, Upload Test, Notifications, Analytics

---

## 🎯 Next Steps

1. Build CMS editor UI in admin dashboard
2. Build `/api/mobile/progress` endpoint
3. Build React Native mobile app
4. Build public website
5. Build Upload Test page
6. Production deployment
