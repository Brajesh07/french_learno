# 🏗️ FrenchLearno — System Architecture

---

## 1. 📌 Overview

FrenchLearno is a full-stack system consisting of three client applications that all share a single Supabase backend:

| Component          | Tech                               | Status                   |
| ------------------ | ---------------------------------- | ------------------------ |
| 📱 Mobile App      | React Native                       | ⚠️ Not built (APIs only) |
| 🖥️ Admin Dashboard | Next.js (App Router)               | 🚧 ~80% complete         |
| 🌐 Public Website  | Next.js (App Router)               | ⚠️ Not built             |
| ⚙️ Backend / DB    | Supabase (PostgreSQL + Auth + RLS) | ✅ Connected (env set)   |

---

## 2. 🧩 High-Level Architecture

```
Mobile App (React Native)          ⚠️ Not yet built
        │
        ↓
Next.js API Layer ──────────────→ Supabase (DB + Auth + Storage)
        ↑
Admin Dashboard (Next.js)          🚧 ~80% complete
        ↑
Public Website (Next.js)           ⚠️ Not yet built
```

All platforms are intended to communicate with a **single Supabase project**. The Next.js app (admin dashboard + public website) also hosts all API routes consumed by the mobile app.

---

## 3. 🔧 Tech Stack per Component

### Admin Dashboard

- Next.js 15.5 (App Router), React 19, TypeScript
- Tailwind CSS 4, @headlessui/react, @heroicons/react
- react-hook-form + yup (forms)
- Chart.js (analytics charts — ActivityLineChart, SubscriptionDonutChart, QuizPerformanceChart, LevelDistributionChart)
- Supabase JS client (server-side + client-side via `@supabase/ssr`)
- Role: admin only

### Public Website

- Next.js (App Router)
- React, Tailwind CSS
- CMS content fetched via `/api/public/cms`
- ⚠️ Not yet built

### Mobile App

- React Native CLI
- Consumes Next.js API routes (`/api/mobile/*`)
- ⚠️ Frontend not built; API routes exist

### Backend / Database

- Supabase: PostgreSQL + Auth (JWT) + Row Level Security
- Cloudinary: media storage (images, audio, video) — env configured
- ✅ Environment variables configured in `.env.local`

---

## 4. 🔄 Data Flow

```
Admin Dashboard
    │
    ├── Creates/edits courses, quizzes, CMS content
    ↓
Supabase (PostgreSQL + RLS)
    │
    ├── /api/mobile/courses           → Mobile App
    ├── /api/mobile/quizzes           → Mobile App
    ├── /api/mobile/quizzes/[id]/submit → Mobile App
    ├── /api/mobile/courses/[id]/complete → Mobile App
    └── /api/public/cms               → Public Website
```

Admins write data through the dashboard. Mobile and public web clients read data through the Next.js API layer, which enforces role-based access before querying Supabase.

---

## 5. 🔐 Auth Architecture

### Roles

- `admin` — access to dashboard; can read/write all data
- `student` — access to mobile app; read-only for courses/quizzes scoped to their level

### Session Flow

1. Admin logs in via email + password → Supabase Auth issues JWT
2. JWT stored in session (server-side via `@supabase/ssr`)
3. Middleware (`src/middleware.ts`) protects dashboard routes (`/dashboard/*`, `/temp/dashboard/*`)
4. API routes verify session and role before returning data

### Student Auth (mobile)

- Signup: name, username, email, phone, password → Supabase Auth + `profiles` table
- Login: email or username + password → JWT session (email lookup via `/api/auth/lookup-email`)
- ⚠️ Mobile auth UI does not exist yet

---

## 6. 🔌 API Surface

### Admin APIs (`/api/admin/*`)

| Endpoint                                | Method             | Status   |
| --------------------------------------- | ------------------ | -------- |
| `/api/admin/courses`                    | GET, POST          | ✅ Built |
| `/api/admin/courses/[id]`               | GET, PATCH, DELETE | ✅ Built |
| `/api/admin/quizzes`                    | GET, POST          | ✅ Built |
| `/api/admin/quizzes/[id]`               | GET, PATCH, DELETE | ✅ Built |
| `/api/admin/cms`                        | GET                | ✅ Built |
| `/api/admin/cms/[section_key]`          | PATCH              | ✅ Built |
| `/api/admin/list-students`              | GET                | ✅ Built |
| `/api/admin/student/[uid]`              | GET, PATCH         | ✅ Built |
| `/api/admin/notifications`              | GET, PATCH         | ✅ Built |
| `/api/admin/analytics/kpis`             | GET                | ✅ Built |
| `/api/admin/analytics/activity`         | GET                | ✅ Built |
| `/api/admin/analytics/subscriptions`    | GET                | ✅ Built |
| `/api/admin/analytics/quiz-performance` | GET                | ✅ Built |
| `/api/admin/analytics/level-distribution` | GET              | ✅ Built |

