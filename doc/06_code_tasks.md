# 💻 FrenchLearno — Code Tasks (Execution Plan)

---

## 🚨 Immediate Priorities (Do These First)

These tasks are blocking further progress. Complete them in order:

1. **Build CMS UI in admin dashboard** — API exists (`/api/admin/cms`), frontend editor does not
2. **Build `/api/mobile/progress` endpoint** — Not built; will return 404
3. **Build mobile app frontend (React Native)** — API routes exist, no screens built
4. **Build public website** — Separate Vercel project consuming `/api/public/cms`
5. **Build Upload Test page** — Sidebar link exists but no page at `/dashboard/upload-test`

---

## 1. 📌 Overview

This document breaks the project into **small, actionable tasks**.

Follow tasks in order.
Each section builds on the previous one.

---

## 2. 🧱 Phase 1 — Project Setup

### ✅ Setup Next.js App

- [x] Create Next.js project (App Router)
- [x] Install Tailwind CSS
- [x] Setup folder structure

---

### ✅ Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [x] Install Supabase client
- [x] Setup environment variables ✅ **Configured in `.env.local`**

---

### ✅ Setup Supabase Client

- [x] Create `lib/supabase/client.ts`
- [x] Create `lib/supabase/server.ts`
- [x] Create `lib/supabase/auth-helpers.ts`
- [x] Test connection ✅ **Env vars configured**

---

## 3. 🔐 Phase 2 — Authentication

### ✅ Signup (Student)

- [x] Create signup form (mobile + web test page)
- [x] Call `supabase.auth.signUp()`
- [x] Insert data into `profiles` table

---

### ✅ Login

- [x] Create login form
- [x] Support:
  - email login
  - username login

- [x] Fetch email from username via `/api/auth/lookup-email`

---

### ✅ Auth State

- [x] Create AuthProvider
- [x] Manage session
- [x] Protect routes via middleware

---

## 4. 🧑‍💼 Phase 3 — Admin Dashboard (Core)

### ✅ Layout

- [x] Sidebar (Dashboard, Students, Courses, Quizzes, Upload Test, Notifications, Analytics)
- [x] Header (user info, logout)
- [x] Dark/light theme support

---

### ✅ Students Module

- [x] Fetch students API (`GET /api/admin/list-students`)
- [x] Display list with search and pagination
- [x] Student detail page (`/dashboard/students/[uid]`)
- [x] Edit student data (`PATCH /api/admin/student/[uid]`)

---

### ✅ Dashboard Stats

- [x] Connect stats widgets to real DB queries
- [x] Recent activity feed from API data
- [x] Quick action links

---

## 5. 📚 Phase 4 — Courses

### ✅ Course CRUD

- [x] Create course form
- [x] Fetch courses list (paginated, filterable)
- [x] Edit course (rich-text content editor)
- [x] Delete course

---

### ✅ Course Detail Page

- [x] Show course info
- [x] Show linked quizzes

---

## 6. 📝 Phase 5 — Quiz System (Admin)

### ✅ Create Quiz

- [x] Quiz form (title, course, passing score)
- [x] Replace course ID → dropdown

---

### ✅ Question Builder

- [x] Add question UI
- [x] Add options dynamically
- [x] Select correct answer
- [x] Add explanation
- [x] Add points

---

### ✅ Live Preview

- [x] Right-side preview panel
- [x] Update on input change

---

### ✅ Save Quiz

- [x] Create API call
- [x] Wrap in transaction
- [x] Store: quiz, questions, answers

---

## 7. 📊 Phase 6 — Analytics (Admin)

### ✅ Analytics Page

- [x] KPI cards (Total Students, Active This Week, Avg Quiz Score, Overall Pass Rate)
- [x] Activity line chart (weekly/monthly toggle)
- [x] Subscription donut chart (free vs paid)
- [x] Quiz performance bar chart by level
- [x] Level distribution chart

---

### ✅ Analytics APIs

