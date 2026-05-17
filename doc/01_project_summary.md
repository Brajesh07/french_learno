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

- **Proficiency-level structure** — Courses and quizzes grouped by levels (A1, A2, B1, B2, etc.)
- **Quiz-based progression** — Students unlock the next level by passing quizzes
- **Subscription access model** — Free (demo) content and paid premium content
- **Admin-controlled CMS** — Public website content managed from the dashboard without redeployment
- **Role-based access** — Two roles: `admin` and `student`; each has distinct access scope

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
| Public Website  | Next.js (App Router), React, Tailwind CSS — ⚠️ Not built yet                    |
| Mobile App      | React Native — ⚠️ Not built yet                                                 |
| Backend / DB    | Supabase (PostgreSQL + Auth JWT + Row Level Security)                           |
| Media Storage   | Cloudinary — SDK installed (`@cloudinary/react`, `next-cloudinary`); not tested |

---

## 5. 📋 Current Status

| Phase                | Progress           |
| -------------------- | ------------------ |
| Backend + schema     | ~80%               |
| Admin dashboard      | ~65%               |
| Mobile app           | ~0–20% (APIs only) |
| Public website       | ~0%                |
| Production readiness | 0%                 |

### What is working

- **Auth system**: Login page built (`/login`), supports email-or-username input, react-hook-form + yup validation, session managed via `AuthProvider`, middleware protects all `/dashboard/*` routes
- **Admin dashboard layout**: Sidebar (Dashboard, Students, Courses, Quizzes) + Header with logout + dark/light theme
- **Courses**: Full CRUD — list (paginated, filterable by level/status/search), create, edit (rich-text content editor), delete; `GET/POST /api/admin/courses` and `GET/PATCH/DELETE /api/admin/courses/[id]` all built
- **Quizzes**: Full CRUD — list, create (quiz builder with live preview panel), edit, delete; `GET/POST /api/admin/quizzes` and `GET/PATCH/DELETE /api/admin/quizzes/[id]` all built
- **Student list page**: UI exists at `/dashboard/students`, calls `GET /api/admin/list-students`
- **Student detail page**: UI exists at `/dashboard/students/[uid]`, calls `GET/PATCH /api/admin/student/[uid]`
- **Database schema**: Complete — all tables defined with RLS policies
- **Mobile API routes**: `GET /api/mobile/courses`, `GET /api/mobile/quizzes`, `GET /api/mobile/quizzes/[id]`, `POST /api/mobile/quizzes/[id]/submit` — all built
- **CMS API**: `GET /api/admin/cms`, `PATCH /api/admin/cms/[section_key]`, `GET /api/public/cms` — all built

---

## 6. ⚠️ Known Gaps

| Area                    | Status         | Detail                                                                                                                                      |
| ----------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase connection     | ⚠️ Missing     | `.env.local` not configured — all DB calls fail with real data                                                                              |
| Student endpoint naming | 🚧 In Progress | Code still calls old routes (`/api/admin/list-students`, `/api/admin/student/[uid]`); not yet reconciled to canonical `/api/admin/students` |
| Dashboard stats         | 🚧 In Progress | All stat values are hardcoded strings (`"1,234"`, `"45"`, etc.) — not connected to DB                                                       |
| CMS editor UI           | ⚠️ Missing     | `GET/PATCH /api/admin/cms` API built; no frontend page in dashboard                                                                         |
| Sidebar stub pages      | ⚠️ Missing     | Sidebar links for Analytics, Notifications, Upload Test exist but no pages are built for them                                               |
| `/api/mobile/progress`  | ⚠️ Missing     | Not built; will return 404                                                                                                                  |
| Mobile app frontend     | ⚠️ Missing     | No React Native project exists; only the backend API routes are built                                                                       |
| Public website          | ⚠️ Missing     | No Next.js pages for the public-facing site; `GET /api/public/cms` exists and is ready to be consumed                                       |
| Cloudinary media upload | ⚠️ Missing     | SDK installed but no upload flow tested or confirmed working                                                                                |
| Production deployment   | ⚠️ Missing     | No Vercel config, no production env vars, no deployment pipeline                                                                            |

---

## 7. 🔮 Future Scope

- Payment gateway integration (Razorpay or Stripe)
- AI-based learning assistant
- Advanced analytics dashboard
- Gamification (badges, streaks)
- Multi-language support
- real-world production standards

---
