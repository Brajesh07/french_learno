# 🇫🇷 FrenchLearno — Project Summary

---

## 1. 📌 Project Overview

**FrenchLearno** is a multi-platform learning system designed to help students learn French through structured courses, quizzes, and guided progression.

The system consists of:

- 📱 **Mobile App (React Native)** — for students
- 🖥️ **Admin Dashboard (Next.js)** — for managing students, courses, quizzes, and content
- 🌐 **Public Website (Next.js)** — for showcasing the app and converting users

---

## 2. 🎯 Core Objective

Build a scalable, production-ready learning platform with:

- Structured learning paths (levels)
- Quiz-based progression system
- Admin-controlled content management
- Subscription-based access
- Clean and maintainable architecture

---

## 3. 👥 User Roles

### 3.1 Student

- Signs up via mobile app
- Accesses courses and quizzes
- Progresses through levels
- Has access to:
  - free demo content
  - paid premium content

---

### 3.2 Admin

- Logs into admin dashboard
- Manages:
  - students
  - courses
  - quizzes
  - subscriptions (manual for now, automated later)
  - CMS content

---

## 4. 📱 Mobile App Features (Student Side)

### Authentication

- Signup:
  - name
  - username (unique)
  - email (unique)
  - phone
  - class (optional)
  - password

- Login:
  - email or username
  - password

> Note: Unique user identification will be handled by the system (UUID via backend).

---

### Dashboard

- Displays student profile
- Shows current level
- Shows progress overview

---

### Learning System

- Courses grouped by levels (A1, B1, B2)
- Each course may include:
  - text
  - audio
  - images
  - video

---

### Quiz System

- Free (demo) quizzes
- Paid quizzes
- Multiple attempts allowed
- Passing a quiz unlocks the next level

---

### Progress Tracking

- Track completed courses
- Track quiz attempts
- Store scores and results
- Determine level progression

---

### Subscription

- Free plan:
  - access to demo content

- Paid plan:
  - access to full courses and quizzes

- Currently managed manually by admin

- Future: integrate Razorpay or Stripe

---

### Profile

- Update personal details
- View progress and level

---

## 5. 🖥️ Admin Dashboard Features

### Authentication

- Secure login using email and password

---

### Student Management

- View all students
- Update student information
- Assign or update levels
- Track student progress

---

### Course Management

- Create, edit, delete courses
- Assign levels
- Upload course content (text, media)

---

### Quiz Management

- Create quizzes
- Add questions and answers
- Define passing criteria

---

### Subscription Management

- Mark users as free or paid
- Control access to premium content

---

### CMS (Content Management System)

- Manage public website content:
  - `/french-learning` page

- Sections include:
  - hero
  - features
  - testimonials
  - CTA

- Content is:
  - stored in database
  - dynamically rendered on frontend
  - editable without code deployment

---

### Basic Analytics (Initial)

- View student progress
- Track quiz performance
- Monitor active users

---

## 6. 🌐 Public Website Features

### Pages

- `/` → Owner portfolio / client introduction
- `/contact` → Contact page
- `/french-learning` → App showcase page

---

### Key Requirement

- Content must be **dynamic (CMS-controlled)**
- Admin can update content without redeploying the app

---

## 7. 🏗️ Tech Stack

### Frontend

- Next.js (App Router)
- React
- Tailwind CSS

---

### Mobile

- React Native CLI

---

### Backend

- Supabase:
  - PostgreSQL database
  - Authentication (JWT-based)
  - Row Level Security (RLS)

- Cloudinary:
  - media storage (images, audio, video)

---

## 8. 🔄 Migration Decision

### Previous System

- Firebase Auth
- Firestore (NoSQL)
- Firebase Admin SDK

---

### New System (Target)

- Supabase Auth
- PostgreSQL (relational database)

---

### Reason for Migration

- Better relational data handling
- Easier querying (joins)
- Cleaner backend architecture
- More control over data

---

## 9. 🧠 Key System Concepts

### 1. Unified Authentication

- All users (students and admins) use Supabase Auth
- Each user has a unique ID (UUID)
- Additional user data stored in a profile table

---

### 2. Role-Based Access

- student
- admin

---

### 3. Level Progression

- Students advance by passing quizzes
- Unlock next level upon success

---

### 4. CMS-Driven Content

- Public website content stored in database
- Rendered dynamically on frontend

---

### 5. Subscription System

- Free vs Paid users
- Determines access to content

---

## 10. ⚙️ Environment Strategy

Two Supabase environments:

- **Staging**
  - Development and testing

- **Production**
  - Live users

---

### Workflow

1. Build and test in staging
2. Apply database migrations
3. Push same schema to production
4. Switch environment variables

---

## 11. 🚧 Constraints

- Solo developer
- Limited deployment experience
- Must remain simple and maintainable
- Avoid over-engineering

---

## 12. 🎯 Goal of This Rebuild

- Clean architecture
- Scalable backend
- Secure authentication
- Easy content management
- Production-ready system

---

## 13. 🚀 Future Scope

- AI-based learning assistant
- Advanced analytics dashboard
- Gamification (badges, streaks)
- Multi-language support
- Payment gateway integration

---

## ✅ Summary

FrenchLearno is a full-stack learning platform combining:

- Mobile learning experience
- Admin control system
- Dynamic marketing website

Built with a focus on:

- scalability
- maintainability
- real-world production standards

---
