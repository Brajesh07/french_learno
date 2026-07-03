# 🔌 FrenchLearno — API Design

---

## 1. 📌 Overview

This document defines all API endpoints for:

- 🖥️ Admin Dashboard
- 📱 Mobile App (React Native)
- 🌐 Public Website (separate Vercel project)

All APIs are built using **Next.js API routes** (in the Admin Dashboard project) and connected to **Supabase**.

> **Status legend:** ✅ Built | 🚧 In Progress | ⚠️ Not built

---

## 2. 🔐 Authentication Rules

- All protected routes require **logged-in user**
- Admin routes require:
  - `role = admin`

- Student routes require:
  - `role = student`

---

## 3. 🖥️ Admin APIs

---

### 3.1 Students

| Method | Endpoint                      | Description        | Status   |
| ------ | ----------------------------- | ------------------ | -------- |
| GET    | `/api/admin/list-students`    | List all students  | ✅ Built |
| GET    | `/api/admin/student/[uid]`    | Get student detail | ✅ Built |
| PATCH  | `/api/admin/student/[uid]`    | Partial update     | ✅ Built |

#### GET all students

```http
GET /api/admin/list-students?page=1&limit=20&search=john
```

Response:

```json
{
  "students": [
    {
      "id": "uuid",
      "name": "Gaurav",
      "email": "test@gmail.com",
      "username": "gaurav123",
      "phone": "+1234567890",
      "class": "10th",
      "created_at": "2025-01-01T00:00:00Z",
      "last_login_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

#### GET student detail

```http
GET /api/admin/student/[uid]
```

---

#### PATCH student (partial update)

```http
PATCH /api/admin/student/[uid]
```

```json
{
  "name": "Updated Name",
  "class": "12th"
}
```

---

### 3.2 Courses

| Method | Endpoint                  | Description      | Status   |
| ------ | ------------------------- | ---------------- | -------- |
| POST   | `/api/admin/courses`      | Create course    | ✅ Built |
| GET    | `/api/admin/courses`      | List all courses | ✅ Built |
| GET    | `/api/admin/courses/[id]` | Get course       | ✅ Built |
| PATCH  | `/api/admin/courses/[id]` | Partial update   | ✅ Built |
| DELETE | `/api/admin/courses/[id]` | Delete course    | ✅ Built |

#### CREATE course

```http
POST /api/admin/courses
```

```json
{
  "title": "French Basics",
  "level": "A1",
  "description": "Intro course"
}
```

---

#### GET all courses

```http
GET /api/admin/courses?page=1&limit=20&level=A1&isPublished=true&search=french
```

---

#### PATCH course (partial update)

```http
PATCH /api/admin/courses/[id]
```

---

#### DELETE course

```http
DELETE /api/admin/courses/[id]
```

---

### 3.3 Quizzes

| Method | Endpoint                  | Description      | Status   |
| ------ | ------------------------- | ---------------- | -------- |
| POST   | `/api/admin/quizzes`      | Create quiz      | ✅ Built |
| GET    | `/api/admin/quizzes`      | List all quizzes | ✅ Built |
| GET    | `/api/admin/quizzes/[id]` | Get quiz         | ✅ Built |
| PATCH  | `/api/admin/quizzes/[id]` | Partial update   | ✅ Built |
| DELETE | `/api/admin/quizzes/[id]` | Delete quiz      | ✅ Built |

#### CREATE quiz (with questions)

```http
POST /api/admin/quizzes
```

```json
{
  "title": "French Quiz 1",
  "course_id": "course-id",
  "passing_score": 70,
  "questions": [
    {
      "question": "What is 'hello' in French?",
      "points": 1,
      "explanation": "Bonjour is the French word for hello",
      "answers": [
        { "text": "Au revoir", "is_correct": false },
        { "text": "Bonjour", "is_correct": true }
      ]
    }
  ]
}
```

---

#### GET quizzes

```http
GET /api/admin/quizzes?page=1&limit=20&courseId=uuid&search=french
```

---

#### PATCH quiz (partial update)

```http
PATCH /api/admin/quizzes/[id]
```

---

#### DELETE quiz

```http
DELETE /api/admin/quizzes/[id]
```

---

### 3.4 CMS (Admin — Public Content Control)

| Method | Endpoint                       | Description          | Status   |
| ------ | ------------------------------ | -------------------- | -------- |
| GET    | `/api/admin/cms`               | Get all CMS sections | ✅ Built |
| PATCH  | `/api/admin/cms/[section_key]` | Update a section     | ✅ Built |

#### GET content

```http
GET /api/admin/cms
```

---

#### PATCH section (partial update)

```http
PATCH /api/admin/cms/[section_key]
```

```json
{
  "title": "Learn French Easily",
  "body": "Updated content..."
}
```

---

### 3.5 Notifications

| Method | Endpoint                   | Description                | Status   |
| ------ | -------------------------- | -------------------------- | -------- |
| GET    | `/api/admin/notifications` | List notifications         | ✅ Built |
| PATCH  | `/api/admin/notifications` | Mark notifications as read | ✅ Built |

#### GET notifications

```http
GET /api/admin/notifications?limit=50
```

Response:

```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "login",
      "title": "Student Login",
      "message": "John Doe logged in",
      "user_id": "uuid",
      "metadata": { "userEmail": "john@example.com" },
      "is_read": false,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

