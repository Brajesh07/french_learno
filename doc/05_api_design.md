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

> **Note:** The canonical student endpoint is `/api/admin/students`. Do **not** use `/api/admin/list-students` or `/api/admin/student/[uid]` — those are deprecated/incorrect naming.

| Method | Endpoint                   | Description        | Status   |
| ------ | -------------------------- | ------------------ | -------- |
| GET    | `/api/admin/students`      | List all students  | ✅ Built |
| GET    | `/api/admin/students/[id]` | Get student detail | ✅ Built |
| PATCH  | `/api/admin/students/[id]` | Partial update     | ✅ Built |

#### GET all students

```http
GET /api/admin/students
```

Response:

```json
[
  {
    "id": "uuid",
    "name": "Gaurav",
    "email": "test@gmail.com",
    "level": "A1"
  }
]
```

---

#### GET student detail

```http
GET /api/admin/students/[id]
```

---

#### PATCH student (partial update)

```http
PATCH /api/admin/students/[id]
```

```json
{
  "name": "Updated Name",
  "level": "B1"
}
```

---

### 3.2 Courses

| Method | Endpoint                  | Description      | Status   |
| ------ | ------------------------- | ---------------- | -------- |
| POST   | `/api/admin/courses`      | Create course    | ✅ Built |
| GET    | `/api/admin/courses`      | List all courses | ✅ Built |
| PATCH  | `/api/admin/courses/[id]` | Partial update   | ✅ Built |
| DELETE | `/api/admin/courses/[id]` | Delete course    | ✅ Built |

#### CREATE course

```http
POST /api/admin/courses
```

```json
{
  "title": "React Basics",
  "level": "A1",
  "description": "Intro course"
}
```

---

#### GET all courses

```http
GET /api/admin/courses
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
| PATCH  | `/api/admin/quizzes/[id]` | Partial update   | ✅ Built |
| DELETE | `/api/admin/quizzes/[id]` | Delete quiz      | ✅ Built |

#### CREATE quiz (with questions)

```http
POST /api/admin/quizzes
```

```json
{
  "title": "React Quiz",
  "course_id": "course-id",
  "passing_score": 70,
  "questions": [
    {
      "question": "What is React?",
      "answers": [
        { "text": "Framework", "is_correct": false },
        { "text": "Library", "is_correct": true }
      ]
    }
  ]
}
```

---

#### GET quizzes

```http
GET /api/admin/quizzes
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

| Method | Endpoint              | Description           | Status   |
| ------ | --------------------- | --------------------- | -------- |
| GET    | `/api/mobile/courses` | Get available courses | ✅ Built |

#### GET available courses

```http
GET /api/mobile/courses
```

Response:

```json
[
  {
    "id": "course-id",
    "title": "React Basics",
    "level": "A1"
  }
]
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
  "title": "React Quiz",
  "questions": [
    {
      "id": "q1",
      "question": "What is React?",
      "answers": [
        { "id": "a1", "text": "Framework" },
        { "id": "a2", "text": "Library" }
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

## 6. 🔁 Data Flow Summary

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

## 7. ⚠️ Important Notes

- Never expose correct answers in quiz API
- Validate all inputs
- Use transactions for quiz creation
- Protect all admin routes
- Use **PATCH** for partial updates, **PUT** for full replacements (currently no PUT endpoints exist)

---

## 8. 🚀 Future Enhancements

- Pagination for large data
- Search/filter APIs
- Analytics endpoints
- Leaderboards

---

## ✅ Summary

This API layer connects:

- Admin Dashboard → Database
- Mobile App → Database
- Public Website → Admin CMS API → Database

It ensures:

- secure access
- clean structure
- scalable backend

---
