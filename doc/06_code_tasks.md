# 💻 FrenchLearno — Code Tasks (Execution Plan)

---

## 🚨 Immediate Priorities (Do These First)

These tasks are blocking further progress. Complete them in order:

1. **Configure Supabase env vars** — Copy keys into `.env.local` so the app can run with real data
2. **Fix API mismatch in student endpoints** — Use `GET /api/admin/students` and `GET/PATCH /api/admin/students/[id]` consistently (remove any `list-students` or `student/[uid]` usage)
3. **Build `/test/student-login` web page** — Temporary web page to validate student auth + RLS before building React Native screens
4. **Fix broken student system routes** — Reconcile and test all student API routes
5. **Connect dashboard stats to real DB** — Replace hardcoded/fake stats with live Supabase queries
6. **Build CMS UI in admin dashboard** — API exists (`/api/admin/cms`), frontend editor does not
7. **Build mobile app frontend (React Native)** — API routes exist, no screens built
8. **Build public website** — Separate Vercel project consuming `/api/public/cms`

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
- [ ] Setup environment variables ⚠️ **Blocking — env vars not configured**

---

### ✅ Setup Supabase Client

- [x] Create `lib/supabase/client.ts`
- [x] Create `lib/supabase/server.ts`
- [ ] Test connection (blocked by missing env vars)

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

- [x] Fetch email from username (if needed)

---

### ✅ Auth State

- [x] Create AuthProvider
- [x] Manage session
- [x] Protect routes

---

## 4. 🧑‍💼 Phase 3 — Admin Dashboard (Core)

### ✅ Layout

- [x] Sidebar (Dashboard, Students, Courses, Quizzes, CMS)
- [x] Header (user info, logout)

---

### 🚧 Students Module

- [x] Fetch students API (`GET /api/admin/students`)
- [x] Display list
- [ ] Fix endpoint naming mismatch ⚠️ **See Immediate Priorities #2**
- [x] Edit student data (`PATCH /api/admin/students/[id]`)

---

### 🚧 Dashboard Stats

- [ ] Connect stats widgets to real DB queries ⚠️ **Currently hardcoded/fake**

---

## 5. 📚 Phase 4 — Courses

### ✅ Course CRUD

- [x] Create course form
- [x] Fetch courses list
- [x] Edit course
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

## 7. 📱 Phase 6 — Mobile App (Student)

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

## 8. 📊 Phase 7 — Progress & Tracking

- [ ] Save quiz attempts (API: `/api/mobile/quizzes/[id]/submit` saves attempt)
- [ ] Calculate score
- [ ] Update progress table
- [ ] Unlock next level
- [ ] Build `/api/mobile/progress` endpoint ⚠️ **Not built**

---

## 9. 🌐 Phase 8 — CMS (Website)

### 🚧 Admin CMS (API Built, UI Missing)

- [ ] Create CMS editor page ⚠️ **Not built — API exists, no frontend**
- [ ] Edit sections:
  - hero
  - features
  - testimonials

---

### ⚠️ Public Website (Not built)

- [ ] Create separate Next.js project (Vercel #2)
- [ ] Fetch CMS content from `GET /api/public/cms`
- [ ] Render homepage with CMS data

---

## 10. 💳 Phase 9 — Subscription (Basic)

- [ ] Add subscription table logic
- [ ] Mark user as paid/free
- [ ] Restrict premium content in mobile app

---

## 11. 🔐 Phase 10 — Security

- [x] Enable RLS
- [x] Protect admin APIs
- [ ] Validate all inputs
- [ ] Audit all RLS policies end-to-end

---

## 12. 🚀 Phase 11 — Deployment

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

## 13. 🧠 Development Strategy

### ✅ Build Order (IMPORTANT)

```txt
1. Configure env vars (BLOCKING)
2. Fix student API mismatch
3. Build /test/student-login for auth validation
4. Connect dashboard stats to DB
5. Build CMS UI
6. Build React Native mobile app
7. Build public website
8. Deployment
```

---

### ❌ Avoid

- Overbuilding UI early
- Adding unnecessary features
- Skipping testing

---

## 14. ✅ Definition of Done

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