#### Mark all as read

```http
PATCH /api/admin/notifications
```

```json
{
  "markAllRead": true
}
```

---

### 3.6 Analytics

| Method | Endpoint                                   | Description                    | Status   |
| ------ | ------------------------------------------ | ------------------------------ | -------- |
| GET    | `/api/admin/analytics/kpis`                | Key performance indicators     | ✅ Built |
| GET    | `/api/admin/analytics/activity`            | Student activity over time     | ✅ Built |
| GET    | `/api/admin/analytics/subscriptions`       | Subscription distribution      | ✅ Built |
| GET    | `/api/admin/analytics/quiz-performance`    | Quiz performance by level      | ✅ Built |
| GET    | `/api/admin/analytics/level-distribution`  | Students per level             | ✅ Built |

#### GET KPIs

```http
GET /api/admin/analytics/kpis
```

Response:

```json
{
  "totalStudents": 150,
  "activeThisWeek": 25,
  "avgQuizScore": 78.5,
  "overallPassRate": 72.3
}
```

---

#### GET activity

```http
GET /api/admin/analytics/activity?range=weekly
```

---

#### GET subscriptions

```http
GET /api/admin/analytics/subscriptions
```

Response:

```json
{
  "free": 120,
  "paid": 30,
  "conversionRate": 20.0
}
```

---

#### GET quiz performance

```http
GET /api/admin/analytics/quiz-performance
```

---

#### GET level distribution

```http
GET /api/admin/analytics/level-distribution
```

---

## 4. 🌐 Public Website APIs

> Consumed by the **Public/Showcase Website** (separate Vercel project). That project fetches content from the Admin Dashboard's API.

| Method | Endpoint          | Description                   | Status   |
| ------ | ----------------- | ----------------------------- | -------- |
| GET    | `/api/public/cms` | Fetch all visible CMS content | ✅ Built |

#### GET public CMS content

```http
GET /api/public/cms
```

Response:

```json
[
  {
    "section_key": "hero",
    "title": "Learn French Easily",
    "subtitle": "...",
    "body": "...",
    "is_visible": true
  }
]
```

> This endpoint is public (no auth required) and returns only sections where `is_visible = true`.

---

## 5. 📱 Mobile APIs (Student)

---

### 5.1 Courses

| Method | Endpoint                        | Description           | Status   |
| ------ | ------------------------------- | --------------------- | -------- |
| GET    | `/api/mobile/courses`           | Get available courses | ✅ Built |
| POST   | `/api/mobile/courses/[id]/complete` | Mark course complete | ✅ Built |

