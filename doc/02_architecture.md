# 🏗️ FrenchLearno — System Architecture

---

## 1. 📌 Overview

FrenchLearno is a full-stack system consisting of three client applications that all share a single Supabase backend:

| Component          | Tech                               | Status                   |
| ------------------ | ---------------------------------- | ------------------------ |
| 📱 Mobile App      | React Native                       | ⚠️ Not built (APIs only) |
| 🖥️ Admin Dashboard | Next.js (App Router)               | 🚧 ~65% complete         |
| 🌐 Public Website  | Next.js (App Router)               | ⚠️ Not built             |
| ⚙️ Backend / DB    | Supabase (PostgreSQL + Auth + RLS) | ⚠️ Not connected         |

---

## 2. 🧩 High-Level Architecture

```
Mobile App (React Native)          ⚠️ Not yet built
        │
        ↓
Next.js API Layer ──────────────→ Supabase (DB + Auth + Storage)
        ↑
Admin Dashboard (Next.js)          🚧 In progress
        ↑
Public Website (Next.js)           ⚠️ Not yet built
```

All platforms are intended to communicate with a **single Supabase project**. The Next.js app (admin dashboard + public website) also hosts all API routes consumed by the mobile app.

---

## 3. 🔧 Tech Stack per Component

### Admin Dashboard

- Next.js (App Router)
- React, Tailwind CSS
- Supabase JS client (server-side + client-side)
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
- Cloudinary: media storage (images, audio, video)
- ⚠️ Supabase environment variables not configured — app cannot run with real data

---

## 4. 🔄 Data Flow

```
Admin Dashboard
    │
    ├── Creates/edits courses, quizzes, CMS content
    ↓
Supabase (PostgreSQL + RLS)
    │
    ├── /api/mobile/courses      → Mobile App
    ├── /api/mobile/quizzes      → Mobile App
    ├── /api/mobile/quizzes/[id]/submit → Mobile App
    └── /api/public/cms          → Public Website
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
3. Middleware (`src/middleware.ts`) protects dashboard routes
4. API routes verify session and role before returning data

### Student Auth (mobile)

- Signup: name, username, email, phone, password → Supabase Auth + `profiles` table
- Login: email or username + password → JWT session
- ⚠️ Mobile auth UI does not exist yet

---

## 6. 🔌 API Surface

### Admin APIs (`/api/admin/*`)

| Endpoint                       | Method           | Status                             |
| ------------------------------ | ---------------- | ---------------------------------- |
| `/api/admin/courses`           | GET, POST        | ✅ Built                           |
| `/api/admin/courses/[id]`      | GET, PUT, DELETE | ✅ Built                           |
| `/api/admin/quizzes`           | GET, POST        | ✅ Built                           |
| `/api/admin/quizzes/[id]`      | GET, PUT, DELETE | ✅ Built                           |
| `/api/admin/cms`               | GET, PUT         | ✅ Built                           |
| `/api/admin/cms/[section_key]` | GET, PUT         | ✅ Built                           |
| `/api/admin/list-students`     | GET              | ✅ Built                           |
| `/api/admin/student/[uid]`     | GET, PUT         | 🚧 Partially broken (API mismatch) |

### Mobile APIs (`/api/mobile/*`)

| Endpoint                          | Method | Status   |
| --------------------------------- | ------ | -------- |
| `/api/mobile/courses`             | GET    | ✅ Built |
| `/api/mobile/quizzes`             | GET    | ✅ Built |
| `/api/mobile/quizzes/[id]`        | GET    | ✅ Built |
| `/api/mobile/quizzes/[id]/submit` | POST   | ✅ Built |

### Auth APIs (`/api/auth/*`)

| Endpoint            | Method | Status   |
| ------------------- | ------ | -------- |
| `/api/auth/login`   | POST   | ✅ Built |
| `/api/auth/logout`  | POST   | ✅ Built |
| `/api/auth/profile` | GET    | ✅ Built |

### Public APIs (`/api/public/*`)

| Endpoint          | Method | Status   |
| ----------------- | ------ | -------- |
| `/api/public/cms` | GET    | ✅ Built |

---

## 7. 🗄️ Database Schema

Main tables (all in Supabase PostgreSQL):

- `profiles` — student/admin user data
- `courses` — course content per level
- `quizzes` — quiz metadata
- `quiz_questions` — questions per quiz
- `quiz_attempts` — student attempt records
- `subscriptions` — free/paid access control
- `showcase_content` — CMS content for public website

Row Level Security (RLS) policies are defined for all tables. Full schema documented in [03_database_schema.md](./03_database_schema.md).

---

## 8. 🔒 Security Model

- **Supabase JWT** — all API calls require a valid session
- **RLS policies** — enforced at the database layer; admins and students see only what their role permits
- **Middleware** — Next.js middleware (`src/middleware.ts`) redirects unauthenticated users away from dashboard routes
- **Admin-only routes** — `/api/admin/*` routes verify `admin` role before executing queries

---

## 9. 🚫 Not Yet Implemented

| Area                  | Detail                                                 |
| --------------------- | ------------------------------------------------------ |
| Supabase connection   | Environment variables not set; all DB calls will fail  |
| Mobile app frontend   | No React Native UI exists; only the API layer is ready |
| Public website        | No Next.js pages for the public-facing site            |
| CMS UI                | Admin CMS API is built; no dashboard UI to use it      |
| Analytics page        | Not built; dashboard stats are hardcoded               |
| Student system        | Partially broken — API mismatch and missing routes     |
| Production deployment | No deployment configuration                            |

- Add analytics later

---

## ✅ Summary

FrenchLearno architecture is:

- Simple
- Scalable
- Maintainable

Built around:

- Supabase backend
- Next.js API layer
- React Native mobile app

---
