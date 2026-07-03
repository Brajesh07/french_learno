# 🇫🇷 FrenchLearno — Project Summary

---

## 1. 📌 Project Overview

**FrenchLearno** is a multi-platform French language learning system that allows students to learn French through structured proficiency-level courses and quiz-based progression via a mobile app, while administrators manage all content — students, courses, quizzes, subscriptions, and CMS — through a dedicated dashboard. A public-facing marketing website powered by a CMS rounds out the platform.

The system consists of three platform components:

| Platform               | Tech Stack           | Purpose                                     |
| ---------------------- | -------------------- | ------------------------------------------- |
| 📱 **Mobile App**      | React Native         | Students learn French via courses + quizzes |
| 🖥️ **Admin Dashboard** | Next.js (App Router) | Manage students, courses, quizzes, CMS      |
| 🌐 **Public Website**  | Next.js (App Router) | Marketing + CMS-driven content              |

---

## 2. 🎯 Core Features

- **Proficiency-level structure** — Courses and quizzes grouped by levels (A1, B1, B2)
- **Quiz-based progression** — Students unlock the next level by passing quizzes
- **Subscription access model** — Free (demo) content and paid premium content
- **Admin-controlled CMS** — Public website content managed from the dashboard without redeployment
- **Role-based access** — Two roles: `admin` and `student`; each has distinct access scope
- **Analytics dashboard** — KPIs, activity charts, quiz performance, level distribution, subscription metrics
- **Notifications system** — Student activity events (login, signup, quiz/course completion)

---

## 3. 👥 User Roles

### Student

- Signs up via mobile app
- Accesses courses and quizzes per their proficiency level
- Has free (demo) and paid (premium) content tiers

### Admin

- Logs into admin dashboard
- Manages students, courses, quizzes, subscriptions, and CMS content

---

## 4. 🏗️ Tech Stack

| Layer           | Technology                                                                      |
| --------------- | ------------------------------------------------------------------------------- |
| Admin Dashboard | Next.js 15.5 (App Router), React 19, TypeScript, Tailwind CSS 4                 |
| Admin Dashboard | react-hook-form + yup (forms), @headlessui/react, @heroicons/react (UI)         |
| Admin Dashboard | @supabase/supabase-js + @supabase/ssr (auth + DB client)                        |
| Admin Dashboard | Chart.js (analytics charts)                                                     |
| Public Website  | Next.js (App Router), React, Tailwind CSS — ⚠️ Not built yet                    |
| Mobile App      | React Native — ⚠️ Not built yet                                                 |
| Backend / DB    | Supabase (PostgreSQL + Auth JWT + Row Level Security)                           |
| Media Storage   | Cloudinary — SDK installed (`@cloudinary/react`, `next-cloudinary`); env configured |

---

## 5. 📋 Current Status

| Phase                | Progress           |
| -------------------- | ------------------ |
| Backend + schema     | ~90%               |
| Admin dashboard      | ~80%               |
| Mobile app           | ~0–20% (APIs only) |
| Public website       | ~0%                |
| Production readiness | 0%                 |

### What is working

- **Auth system**: Login page built (`/login`), supports email-or-username input via `/api/auth/lookup-email`, react-hook-form + yup validation, session managed via `AuthProvider`, middleware protects all `/dashboard/*` and `/temp/dashboard/*` routes
- **Admin dashboard layout**: Sidebar (Dashboard, Students, Courses, Quizzes, Upload Test, Notifications, Analytics) + Header with logout + dark/light theme
- **Dashboard page**: Live stats fetched from API routes (total students, courses, quizzes, published courses) + recent activity feed + quick actions
- **Courses**: Full CRUD — list (paginated, filterable by level/status/search), create, edit (rich-text content editor), delete; `GET/POST /api/admin/courses` and `GET/PATCH/DELETE /api/admin/courses/[id]` all built
- **Quizzes**: Full CRUD — list, create (quiz builder with live preview panel), edit, delete; `GET/POST /api/admin/quizzes` and `GET/PATCH/DELETE /api/admin/quizzes/[id]` all built
- **Student list page**: UI exists at `/dashboard/students`, calls `GET /api/admin/list-students` (with search, pagination, enrichment with `last_login_at`)
- **Student detail page**: UI exists at `/dashboard/students/[uid]`, calls `GET/PATCH /api/admin/student/[uid]`
- **Analytics page**: Full analytics dashboard at `/dashboard/analytics` with KPIs, activity line chart (weekly/monthly), subscription donut chart, quiz performance bar chart, level distribution chart — all connected to real API endpoints
- **Notifications page**: Full notifications UI at `/dashboard/notifications` with mark-all-read, unread badges, activity event types (login, signup, quiz_complete, course_complete)
- **Database schema**: Complete — 10 tables defined with RLS policies (profiles, courses, quizzes, quiz_questions, quiz_answers, quiz_attempts, quiz_attempt_answers, user_progress, subscriptions, showcase_content, notifications)
- **Mobile API routes**: `GET /api/mobile/courses`, `GET /api/mobile/quizzes`, `GET /api/mobile/quizzes/[id]`, `POST /api/mobile/quizzes/[id]/submit`, `POST /api/mobile/courses/[id]/complete` — all built
- **CMS API**: `GET /api/admin/cms`, `PATCH /api/admin/cms/[section_key]`, `GET /api/public/cms` — all built
- **Analytics APIs**: `/api/admin/analytics/kpis`, `/api/admin/analytics/activity`, `/api/admin/analytics/subscriptions`, `/api/admin/analytics/quiz-performance`, `/api/admin/analytics/level-distribution` — all built
- **Environment variables**: `.env.local` configured with Supabase (URL, anon key, service role key) and Cloudinary credentials
- **Supabase migrations**: 4 migration files (001_initial_schema, 002_add_student_fields, 003_notifications, 004_quiz_attempt_answers) + seed script

---

## 6. ⚠️ Known Gaps

| Area                    | Status         | Detail                                                                                                                                      |
| ----------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Student endpoint naming | 🚧 In Progress | Code calls `/api/admin/list-students` and `/api/admin/student/[uid]`; no `/api/admin/students` route exists — deprecated naming still in use |
| CMS editor UI           | ⚠️ Missing     | `GET/PATCH /api/admin/cms` API built; no frontend page in dashboard to edit CMS content                                                      |
| `/api/mobile/progress`  | ⚠️ Missing     | Not built; will return 404                                                                                                                  |
| Mobile app frontend     | ⚠️ Missing     | No React Native project exists; only the backend API routes are built                                                                       |
| Public website          | ⚠️ Missing     | No Next.js pages for the public-facing site; `GET /api/public/cms` exists and is ready to be consumed                                       |
| Production deployment   | ⚠️ Missing     | No Vercel config, no production env vars, no deployment pipeline                                                                            |
| Upload Test page        | 🚧 Stub        | Sidebar link exists for Upload Test but no page built at `/dashboard/upload-test`                                                           |

---

## 7. 🔮 Future Scope

- Payment gateway integration (Razorpay or Stripe)
- AI-based learning assistant
- Advanced analytics dashboard
- Gamification (badges, streaks)
- Multi-language support
- Real-world production standards

---
