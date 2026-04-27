# 🏗️ FrenchLearno — System Architecture

---

## 1. 📌 Overview

FrenchLearno is a full-stack system consisting of:

- 📱 Mobile App (Student-facing)
- 🖥️ Admin Dashboard (Admin-facing)
- 🌐 Public Website (Marketing + CMS)
- ⚙️ Backend (Supabase)

All platforms communicate with a **single backend (Supabase)**.

---

## 2. 🧩 High-Level Architecture

```txt
Mobile App (React Native)
        │
        │
Admin Dashboard (Next.js) ───→ Supabase (DB + Auth + Storage)
        │
        │
Public Website (Next.js)
```

---

## 3. 🔐 Authentication Flow

### Signup (Student)

1. User fills:
   - name
   - username
   - email
   - password

2. App calls:
   - `supabase.auth.signUp()`

3. Supabase:
   - creates user in `auth.users`
   - returns user ID (UUID)

4. Store extra data in:
   - `profiles` table

---

### Login (Email or Username)

1. User enters:
   - email OR username
   - password

2. Logic:
   - If input contains `@` → login with email
   - Else → find email from username → then login

3. Supabase returns:
   - JWT session

---

## 4. 🧠 Core Backend Components

### 4.1 Supabase Auth

- Handles:
  - signup
  - login
  - session management

- Uses JWT tokens

---

### 4.2 Database (PostgreSQL)

Main tables:

- `profiles`
- `courses`
- `quizzes`
- `quiz_questions`
- `quiz_attempts`
- `subscriptions`
- `showcase_content`

---

### 4.3 Storage

- Cloudinary:
  - images
  - videos
  - audio

---

## 5. 📱 Mobile App Flow

```txt
Login → Dashboard → Courses → Quiz → Result → Level Progression
```

### Key Interactions:

- Fetch courses
- Attempt quizzes
- Submit answers
- View progress

---

## 6. 🖥️ Admin Dashboard Flow

```txt
Login → Dashboard → Manage Students / Courses / Quizzes / CMS
```

### Admin Actions:

- Create courses
- Create quizzes
- Update student data
- Manage subscriptions
- Edit website content

---

## 7. 🌐 Public Website Flow

```txt
Visitor → /french-learning → Fetch CMS Content → Render Page
```

### Key Concept:

- Fully dynamic content from database
- No hardcoded data

---

## 8. 🔌 API Layer (Next.js)

Next.js acts as a **backend layer**:

### Routes:

#### Admin APIs

```txt
/api/admin/students
/api/admin/courses
/api/admin/quizzes
/api/admin/cms
```

#### Mobile APIs

```txt
/api/mobile/courses
/api/mobile/quizzes
/api/mobile/submit
```

---

## 9. 🔒 Security Model

### Authentication

- Supabase JWT-based sessions

---

### Authorization

- Role-based:
  - student
  - admin

---

### Data Protection

- Row Level Security (RLS)
- Admin-only routes protected

---

## 10. ⚙️ Environment Setup

Two environments:

### Staging

- Development & testing

### Production

- Live users

---

### Flow:

```txt
Develop → Test (Staging) → Deploy → Production
```

---

## 11. 🧠 Key Design Decisions

### 1. Single Backend

- All apps use same Supabase project

---

### 2. Unified Auth System

- No Firebase
- No dual auth

---

### 3. Relational Database

- No nested collections
- Clean joins

---

### 4. CMS-Based Website

- Admin-controlled content

---

## 12. 🚀 Scalability Considerations

- Add caching later (if needed)
- Add CDN for media (Cloudinary already helps)
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
