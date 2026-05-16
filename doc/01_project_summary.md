# 🇫🇷 FrenchLearno — Project Summary

---

## 1. 📌 Project Overview

**FrenchLearno** is a multi-platform French language learning system that allows students to learn French through structured proficiency-level courses and quiz-based progression via a mobile app, while administrators manage all content — students, courses, quizzes, subscriptions, and CMS — through a dedicated dashboard. A public-facing marketing website powered by a CMS rounds out the platform.

The system consists of three platform components:

| Platform               | Tech Stack           | Purpose                                     |
| ---------------------- | -------------------- | ------------------------------------------- |
| 📱 **Mobile App**      | React Native         | Students learn French via courses + quizzes |
| 🖥️ **Admin Dashboard** | Next.js (App Router) | Manage students, courses, quizzes, CMS      |
| 🌐 **Public Website**  | Next.js (App Router) | Marketing + CMS-driven content              |

---

## 2. 🎯 Core Features

- **Proficiency-level structure** — Courses and quizzes grouped by levels (A1, A2, B1, B2, etc.)
- **Quiz-based progression** — Students unlock the next level by passing quizzes
- **Subscription access model** — Free (demo) content and paid premium content
- **Admin-controlled CMS** — Public website content managed from the dashboard without redeployment
- **Role-based access** — Two roles: `admin` and `student`; each has distinct access scope

---

## 3. 👥 User Roles

### Student

- Signs up via mobile app
- Accesses courses and quizzes per their proficiency level
- Has free (demo) and paid (premium) content tiers

### Admin

- Logs into admin dashboard
- Manages students, courses, quizzes, subscriptions, and CMS content

---

## 4. 🏗️ Tech Stack

| Layer           | Technology                                |
| --------------- | ----------------------------------------- |
| Admin Dashboard | Next.js (App Router), React, Tailwind CSS |
| Public Website  | Next.js (App Router), React, Tailwind CSS |
| Mobile App      | React Native CLI                          |
| Backend / DB    | Supabase (PostgreSQL + Auth + RLS)        |
| Media Storage   | Cloudinary (images, audio, video)         |

---

## 5. 📋 Current Status

| Phase                | Progress           |
| -------------------- | ------------------ |
| Backend + schema     | ~80%               |
| Admin dashboard      | ~65%               |
| Mobile app           | ~0–20% (APIs only) |
| Public website       | ~0%                |
| Production readiness | 0%                 |

### What is working

- Admin dashboard UI and APIs (mostly built)
- Courses and quizzes: full CRUD operational
- Auth system: login, session management, role-based access
- Database schema: complete with Supabase + RLS policies
- Mobile APIs: endpoints exist for courses, quizzes, and quiz submission
- CMS API: built

---

## 6. ⚠️ Known Gaps

| Area                  | Status         | Detail                                                  |
| --------------------- | -------------- | ------------------------------------------------------- |
| Supabase connection   | ⚠️ Missing     | App cannot run with real data — env vars not configured |
| Student system        | 🚧 In Progress | API mismatch, missing routes; partially broken          |
| Dashboard stats       | 🚧 In Progress | Data is hardcoded/fake, not connected to DB             |
| CMS UI                | ⚠️ Missing     | API exists but no frontend interface                    |
| Analytics page        | ⚠️ Missing     | Not built                                               |
| Mobile app            | ⚠️ Missing     | APIs only — no React Native frontend                    |
| Public website        | ⚠️ Missing     | Not built                                               |
| Production deployment | ⚠️ Missing     | No deployment configuration                             |

---

## 7. 🔮 Future Scope

- Payment gateway integration (Razorpay or Stripe)
- AI-based learning assistant
- Advanced analytics dashboard
- Gamification (badges, streaks)
- Multi-language support
- real-world production standards

---