- [x] `GET /api/admin/analytics/kpis`
- [x] `GET /api/admin/analytics/activity`
- [x] `GET /api/admin/analytics/subscriptions`
- [x] `GET /api/admin/analytics/quiz-performance`
- [x] `GET /api/admin/analytics/level-distribution`

---

## 8. 🔔 Phase 7 — Notifications (Admin)

### ✅ Notifications Page

- [x] Notification list with type badges
- [x] Mark all as read
- [x] Unread count badge
- [x] Refresh button

---

### ✅ Notifications API

- [x] `GET /api/admin/notifications`
- [x] `PATCH /api/admin/notifications` (mark all read)

---

## 9. 📱 Phase 8 — Mobile App (Student)

> ⚠️ **Status: ~0–20% complete.** API routes exist on the backend but NO React Native frontend has been built.

### ⚠️ Auth (Not built)

- [ ] Signup screen
- [ ] Login screen

---

### ⚠️ Course List (Not built)

- [ ] Fetch courses (`GET /api/mobile/courses` exists)
- [ ] Display by level

---

### ⚠️ Quiz Flow (Not built)

- [ ] Quiz list screen
- [ ] Start quiz screen
- [ ] Question screen
- [ ] Timer logic
- [ ] Answer selection

---

### ⚠️ Submit Quiz (Not built)

- [ ] Send answers to API (`POST /api/mobile/quizzes/[id]/submit` exists)
- [ ] Show result screen

---

### ⚠️ Review Answers (Not built)

- [ ] Show correct vs wrong
- [ ] Show explanation

---

## 10. 📈 Phase 9 — Progress & Tracking

- [x] Save quiz attempts (API: `/api/mobile/quizzes/[id]/submit` saves attempt)
- [x] Calculate score
- [ ] Build `/api/mobile/progress` endpoint ⚠️ **Not built**
- [ ] Update progress table
- [ ] Unlock next level

---

## 11. 🌐 Phase 10 — CMS (Website)

### 🚧 Admin CMS (API Built, UI Missing)

- [ ] Create CMS editor page ⚠️ **Not built — API exists, no frontend**
- [ ] Edit sections:
  - hero
  - features
  - testimonials
  - cta

---

### ⚠️ Public Website (Not built)

- [ ] Create separate Next.js project (Vercel #2)
- [ ] Fetch CMS content from `GET /api/public/cms`
- [ ] Render homepage with CMS data

---

## 12. 💳 Phase 11 — Subscription (Basic)

- [ ] Add subscription table logic
- [ ] Mark user as paid/free
- [ ] Restrict premium content in mobile app

---

## 13. 🔐 Phase 12 — Security

- [x] Enable RLS
- [x] Protect admin APIs
- [ ] Validate all inputs
- [ ] Audit all RLS policies end-to-end

---

## 14. 🚀 Phase 13 — Deployment

### Staging

- [ ] Test everything in staging
- [ ] Fix bugs

---

### Production

- [ ] Setup production Supabase env vars
- [ ] Deploy Admin Dashboard → Vercel Project #1
- [ ] Deploy Public Website → Vercel Project #2 (separate project)
- [ ] Both projects point to same Supabase instance

---

## 15. 🧠 Development Strategy

### ✅ Build Order (IMPORTANT)

```txt
1. Build CMS UI in admin dashboard
2. Build /api/mobile/progress endpoint
3. Build React Native mobile app
4. Build public website
5. Build Upload Test page
6. Deployment
```

---

### ❌ Avoid

- Overbuilding UI early
- Adding unnecessary features
- Skipping testing

---

## 16. ✅ Definition of Done

Project is complete when:

- [ ] Admin can create quizzes
- [ ] Student can attempt quizzes on mobile
- [ ] Results are calculated correctly
- [ ] Progress is tracked
- [ ] CMS updates public website dynamically
- [ ] Admin Dashboard deployed to Vercel #1
- [ ] Public Website deployed to Vercel #2

---

## 🏁 Final Note

> Build small → test → improve → repeat

This is not just a project.
This is a **real product system**.

---
