# 💻 FrenchLearno — Code Tasks (Execution Plan)

---

## 1. 📌 Overview

This document breaks the project into **small, actionable tasks**.

Follow tasks in order.
Each section builds on the previous one.

---

## 2. 🧱 Phase 1 — Project Setup

### ✅ Setup Next.js App

- [ ] Create Next.js project (App Router)
- [ ] Install Tailwind CSS
- [ ] Setup folder structure

---

### ✅ Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] Install Supabase client
- [ ] Setup environment variables

---

### ✅ Setup Supabase Client

- [ ] Create `lib/supabase/client.ts`
- [ ] Create `lib/supabase/server.ts`
- [ ] Test connection

---

---

## 3. 🔐 Phase 2 — Authentication

---

### ✅ Signup (Student)

- [ ] Create signup form (mobile + web test page)
- [ ] Call `supabase.auth.signUp()`
- [ ] Insert data into `profiles` table

---

### ✅ Login

- [ ] Create login form
- [ ] Support:
  - email login
  - username login

- [ ] Fetch email from username (if needed)

---

### ✅ Auth State

- [ ] Create AuthProvider
- [ ] Manage session
- [ ] Protect routes

---

---

## 4. 🧑‍💼 Phase 3 — Admin Dashboard (Core)

---

### ✅ Layout

- [ ] Sidebar (Dashboard, Students, Courses, Quizzes, CMS)
- [ ] Header (user info, logout)

---

### ✅ Students Module

- [ ] Fetch students API
- [ ] Display list
- [ ] Edit student data

---

---

## 5. 📚 Phase 4 — Courses

---

### ✅ Course CRUD

- [ ] Create course form
- [ ] Fetch courses list
- [ ] Edit course
- [ ] Delete course

---

### ✅ Course Detail Page

- [ ] Show course info
- [ ] Show linked quizzes

---

---

## 6. 📝 Phase 5 — Quiz System (Admin)

---

### ✅ Create Quiz

- [ ] Quiz form (title, course, passing score)
- [ ] Replace course ID → dropdown

---

### ✅ Question Builder (IMPORTANT)

- [ ] Add question UI
- [ ] Add options dynamically
- [ ] Select correct answer
- [ ] Add explanation
- [ ] Add points

---

### ✅ Live Preview

- [ ] Right-side preview panel
- [ ] Update on input change

---

### ✅ Save Quiz

- [ ] Create API call
- [ ] Wrap in transaction
- [ ] Store:
  - quiz
  - questions
  - answers

---

---

## 7. 📱 Phase 6 — Mobile App (Student)

---

### ✅ Auth

- [ ] Signup screen
- [ ] Login screen

---

### ✅ Course List

- [ ] Fetch courses
- [ ] Display by level

---

### ✅ Quiz Flow

- [ ] Quiz list screen
- [ ] Start quiz screen
- [ ] Question screen
- [ ] Timer logic
- [ ] Answer selection

---

### ✅ Submit Quiz

- [ ] Send answers to API
- [ ] Show result screen

---

### ✅ Review Answers

- [ ] Show correct vs wrong
- [ ] Show explanation

---

---

## 8. 📊 Phase 7 — Progress & Tracking

---

- [ ] Save quiz attempts
- [ ] Calculate score
- [ ] Update progress table
- [ ] Unlock next level

---

---

## 9. 🌐 Phase 8 — CMS (Website)

---

### ✅ Admin CMS

- [ ] Create CMS editor page
- [ ] Edit sections:
  - hero
  - features
  - testimonials

---

### ✅ Public Page

- [ ] Fetch CMS content
- [ ] Render `/french-learning`

---

---

## 10. 💳 Phase 9 — Subscription (Basic)

---

- [ ] Add subscription table logic
- [ ] Mark user as paid/free
- [ ] Restrict premium content

---

---

## 11. 🔐 Phase 10 — Security

---

- [ ] Enable RLS
- [ ] Protect admin APIs
- [ ] Validate all inputs

---

---

## 12. 🚀 Phase 11 — Deployment

---

### Staging

- [ ] Test everything in staging
- [ ] Fix bugs

---

### Production

- [ ] Setup production env
- [ ] Deploy Next.js app
- [ ] Connect production Supabase

---

---

## 13. 🧠 Development Strategy

---

### ✅ Build Order (IMPORTANT)

```txt
1. Supabase setup
2. Auth
3. Admin (courses + quizzes)
4. Mobile quiz flow
5. CMS
6. Deployment
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
- [ ] Student can attempt quizzes
- [ ] Results are calculated correctly
- [ ] Progress is tracked
- [ ] CMS updates website dynamically

---

## 🏁 Final Note

> Build small → test → improve → repeat

This is not just a project.
This is a **real product system**.

---
