# French Learno — Project Architecture & Structure Summary

## Project Overview

**French Learno** is a multi-platform French language learning system that enables students to learn through structured proficiency-level courses and quiz-based progression, while administrators manage content, students, subscriptions, and analytics from a dedicated web dashboard.

The platform is designed around three intended client surfaces that share a single **Supabase** backend:

| Platform | Technology | Status |
| --- | --- | --- |
| Admin Dashboard | Next.js 15 (App Router) | ~80% complete |
| Student Portal (Web) | Next.js under `/temp/*` | In active development |
| Mobile App | React Native (planned) | APIs only — no native UI yet |
| Public Marketing Site | Next.js (planned) | Not built — CMS API ready |

### Core Capabilities

- **Proficiency-level learning** — Courses and quizzes organized by CEFR levels (A1, B1, B2)
- **Quiz-based progression** — Students advance by completing and passing quizzes
- **Subscription model** — Free (demo) and paid (premium) content tiers
- **Role-based access control (RBAC)** — Distinct `admin` and `student` roles with middleware-enforced routing
- **Admin analytics** — KPIs, activity trends, quiz performance, level distribution, and subscription metrics
- **Notifications** — Activity events for logins, signups, quiz completions, and course completions
- **CMS API** — Backend for future public marketing content (no dashboard editor UI yet)

### Current Development Status

| Area | Progress |
| --- | --- |
| Database schema & migrations | ~90% |
| Admin dashboard | ~80% |
| Student web portal (`/temp/dashboard`) | In progress (RBAC guards, loading states) |
| Mobile API routes | Built |
| React Native mobile app | Not started |
| Public website | Not started |
| Production deployment | Not configured |

---

## Tech Stack & Framework

### Frontend

| Layer | Technology | Purpose |
| --- | --- | --- |
| Framework | **Next.js 15.5** (App Router, Turbopack) | Full-stack React framework with SSR, API routes, and file-based routing |
| UI Library | **React 19** | Component-based UI rendering |
| Language | **TypeScript 5** | Static typing across the entire codebase |
| Styling | **Tailwind CSS 4** | Utility-first responsive styling with dark/light theme support |
| UI Primitives | **Headless UI**, **Heroicons** | Accessible interactive components and iconography |
| Forms | **React Hook Form** + **Yup** | Form state management and schema validation |
| Charts | **Chart.js** | Analytics visualizations (line, bar, donut charts) |
| Fonts | **Geist** (via `next/font`) | Modern sans-serif typography |

### Backend & Infrastructure

| Layer | Technology | Purpose |
| --- | --- | --- |
| Database | **Supabase (PostgreSQL)** | Relational data store with UUID primary keys |
| Authentication | **Supabase Auth** (JWT) | Email/password auth with server-side session via `@supabase/ssr` |
| Authorization | **Row Level Security (RLS)** + middleware RBAC | Database-level and route-level access control |
| API Layer | **Next.js Route Handlers** | RESTful endpoints for admin, mobile, auth, and public clients |
| Media Storage | **Cloudinary** | Image, audio, and video hosting for course content |
| Deployment Target | **Vercel** (planned) | Serverless hosting for Next.js |

### Tooling

- **ESLint 9** with `eslint-config-next` — linting
- **PostCSS** + `@tailwindcss/postcss` — CSS processing
- Path alias `@/*` → `./src/*` for clean imports

---

## Project Folder Structure

