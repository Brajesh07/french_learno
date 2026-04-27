# 🪜 FrenchLearno — Development Phases

---

## 1. 📌 Overview

This document divides the project into **clear phases with goals**.

Each phase:

- has a defined outcome
- builds on the previous phase
- can be tested independently

---

## 2. 🧱 Phase 1 — Setup & Foundation

### 🎯 Goal

Prepare project and backend

---

### Tasks

- [ ] Create Next.js project
- [ ] Install Tailwind CSS
- [ ] Setup Supabase project (staging)
- [ ] Configure `.env.local`
- [ ] Setup Supabase client (client + server)
- [ ] Create database tables (run SQL)
- [ ] Enable authentication (email/password)

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

- [ ] Create **web test signup page**
- [ ] Implement:
  - `supabase.auth.signUp()`
  - insert into `profiles`

- [ ] Create login form
- [ ] Implement:
  - email login
  - username login

- [ ] Create AuthProvider
- [ ] Protect routes

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

- [ ] Create dashboard layout
- [ ] Sidebar navigation
- [ ] Header with logout
- [ ] Protect admin routes
- [ ] Setup role check (`admin`)

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

- [ ] Create course form
- [ ] Fetch and display courses
- [ ] Edit course
- [ ] Delete course

---

### ✅ Output

- Courses fully manageable

---

## 6. 📝 Phase 5 — Quiz System (Admin)

### 🎯 Goal

Admin can create full quizzes

---

### Tasks

- [ ] Create quiz form
- [ ] Replace course ID with dropdown
- [ ] Build question builder UI
- [ ] Add dynamic options
- [ ] Select correct answer
- [ ] Add explanation & points
- [ ] Implement live preview
- [ ] Create API (transaction-based)

---

### ✅ Output

- Complete quiz creation system

---

## 7. 📱 Phase 6 — Student Mobile App

### 🎯 Goal

Student can use the app

---

### Tasks

- [ ] Setup React Native project
- [ ] Implement auth (reuse logic)
- [ ] Course list screen
- [ ] Quiz list screen
- [ ] Quiz question screen
- [ ] Timer implementation
- [ ] Answer selection

---

### ✅ Output

- Student can:
  - login
  - view courses
  - start quizzes

---

## 8. 📊 Phase 7 — Quiz Attempt & Results

### 🎯 Goal

Complete quiz experience

---

### Tasks

- [ ] Submit quiz API
- [ ] Calculate score
- [ ] Store attempt
- [ ] Show result screen
- [ ] Show review answers

---

### ✅ Output

- Full quiz lifecycle working

---

## 9. 📈 Phase 8 — Progress System

### 🎯 Goal

Track and unlock progress

---

### Tasks

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

- [ ] Create CMS editor (admin)
- [ ] Create `/french-learning` page
- [ ] Fetch and render CMS content

---

### ✅ Output

- Website content controlled by admin

---

## 11. 💳 Phase 10 — Subscription (Basic)

### 🎯 Goal

Control free vs paid access

---

### Tasks

- [ ] Add subscription logic
- [ ] Restrict premium content
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

- [ ] Enable RLS policies
- [ ] Protect all APIs
- [ ] Validate inputs
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

- [ ] Setup production Supabase
- [ ] Push schema to production
- [ ] Setup environment variables
- [ ] Deploy Next.js app
- [ ] Final testing

---

### ✅ Output

- Live application

---

## 14. 🧠 Development Strategy

---

### 🔥 Golden Rule

```txt id="rule1"
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

- 📱 Fully working mobile learning app
- 🖥️ Admin dashboard
- 🌐 Dynamic website
- ⚙️ Scalable backend

---

## 🚀 Final Thought

> This is not just a project timeline
> This is your roadmap to a real product

---
