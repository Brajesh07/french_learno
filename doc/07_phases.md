# 🪜 FrenchLearno — Development Phases

---

## 1. 📌 Overview

This document divides the project into **clear phases with goals**.

Each phase:

- has a defined outcome
- builds on the previous phase
- can be tested independently

---

## 🔴 Phase 0 — Fix & Connect (Current Priority)

### 🎯 Goal

Unblock the app so it can run with real data and fix known broken systems.

---

### Tasks

- [ ] Configure Supabase env vars (`.env.local`) — **app cannot run without this**
- [ ] Reconcile and fix student API endpoints — use `GET /api/admin/students` and `GET/PATCH /api/admin/students/[id]` consistently
- [ ] Build `/test/student-login` web page — validate student auth and RLS logic before building React Native screens
- [ ] Fix broken student system routes
- [ ] Connect dashboard stats to real DB data — remove hardcoded/fake values
- [ ] Build CMS UI in admin dashboard — API exists, no editor frontend built yet

---

### ✅ Output

- App runs with real Supabase data
- Student system fully functional end-to-end
- Dashboard shows live stats
- Admin can edit public website content via CMS UI

---

## 2. 🧱 Phase 1 — Setup & Foundation

### 🎯 Goal

Prepare project and backend

---

### Tasks

- [x] Create Next.js project
- [x] Install Tailwind CSS
- [x] Setup Supabase project (staging)
- [ ] Configure `.env.local` ⚠️ **Not done — see Phase 0**
- [x] Setup Supabase client (client + server)
- [x] Create database tables (run SQL)
- [x] Enable authentication (email/password)

---

### ✅ Output

- Working Supabase connection
- Database ready
- Auth system enabled

---

## 3. 🔐 Phase 2 — Authentication

### 🎯 Goal

User signup & login working

---

### Tasks

- [x] Create **web test signup page**
- [x] Implement:
  - `supabase.auth.signUp()`
  - insert into `profiles`

- [x] Create login form
- [x] Implement:
  - email login
  - username login

- [x] Create AuthProvider
- [x] Protect routes

---

### ✅ Output

- User can:
  - signup
  - login

- Profiles table correctly populated

---

## 4. 🧑‍💼 Phase 3 — Admin Dashboard Base

### 🎯 Goal

Basic admin panel structure

---

### Tasks

- [x] Create dashboard layout
- [x] Sidebar navigation
- [x] Header with logout
- [x] Protect admin routes
- [x] Setup role check (`admin`)

---

### ✅ Output

- Admin dashboard accessible
- Unauthorized users blocked

---

## 5. 📚 Phase 4 — Course Management

### 🎯 Goal

Admin can manage courses

---

### Tasks

- [x] Create course form
- [x] Fetch and display courses
- [x] Edit course
- [x] Delete course

---

### ✅ Output

- Courses fully manageable

---

## 6. 📝 Phase 5 — Quiz System (Admin)

### 🎯 Goal

Admin can create full quizzes

---

### Tasks

- [x] Create quiz form
- [x] Replace course ID with dropdown
- [x] Build question builder UI
- [x] Add dynamic options
- [x] Select correct answer
- [x] Add explanation & points
- [x] Implement live preview
- [x] Create API (transaction-based)

---

### ✅ Output

- Complete quiz creation system

---

## 7. 📱 Phase 6 — Student Mobile App

### 🎯 Goal

Student can use the app on React Native

---

> ⚠️ **Current Status:** Backend API routes exist (`/api/mobile/courses`, `/api/mobile/quizzes`, `/api/mobile/quizzes/[id]/submit`) but **NO React Native frontend has been built**. This phase starts from scratch on the frontend.

---

### Tasks