```
french_learno/
├── doc/                              # Internal architecture, API, schema, and phase documentation
├── issues/                           # Tracked code-quality and readiness issues
├── public/                           # Static assets (favicon, SVG icons)
├── supabase/
│   ├── migrations/                   # PostgreSQL schema migrations (001–004)
│   └── seeds/
│       └── seed.ts                   # Database seed script for development data
├── src/
│   ├── app/                          # Next.js App Router — pages, layouts, and API routes
│   │   ├── api/
│   │   │   ├── admin/                # Admin-only REST endpoints (courses, quizzes, students, analytics, CMS, notifications)
│   │   │   ├── auth/                 # Authentication endpoints (login, logout, profile, email lookup)
│   │   │   ├── mobile/               # Mobile client endpoints (courses, quizzes, submit, complete)
│   │   │   └── public/               # Unauthenticated public endpoints (CMS content)
│   │   ├── dashboard/                # Admin dashboard UI (courses, quizzes, students, analytics, notifications)
│   │   ├── login/                    # Admin login page
│   │   ├── temp/                     # Student-facing web portal (login, signup, mobile-style dashboard)
│   │   ├── globals.css               # Global Tailwind styles and CSS variables
│   │   ├── layout.tsx                # Root layout — AuthProvider, ThemeProvider, fonts
│   │   └── page.tsx                  # Root landing page
│   ├── components/
│   │   ├── auth/                     # AuthProvider, LoginForm — client-side auth context
│   │   ├── layout/                   # Sidebar, Header, DashboardLayout — admin shell
│   │   └── ui/                       # Reusable primitives (Button, Input, Textarea, ThemeProvider, RichTextEditor)
│   ├── hooks/
│   │   └── useAuth.ts                # Client hook for auth state and session helpers
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser Supabase client
│   │   │   ├── server.ts             # Server-side Supabase client (cookies/SSR)
│   │   │   ├── auth-helpers.ts       # Shared auth utility functions
│   │   │   ├── notifications.ts      # Notification creation and query helpers
│   │   │   └── page-auth.ts          # Server-side page guards for student routes (requireStudentPage)
│   │   ├── types.ts                  # Shared TypeScript domain types
│   │   ├── theme-types.ts            # Theme configuration types
│   │   └── utils.ts                  # General utilities (e.g., `cn` class merging)
│   └── middleware.ts                 # Edge middleware — session refresh, RBAC routing, role redirects
├── next.config.ts                    # Next.js config (remote image patterns for Cloudinary/Unsplash)
├── package.json                      # Dependencies and npm scripts (dev, build, lint)
├── tsconfig.json                     # TypeScript compiler options and path aliases
└── french_learning_summary.md        # This document
```

### Folder & File Reference

| Path | Description |
| --- | --- |
| `doc/` | Project documentation — architecture, database schema, API design, development phases |
| `supabase/migrations/` | Versioned SQL migrations defining tables, RLS policies, and indexes |
| `supabase/seeds/seed.ts` | Script to populate development data |
| `src/app/api/admin/` | Protected admin API — CRUD for courses, quizzes, students, CMS, analytics, notifications |
| `src/app/api/auth/` | Auth API — login, logout, profile, username-to-email lookup, login notifications |
| `src/app/api/mobile/` | Student mobile API — list courses/quizzes, submit answers, mark courses complete |
| `src/app/api/public/` | Public CMS API — read-only marketing content for future public website |
| `src/app/dashboard/` | Admin UI — sidebar layout with courses, quizzes, students, analytics, notifications |
| `src/app/temp/` | Student web portal — mobile-optimized UI with bottom nav, courses, quizzes, profile |
| `src/app/login/` | Admin authentication page |
| `src/components/auth/` | Client auth context (`AuthProvider`) and reusable login form |
| `src/components/layout/` | Admin dashboard shell — sidebar navigation, header, page layout wrapper |
| `src/components/ui/` | Design-system primitives — buttons, inputs, theme provider, rich text editor |
| `src/hooks/useAuth.ts` | React hook exposing current user and auth actions to client components |
| `src/lib/supabase/` | Supabase client factories and server-side auth/notification helpers |
| `src/lib/supabase/page-auth.ts` | Server Component guard — enforces student role before rendering protected pages |
| `src/lib/types.ts` | Domain TypeScript interfaces (User, Course, Quiz, Student, etc.) |
| `src/middleware.ts` | Edge middleware — JWT session refresh, role-based route protection and redirects |
| `next.config.ts` | Next.js configuration including allowed remote image domains |
| `package.json` | Project metadata, dependencies, and build/dev scripts |

---

## Core Modules & Architecture

The application follows a **layered, monorepo-style Next.js architecture** where a single codebase serves multiple client personas through route segmentation and role-based access control.