> **Note:** `/api/admin/list-students` and `/api/admin/student/[uid]` are the **active** student endpoints. There is no `/api/admin/students` route — the docs previously referenced this as canonical but it does not exist in the codebase.

### Mobile APIs (`/api/mobile/*`)

| Endpoint                              | Method | Status   |
| ------------------------------------- | ------ | -------- |
| `/api/mobile/courses`                 | GET    | ✅ Built |
| `/api/mobile/courses/[id]/complete`   | POST   | ✅ Built |
| `/api/mobile/quizzes`                 | GET    | ✅ Built |
| `/api/mobile/quizzes/[id]`            | GET    | ✅ Built |
| `/api/mobile/quizzes/[id]/submit`     | POST   | ✅ Built |
| `/api/mobile/progress`                | GET    | ⚠️ Not built |

### Auth APIs (`/api/auth/*`)

| Endpoint                | Method | Status   |
| ----------------------- | ------ | -------- |
| `/api/auth/login`       | POST   | ✅ Built |
| `/api/auth/logout`      | POST   | ✅ Built |
| `/api/auth/profile`     | GET    | ✅ Built |
| `/api/auth/lookup-email`| POST   | ✅ Built |
| `/api/auth/notify-login`| POST   | ✅ Built |

### Public APIs (`/api/public/*`)

| Endpoint          | Method | Status   |
| ----------------- | ------ | -------- |
| `/api/public/cms` | GET    | ✅ Built |

---

## 7. 🗄️ Database Schema

Main tables (all in Supabase PostgreSQL):

- `profiles` — student/admin user data (with `is_active`, `has_subscription` fields)
- `courses` — course content per level
- `quizzes` — quiz metadata
- `quiz_questions` — questions per quiz (with `points`, `explanation`)
- `quiz_answers` — answer options per question (`is_correct` marks the right answer)
- `quiz_attempts` — student attempt records
- `quiz_attempt_answers` — per-question student responses for detailed result breakdowns
- `user_progress` — per-user course completion tracking
- `subscriptions` — free/paid access control
- `showcase_content` — CMS content for public website
- `notifications` — student activity events (login, signup, quiz_complete, course_complete)

Row Level Security (RLS) policies are defined for all tables. Full schema documented in [03_database_schema.md](./03_database_schema.md).

---

## 8. 🔒 Security Model

- **Supabase JWT** — all API calls require a valid session
- **RLS policies** — enforced at the database layer; admins and students see only what their role permits
- **Middleware** — Next.js middleware (`src/middleware.ts`) redirects unauthenticated users away from dashboard routes
- **Admin-only routes** — `/api/admin/*` routes verify `admin` role before executing queries
- **Service role client** — used for admin operations that bypass RLS (e.g., listing all students)

---

## 9. 🚫 Not Yet Implemented

| Area                  | Detail                                                 |
| --------------------- | ------------------------------------------------------ |
| Mobile app frontend   | No React Native UI exists; only the API layer is ready |
| Public website        | No Next.js pages for the public-facing site            |
| CMS UI                | Admin CMS API is built; no dashboard UI to use it      |
| `/api/mobile/progress`| Not built; will return 404                             |
| Production deployment | No deployment configuration                            |

---

## 10. 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── admin/          # Admin API routes (courses, quizzes, students, analytics, CMS, notifications)
│   │   ├── auth/           # Auth API routes (login, logout, profile, lookup-email, notify-login)
│   │   ├── mobile/         # Mobile API routes (courses, quizzes, progress)
│   │   └── public/         # Public API routes (CMS)
│   ├── dashboard/          # Admin dashboard pages
│   │   ├── analytics/      # Analytics page with charts
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

## ✅ Summary

FrenchLearno architecture is:

- Simple
- Scalable
- Maintainable

Built around:

- Supabase backend (connected)
- Next.js API layer (25 endpoints)
- React Native mobile app (pending)

---