- [ ] Setup React Native project (Expo or bare)
- [ ] Implement auth (reuse Supabase logic)
- [ ] Course list screen (connect to `GET /api/mobile/courses`)
- [ ] Quiz list screen (connect to `GET /api/mobile/quizzes?course_id=...`)
- [ ] Quiz question screen
- [ ] Timer implementation
- [ ] Answer selection
- [ ] Submit quiz screen (connect to `POST /api/mobile/quizzes/[id]/submit`)
- [ ] Result screen
- [ ] Build `/api/mobile/progress` endpoint (currently missing)

---

### ✅ Output

- Student can:
  - login on mobile
  - view courses by level
  - start and complete quizzes

---

## 8. 📊 Phase 7 — Quiz Attempt & Results

### 🎯 Goal

Complete quiz experience

---

### Tasks

- [x] Submit quiz API
- [x] Calculate score
- [x] Store attempt
- [ ] Show result screen (mobile frontend not built)
- [ ] Show review answers (mobile frontend not built)

---

### ✅ Output

- Full quiz lifecycle working

---

## 9. 📈 Phase 8 — Progress System

### 🎯 Goal

Track and unlock progress

---

### Tasks

- [ ] Build `/api/mobile/progress` ⚠️ Not built
- [ ] Save user progress
- [ ] Unlock next level
- [ ] Display progress in dashboard

---

### ✅ Output

- Learning progression system active

---

## 10. 🌐 Phase 9 — CMS & Public Website

### 🎯 Goal

Dynamic showcase page

---

### Tasks

- [ ] Create CMS editor UI (admin dashboard) ⚠️ API exists, UI not built
- [ ] Create separate Next.js project for Public Website (Vercel #2)
- [ ] Fetch and render CMS content from `GET /api/public/cms`

---

### ✅ Output

- Website content controlled by admin via CMS

---

## 11. 💳 Phase 10 — Subscription (Basic)

### 🎯 Goal

Control free vs paid access

---

### Tasks

- [ ] Add subscription logic
- [ ] Restrict premium content in mobile app
- [ ] Admin can mark user as paid

---

### ✅ Output

- Paid system (manual) working

---

## 12. 🔐 Phase 11 — Security & Testing

### 🎯 Goal

Secure and stable system

---

### Tasks

- [x] Enable RLS policies
- [x] Protect all APIs
- [ ] Validate all inputs end-to-end
- [ ] Test all flows
- [ ] Fix bugs

---

### ✅ Output

- Secure backend
- Stable system

---

## 13. 🚀 Phase 12 — Deployment

### 🎯 Goal

Go live

---

### Tasks

- [ ] Setup production Supabase project
- [ ] Push schema to production
- [ ] Deploy **Admin Dashboard** → Vercel Project #1
- [ ] Deploy **Public Website** → Vercel Project #2 (separate Vercel project / repo)
- [ ] Both Vercel projects use the same Supabase instance (shared `SUPABASE_URL`)
- [ ] Mobile app: prepare for Expo / app store release
- [ ] Final testing

---

### ✅ Output

- Live application across all three platforms

---

### 🗂️ Deployment Map

| Platform        | Where               | Supabase           |
| --------------- | ------------------- | ------------------ |
| Admin Dashboard | Vercel Project #1   | ✅ Shared instance |
| Public Website  | Vercel Project #2   | ✅ Shared instance |
| Mobile App      | React Native / Expo | ✅ Shared instance |

---

## 14. 🧠 Development Strategy

---

### 🔥 Golden Rule

```txt
Build → Test → Fix → Then Move Forward
```

---

### ⚠️ Avoid

- Skipping phases
- Building everything at once
- Ignoring testing

---

## 15. 🏁 Final Outcome

At the end, you will have:

- 📱 Fully working mobile learning app (React Native)
- 🖥️ Admin dashboard (Next.js — Vercel #1)
- 🌐 Dynamic public website (Next.js — Vercel #2)
- ⚙️ Scalable Supabase backend (shared)

---

## 🚀 Final Thought

> This is not just a project timeline
> This is your roadmap to a real product

---
