# 🔌 FrenchLearno — API Design

---

## 1. 📌 Overview

This document defines all API endpoints for:

- 🖥️ Admin Dashboard
- 📱 Mobile App

All APIs are built using **Next.js API routes** and connected to **Supabase**.

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

#### GET all students

```http id="a1"
GET /api/admin/students
```

Response:

```json id="a2"
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

#### UPDATE student

```http id="a3"
PATCH /api/admin/students/:id
```

```json id="a4"
{
  "name": "Updated Name",
  "level": "B1"
}
```

---

---

### 3.2 Courses

#### CREATE course

```http id="b1"
POST /api/admin/courses
```

```json id="b2"
{
  "title": "React Basics",
  "level": "A1",
  "description": "Intro course"
}
```

---

#### GET all courses

```http id="b3"
GET /api/admin/courses
```

---

#### UPDATE course

```http id="b4"
PATCH /api/admin/courses/:id
```

---

#### DELETE course

```http id="b5"
DELETE /api/admin/courses/:id
```

---

---

### 3.3 Quizzes

#### CREATE quiz (with questions)

```http id="c1"
POST /api/admin/quizzes
```

```json id="c2"
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

```http id="c3"
GET /api/admin/quizzes
```

---

#### UPDATE quiz

```http id="c4"
PATCH /api/admin/quizzes/:id
```

---

#### DELETE quiz

```http id="c5"
DELETE /api/admin/quizzes/:id
```

---

---

### 3.4 CMS (Public Content)

#### GET content

```http id="d1"
GET /api/admin/cms
```

---

#### UPDATE section

```http id="d2"
PATCH /api/admin/cms/:section_key
```

```json id="d3"
{
  "title": "Learn French Easily",
  "body": "Updated content..."
}
```

---

---

## 4. 📱 Mobile APIs (Student)

---

### 4.1 Courses

#### GET available courses

```http id="e1"
GET /api/mobile/courses
```

Response:

```json id="e2"
[
  {
    "id": "course-id",
    "title": "React Basics",
    "level": "A1"
  }
]
```

---

---

### 4.2 Quizzes

#### GET quizzes for course

```http id="f1"
GET /api/mobile/quizzes?course_id=123
```

---

#### GET quiz details

```http id="f2"
GET /api/mobile/quizzes/:id
```

Response:

```json id="f3"
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

---

### 4.3 Submit Quiz

```http id="g1"
POST /api/mobile/quizzes/:id/submit
```

```json id="g2"
{
  "answers": [
    {
      "question_id": "q1",
      "answer_id": "a2"
    }
  ]
}
```

---

### Response:

```json id="g3"
{
  "score": 8,
  "total": 10,
  "percentage": 80,
  "passed": true
}
```

---

---

### 4.4 Progress

#### GET user progress

```http id="h1"
GET /api/mobile/progress
```

---

---

## 5. 🔁 Data Flow Summary

---

### Admin Flow

```txt id="flow1"
Admin → Create Course → Create Quiz → Add Questions → Stored in DB
```

---

### Student Flow

```txt id="flow2"
Student → Fetch Quiz → Attempt → Submit → Get Result → Save Progress
```

---

## 6. ⚠️ Important Notes

- Never expose correct answers in quiz API
- Validate all inputs
- Use transactions for quiz creation
- Protect all admin routes

---

## 7. 🚀 Future Enhancements

- Pagination for large data
- Search/filter APIs
- Analytics endpoints
- Leaderboards

---

## ✅ Summary

This API layer connects:

- Admin → Database
- Mobile App → Database

It ensures:

- secure access
- clean structure
- scalable backend

---