### High-Level System Diagram

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Admin Dashboard   │     │  Student Web Portal │     │  Mobile App (future)│
│   /dashboard/*      │     │  /temp/dashboard/*  │     │  React Native       │
└─────────┬───────────┘     └─────────┬───────────┘     └─────────┬───────────┘
          │                           │                           │
          └───────────────────────────┼───────────────────────────┘
                                      ▼
                    ┌─────────────────────────────────┐
                    │     Next.js API Layer           │
                    │  /api/admin  /api/auth          │
                    │  /api/mobile /api/public        │
                    └─────────────────┬───────────────┘
                                      ▼
                    ┌─────────────────────────────────┐
                    │   Supabase (PostgreSQL + Auth)    │
                    │   Row Level Security (RLS)        │
                    └─────────────────────────────────┘
                                      │
                    ┌─────────────────┴───────────────┐
                    │         Cloudinary              │
                    │    (media: images, audio, video)│
                    └─────────────────────────────────┘
```

### 1. UI Layer (Presentation)

Two distinct UI surfaces share components but are route-separated:

- **Admin Dashboard** (`/dashboard/*`) — Desktop-oriented management console with sidebar navigation, data tables, rich-text course editor, quiz builder with live preview, and Chart.js analytics dashboards.
- **Student Portal** (`/temp/dashboard/*`) — Mobile-first learning interface with bottom navigation, course cards, quiz-taking forms, profile management, and skeleton loading states.

Shared UI primitives live in `src/components/ui/` and layout shells in `src/components/layout/`.

### 2. API Layer (Route Handlers)

Next.js Route Handlers act as a **Backend-for-Frontend (BFF)** and mobile API gateway:

| Namespace | Consumers | Responsibility |
| --- | --- | --- |
| `/api/admin/*` | Admin dashboard | Full CRUD for courses, quizzes, students, CMS, analytics, notifications |
| `/api/auth/*` | All clients | Login, logout, profile, email/username lookup |
| `/api/mobile/*` | Mobile app (future) | Read courses/quizzes, submit quiz answers, mark course completion |
| `/api/public/*` | Public website (future) | Read-only CMS content |

API routes verify Supabase sessions and enforce role checks before querying the database. Admin operations that require bypassing RLS use a service-role Supabase client.

### 3. Authentication & Authorization Module

A two-tier security model protects the application:

- **Edge Middleware** (`src/middleware.ts`) — Refreshes JWT sessions on every request, redirects unauthenticated users, and enforces role-based routing (admins → `/dashboard`, students → `/temp/dashboard`).
- **Page Guards** (`src/lib/supabase/page-auth.ts`) — Server-side `requireStudentPage()` helper for defense-in-depth on student Server Components.
- **Database RLS** — PostgreSQL policies restrict row access by role at the data layer.

### 4. Learning Content Module

Manages the core educational content lifecycle:

- **Courses** — Rich-text content with optional audio, image, and video attachments; organized by proficiency level (A1, B1, B2); draft/published workflow.
- **Quizzes** — Multi-question assessments with multiple-choice answers, point values, and explanations; admin quiz builder with live preview panel.
- **Progress Tracking** — `user_progress` and `quiz_attempts` tables record course completions and quiz scores; mobile completion endpoints update progress server-side.

### 5. Student Management Module

- **Student roster** — Paginated, searchable list with activity enrichment (`last_login_at`).
- **Student detail** — Individual profile view with activation and subscription status.
- **Subscriptions** — `has_subscription` flag on profiles controls access to premium content.

### 6. Analytics & Reporting Module

Admin analytics dashboard (`/dashboard/analytics`) with dedicated API endpoints:

- KPI summary (total students, courses, quizzes, published content)
- Activity line chart (weekly/monthly engagement)
- Subscription donut chart (free vs. paid distribution)
- Quiz performance bar chart (scores by level)
- Level distribution chart (student proficiency breakdown)

### 7. Notifications Module

Event-driven notification system tracking student activity:

- Event types: `login`, `signup`, `quiz_complete`, `course_complete`
- Admin notifications page with read/unread management and mark-all-read
- Notification helpers in `src/lib/supabase/notifications.ts`

### 8. CMS Module (API-Ready)

- `showcase_content` table stores marketing sections for a future public website
- Admin CMS API (`GET/PATCH /api/admin/cms`) and public read API (`GET /api/public/cms`) are built
- Dashboard CMS editor UI is not yet implemented

### Database Schema (Key Tables)

| Table | Purpose |
| --- | --- |
| `profiles` | User data, role, subscription status, activation flag |
| `courses` | Learning content per proficiency level |
| `quizzes` | Quiz metadata linked to levels |
| `quiz_questions` | Questions with points and explanations |
| `quiz_answers` | Answer options with `is_correct` flag |
| `quiz_attempts` | Student quiz attempt records |
| `quiz_attempt_answers` | Per-question response breakdown |
| `user_progress` | Per-user course completion tracking |
| `subscriptions` | Free/paid access control |
| `showcase_content` | CMS content for public website |
| `notifications` | Admin activity feed events |

---

## Architectural Insights (Agent Info)

### Why Next.js App Router?

Next.js 15 with the App Router was chosen because it unifies **admin UI, student web portal, and REST API** in a single TypeScript codebase. Route Handlers eliminate the need for a separate backend service, reducing deployment complexity while still providing a clean API surface for the future React Native mobile app. Server Components and `loading.tsx` skeletons enable fast perceived performance for data-heavy dashboard pages.

### Why Supabase over a Custom Backend?

Supabase provides **PostgreSQL, authentication, and Row Level Security** as managed infrastructure. This is a significant improvement over document-store patterns for a relational learning platform where courses, quizzes, questions, answers, and progress have clear foreign-key relationships. RLS enforces authorization at the database layer — a defense-in-depth complement to middleware and API route checks — and JWT-based auth integrates natively with `@supabase/ssr` for cookie-based server sessions.

### Why Route Segmentation (`/dashboard` vs `/temp`)?

The codebase deliberately separates admin and student experiences into distinct route trees. This enables **independent layouts** (sidebar vs. bottom nav), **role-specific middleware rules**, and a clear migration path: the `/temp/*` student portal serves as a web-based prototype and WebView target for mobile, while `/dashboard/*` remains the admin-only management console. When the React Native app ships, it will consume `/api/mobile/*` directly without touching admin routes.

### Why a BFF API Layer Instead of Direct Supabase from Mobile?

Mobile clients call Next.js API routes rather than Supabase directly. This provides:

- **Centralized business logic** — quiz grading, progress updates, and notification triggers happen server-side
- **Stable API contracts** — mobile app decouples from database schema changes
- **Role enforcement** — API routes validate sessions and apply rules before database access
- **Future flexibility** — rate limiting, caching, and payment gateway hooks can be added without mobile app updates

### Scaling Considerations

| Concern | Current Approach | Future Path |
| --- | --- | --- |
| **Multi-client support** | Single Next.js app with route namespaces | Extract shared types; mobile app consumes `/api/mobile/*` |
| **Content growth** | PostgreSQL with indexed queries, paginated admin lists | Add full-text search, CDN for media via Cloudinary |
| **Auth scale** | Supabase Auth with JWT + middleware | OAuth providers, magic links, institutional SSO |
| **Deployment** | Local development only | Vercel serverless with environment-based config |
| **Gamification** | Schema supports badges/points in types | Dedicated tables and API endpoints when prioritized |
| **Payments** | `has_subscription` boolean flag | Razorpay/Stripe integration with webhook handlers |
| **Public website** | CMS API ready | New `/` route group consuming `/api/public/cms` |
| **Caching** | Server Components fetch on demand | `unstable_cache`, ISR for CMS, API response caching |

### Design Principles

- **Fail-closed security** — Middleware and page guards redirect on missing sessions or unknown roles rather than allowing access
- **Colocation** — Page-specific components (e.g., `QuizCreator`, `QuizForm`) live alongside their routes for maintainability
- **Incremental delivery** — Student portal, mobile app, and public site can ship independently because the API layer and database schema are already in place
- **Type safety end-to-end** — TypeScript interfaces in `src/lib/types.ts` document domain models shared across UI and API layers

---

*Generated from the current state of the `french_learno` codebase. Last updated: September 2026.*