#### GET available courses

```http
GET /api/mobile/courses
```

Response:

```json
[
  {
    "id": "course-id",
    "title": "French Basics",
    "level": "A1"
  }
]
```

---

#### POST mark course complete

```http
POST /api/mobile/courses/[id]/complete
```

---

### 5.2 Quizzes

| Method | Endpoint                          | Description             | Status   |
| ------ | --------------------------------- | ----------------------- | -------- |
| GET    | `/api/mobile/quizzes`             | Get quizzes for course  | ✅ Built |
| GET    | `/api/mobile/quizzes/[id]`        | Get quiz with questions | ✅ Built |
| POST   | `/api/mobile/quizzes/[id]/submit` | Submit quiz answers     | ✅ Built |

#### GET quizzes for course

```http
GET /api/mobile/quizzes?course_id=123
```

---

#### GET quiz details

```http
GET /api/mobile/quizzes/[id]
```

Response:

```json
{
  "id": "quiz-id",
  "title": "French Quiz 1",
  "questions": [
    {
      "id": "q1",
      "question": "What is 'hello' in French?",
      "answers": [
        { "id": "a1", "text": "Au revoir" },
        { "id": "a2", "text": "Bonjour" }
      ]
    }
  ]
}
```

---

### 5.3 Submit Quiz

| Method | Endpoint                          | Description         | Status   |
| ------ | --------------------------------- | ------------------- | -------- |
| POST   | `/api/mobile/quizzes/[id]/submit` | Submit quiz answers | ✅ Built |

```http
POST /api/mobile/quizzes/[id]/submit
```

```json
{
  "answers": [
    {
      "question_id": "q1",
      "answer_id": "a2"
    }
  ]
}
```

Response:

```json
{
  "score": 8,
  "total": 10,
  "percentage": 80,
  "passed": true
}
```

---

### 5.4 Progress

| Method | Endpoint               | Description       | Status       |
| ------ | ---------------------- | ----------------- | ------------ |
| GET    | `/api/mobile/progress` | Get user progress | ⚠️ Not built |

> ⚠️ **Not built:** `/api/mobile/progress` is listed in the design but has **not been implemented**. Do not call this endpoint — it will return 404.

---

## 6. 🔐 Auth APIs

| Method | Endpoint                 | Description              | Status   |
| ------ | ------------------------ | ------------------------ | -------- |
| POST   | `/api/auth/login`        | Admin/student login      | ✅ Built |
| POST   | `/api/auth/logout`       | Logout                   | ✅ Built |
| GET    | `/api/auth/profile`      | Get current user profile | ✅ Built |
| POST   | `/api/auth/lookup-email` | Lookup email from username | ✅ Built |
| POST   | `/api/auth/notify-login` | Send login notification  | ✅ Built |

---

## 7. 🔁 Data Flow Summary

---

### Admin Flow

```txt
Admin → Create Course → Create Quiz → Add Questions → Stored in DB
```

---

### Student Flow (Mobile)

```txt
Student → Fetch Quiz → Attempt → Submit → Get Result → Save Progress
```

---

### Public Website Flow

```txt
Public Website (Vercel #2) → GET /api/public/cms (Vercel #1 Admin) → Supabase → Render
```

---

## 8. ⚠️ Important Notes

- Never expose correct answers in quiz API
- Validate all inputs
- Use transactions for quiz creation
- Protect all admin routes
- Use **PATCH** for partial updates, **PUT** for full replacements (currently no PUT endpoints exist)

---

## 9. 🚀 Future Enhancements

- Pagination for large data
- Search/filter APIs
- Analytics endpoints
- Leaderboards

---

## ✅ Summary

This API layer connects:

- Admin Dashboard → Database (25 endpoints)
- Mobile App → Database (6 endpoints)
- Public Website → Admin CMS API → Database

It ensures:

- secure access
- clean structure
- scalable backend

---
