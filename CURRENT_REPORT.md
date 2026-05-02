# FrenchLearno — Current Status Report

**Date:** 2 May 2026
**Source:** Full codebase scan

---

## 1. Project Overview

A French language learning platform with:
- **Admin dashboard** (Next.js web app) — manage courses, quizzes, students, CMS content
- **Mobile app API layer** — REST endpoints for a React Native app (app itself not yet built)
- **Public CMS API** — serves showcase/marketing content
- **Temporary `/temp` routes** — isolated Supabase auth flow for testing before mobile integration

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15.5.9 (App Router, Turbopack), React 19 |
| Auth | Supabase Auth + `@supabase/ssr` |
| Database | Supabase (PostgreSQL) with RLS |
| Styling | Tailwind CSS, `@headlessui/react`, `@heroicons/react` |
| Media | Cloudinary (`next-cloudinary`) |
| Forms | `react-hook-form` + `yup` |
| Rich text | Custom `SimpleRichTextEditor` component |
| Utilities | `date-fns`, `uuid`, `clsx`, `tailwind-merge` |

---

## 3. Authentication Status

| Feature | Status | Notes |
|---|---|---|
| Login page (`/login`) | ✅ Built | Supports email OR username login |
| Signup page | ❌ Not in main app | Only exists under `/temp/signup` |
| Email verification | ⚠️ Unknown | Depends on Supabase project settings |
| Auth flow type | Supabase `signInWithPassword` | |
| Session refresh | ✅ Built | Middleware refreshes cookies on every request |
| Protected routes | ✅ Built | `/dashboard/*` redirects unauthenticated users to `/login` |
| `AuthProvider` context | ✅ Built | Fetches profile via `/api/auth/profile` on session change |
| Logout | ✅ Built | `POST /api/auth/logout` |
| Admin role check | ✅ Built | `requireAdmin()` in `auth-helpers.ts` checks `profiles.role = 'admin'` |

---

## 4. Database & Supabase

### Connection Status
- `.env.local` contains **placeholder values** — `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not real credentials
- `SUPABASE_SERVICE_ROLE_KEY` — present in `.env.local` (real value set)

### Tables (all in `001_initial_schema.sql`)

| Table | RLS | Notes |
|---|---|---|
| `profiles` | ✅ Enabled | Users read/update own; Admins read all (recursive policy — may fail) |
| `courses` | ✅ Enabled | Public read if published; Admins full access |
| `quizzes` | ✅ Enabled | Public read if published; Admins full access |
| `quiz_questions` | ✅ Enabled | Admins full; Students read if quiz published |
| `quiz_answers` | ✅ Enabled | Admins full; Students read all (is_correct exposed at RLS level) |
| `quiz_attempts` | ✅ Enabled | Users read/insert own; Admins read all |
| `user_progress` | ✅ Enabled | Users full access own; Admins read all |
| `subscriptions` | ✅ Enabled | Users read own; Admins full access |
| `showcase_content` | ✅ Enabled | Public read if is_visible=true; Admins full |

### Migrations
- `supabase/migrations/001_initial_schema.sql` — ✅ exists, all 9 tables defined
- Seed data — 4 `showcase_content` rows seeded inside the migration

---

## 5. Admin Dashboard

### Pages

| Page | Status | Notes |
|---|---|---|
| `/dashboard` (home) | ⚠️ Partial | Renders with hardcoded mock stats — no real API calls |
| `/dashboard/courses` | ✅ Built | List with search, level filter, pagination |
| `/dashboard/courses/create` | ✅ Built | Create + edit via `?courseId=` query param |
| `/dashboard/courses/[id]` | ✅ Built | Detail/preview page |
| `/dashboard/courses/[id]/edit` | ✅ Built | Redirect shim only — passes to create page |
| `/dashboard/quizzes` | ✅ Built | List with filters |
| `/dashboard/quizzes/create` | ✅ Built | Full quiz builder (QuizCreator, QuizQuestionForm, QuizPreview) |
| `/dashboard/quizzes/[id]` | ✅ Built | Quiz preview page |
| `/dashboard/students` | ✅ Built | Table fetching from `/api/admin/list-students` |
| `/dashboard/students/[uid]` | ✅ Built | Calls `GET/PATCH /api/admin/student/[uid]` |
| `/dashboard/analytics` | ❌ Missing | Sidebar links to it — returns Next.js 404 |
| `/dashboard/cms` | ❌ Missing | CMS API exists but no editor UI page |

### Known Issues
- Dashboard home stats are hardcoded (`"1,234 students"`, `"45 courses"`, etc.)
- `isActive` and `hasSubscription` fields on student detail have no backing columns in `profiles` — API returns safe defaults; toggle UI works but changes do not persist
- `students/index.tsx` exists but is completely empty

---

## 6. Temporary Auth System (`/temp`)

All routes are **fully isolated** — middleware does not protect them, they do not touch main app auth.

| Route | Status | Notes |
|---|---|---|
| `/temp/signup` | ✅ Built | `signUp()` with name/username stored in `user_metadata`; no DB insert at signup |
| `/temp/login` | ✅ Built | `signInWithPassword()` → redirects to `/temp/dashboard` |
| `/temp/dashboard` | ✅ Built | Server component; lazy-creates `profiles` row on first visit via admin client if missing |

**Profile creation flow:**
1. Signup stores `name` and `username` in `auth.user_metadata`
2. On first `/temp/dashboard` visit, server checks for existing profile
3. If missing → inserts via `createAdminClient()` (bypasses INSERT RLS gap)
4. Defaults: `role = 'student'`, username falls back to email prefix if metadata empty

---

## 7. API Layer

### Admin APIs (`/api/admin/`)

| Route | Methods | Client Used | Notes |
|---|---|---|---|
| `/api/admin/list-students` | GET | Admin (service role) | Queries `profiles` where `role = 'student'`; paginated + searchable |
| `/api/admin/student/[uid]` | GET, PATCH | Admin (service role) | GET: auth metadata + profile; PATCH: reflects toggle but no schema columns yet |
| `/api/admin/courses` | GET, POST | Server (session) | Paginated list + create |
| `/api/admin/courses/[id]` | GET, PATCH, DELETE | Server (session) | Single course CRUD |
| `/api/admin/quizzes` | GET, POST | Server (session) | Paginated list + create |
| `/api/admin/quizzes/[id]` | GET, PATCH, DELETE | Server (session) | Single quiz CRUD |
| `/api/admin/cms` | GET | Server (session) | List `showcase_content` sections |
| `/api/admin/cms/[section_key]` | GET, PATCH | Server (session) | Read/update single CMS section |

### Auth APIs (`/api/auth/`)

| Route | Methods | Notes |
|---|---|---|
| `/api/auth/login` | GET | Returns current user session + profile |
| `/api/auth/logout` | POST | Signs out via Supabase |
| `/api/auth/profile` | GET | Fetches profile by user id; used by AuthProvider on every session event |

### Mobile APIs (`/api/mobile/`)

| Route | Methods | Notes |
|---|---|---|
| `/api/mobile/courses` | GET | Public course list |
| `/api/mobile/quizzes` | GET | Public quiz list |
| `/api/mobile/quizzes/[id]` | GET | Single quiz — `is_correct` not exposed |
| `/api/mobile/quizzes/[id]/submit` | POST | Server-side scoring; stores `quiz_attempts` row |

### Public APIs (`/api/public/`)

| Route | Methods | Notes |
|---|---|---|
| `/api/public/cms` | GET | Returns `showcase_content` where `is_visible = true` |

---

## 8. Mobile App Status

- **React Native app:** ❌ Does not exist — no `/mobile` folder
- **Backend APIs:** ✅ All 4 mobile endpoints are built and ready
- **Shared logic:** None yet — no shared types between Next.js and React Native

---

## 9. Known Issues / Bugs

### 🔴 Critical

| # | Issue |
|---|---|
| 1 | **Supabase not connected** — `.env.local` `NEXT_PUBLIC_SUPABASE_URL` and anon key are placeholders. No API call will work until real values are filled in. |
| 2 | **`profiles` RLS has no INSERT policy** — client-side inserts will always fail with 401/403. The `/temp` flow correctly works around this using `createAdminClient()`. Any other signup flow that tries to insert directly from the browser will fail. |
| 3 | **Recursive `profiles` RLS policy** — "Admins can read all profiles" does a self-referencing subquery. This can cause infinite recursion or return 0 rows. All admin reads of `profiles` should use the admin client (already fixed for list-students). |

### 🟡 Data / Logic

| # | Issue |
|---|---|
| 4 | **`types.ts` is stale and misaligned** — `User`, `Student`, `Course`, `Quiz` interfaces contain fields that do not exist in the database (`parentEmail`, `badges`, `level` on Quiz, `order`, `prerequisites`, nested `content` object on Course). These types are not used consistently. |
| 5 | **Course form sends wrong field names** — create/edit form may use nested `content.text` instead of flat `content_text`. Needs verification. |
| 6 | **`isActive` / `hasSubscription` not in schema** — student detail page toggles these but they have no backing columns. Changes are lost on page refresh. |
| 7 | **Dashboard home stats are hardcoded** — "1,234 students", "45 courses", "87% completion" etc. are mock values. |
| 8 | **`sortBy` / `sortOrder` params ignored by API** — courses and quizzes list pages send sort params that the API routes do not read. |

### 🟠 Missing Pages / Navigation

| # | Issue |
|---|---|
| 9 | **`/dashboard/analytics` does not exist** — sidebar link causes 404 |
| 10 | **`/dashboard/cms` does not exist** — CMS API is fully built but there is no editor UI |

---

## 10. Completed vs Pending

### ✅ Completed

- Supabase schema: all 9 tables, RLS policies, triggers
- Admin auth: login, logout, session refresh, `requireAdmin` guard
- Admin middleware: protected routes, cookie refresh
- Admin courses: full CRUD API + list/create/detail/edit pages
- Admin quizzes: full CRUD API + list/create/detail pages + builder components
- Admin students: list API (admin client) + student detail API (GET/PATCH)
- Admin CMS: read/update API for showcase_content
- Mobile APIs: courses list, quizzes list, quiz detail (no answers), quiz submit with scoring
- Public CMS API
- `/temp` auth testing flow (signup → login → dashboard with lazy profile creation)
- `AuthProvider` with profile fetch and username-based login
- `DashboardLayout`, `Header`, `Sidebar`, shared UI components

### ❌ Pending / Broken

- Real Supabase credentials in `.env.local`
- `/dashboard/analytics` page + API
- `/dashboard/cms` editor UI page
- Dashboard home: replace mock stats with real data
- `isActive` / `hasSubscription` columns in `profiles` (or separate table)
- Fix or remove stale `types.ts` interfaces
- Verify course form field name alignment (`content_text` vs nested `content.text`)
- React Native mobile app (entire `/mobile` project)
- Production Supabase project setup
- `students/index.tsx` — empty file, should be deleted

---

## 11. Next Recommended Steps

1. **Fill in real Supabase credentials** in `.env.local` — nothing works without this
2. **Build `/dashboard/analytics`** — sidebar link is broken, basic stats page needed
3. **Build `/dashboard/cms`** — API is ready, just needs a UI form to edit sections
4. **Connect dashboard home to real data** — replace hardcoded stats with API calls
5. **Audit course create/edit form** — verify field names match the flat snake_case API
6. **Add `is_active` column to `profiles`** (or a `subscriptions` row) — required for student management toggles to persist
7. **Clean up `types.ts`** — align interfaces with actual database schema
8. **Delete `src/app/dashboard/students/index.tsx`** — empty file
9. **Begin React Native app** — mobile API layer is ready to consume


---

## 1. What Is Built

### Phase 1 — Foundation

| Item                                                 | Status           | Notes                                                                                                                                                   |
| ---------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase schema migration (`001_initial_schema.sql`) | ✅ Complete      | All 9 tables: `profiles`, `courses`, `quizzes`, `quiz_questions`, `quiz_answers`, `quiz_attempts`, `user_progress`, `subscriptions`, `showcase_content` |
| RLS policies                                         | ✅ Complete      | Policies on all tables (read/write per role)                                                                                                            |
| Seed data                                            | ❌ Missing       | No seed file exists anywhere                                                                                                                            |
| Supabase connection                                  | ❌ Not connected | `env.local` contains only placeholder values                                                                                                            |

---

### Phase 2 — Admin Dashboard

#### Auth

| Item                                                | Status   |
| --------------------------------------------------- | -------- |
| Login page (`/login`)                               | ✅ Built |
| `LoginForm` component (email OR username)           | ✅ Built |
| `AuthProvider` (React Context + Supabase session)   | ✅ Built |
| `useAuth`, `useRequireAuth`, `useRequireRole` hooks | ✅ Built |
| Session refresh middleware                          | ✅ Built |
| Protected route guard (`/dashboard` redirect)       | ✅ Built |
| Logout API (`POST /api/auth/logout`)                | ✅ Built |
| Session check API (`GET /api/auth/login`)           | ✅ Built |

#### Course Management

| Item                                                               | Status                      |
| ------------------------------------------------------------------ | --------------------------- |
| `GET/POST /api/admin/courses`                                      | ✅ Built                    |
| `GET/PATCH/DELETE /api/admin/courses/[id]`                         | ✅ Built                    |
| `/dashboard/courses` — list with search, level filter, pagination  | ✅ Built                    |
| `/dashboard/courses/create` — create + edit (via `?courseId=`)     | ✅ Built                    |
| `/dashboard/courses/[id]` — detail/preview page                    | ✅ Built                    |
| `/dashboard/courses/[id]/edit` — redirects to create with courseId | ✅ Built (redirect pattern) |

#### Quiz Management

| Item                                                         | Status   |
| ------------------------------------------------------------ | -------- |
| `GET/POST /api/admin/quizzes`                                | ✅ Built |
| `GET/PATCH/DELETE /api/admin/quizzes/[id]`                   | ✅ Built |
| `/dashboard/quizzes` — list with filters                     | ✅ Built |
| `/dashboard/quizzes/create` — full quiz builder              | ✅ Built |
| `/dashboard/quizzes/[id]` — quiz preview page                | ✅ Built |
| `QuizCreator.tsx`, `QuizPreview.tsx`, `QuizQuestionForm.tsx` | ✅ Built |

#### Student Management

| Item                                                               | Status                                             |
| ------------------------------------------------------------------ | -------------------------------------------------- |
| `GET /api/admin/list-students` (paginated, searchable)             | ✅ Built                                           |
| `/dashboard/students` — student list table                         | ✅ Built (partial — see Issues)                    |
| `/dashboard/students/[uid]` — student detail + subscription toggle | ✅ Built (partial — see Issues)                    |
| `GET/PATCH /api/admin/student/[uid]`                               | ❌ Missing — called by UI but route does not exist |

#### CMS Editor

| Item                                     | Status                      |
| ---------------------------------------- | --------------------------- |
| `GET /api/admin/cms`                     | ✅ Built                    |
| `GET/PATCH /api/admin/cms/[section_key]` | ✅ Built                    |
| `/dashboard/cms` — frontend editor UI    | ❌ Missing — no page exists |

#### Analytics

| Item                                  | Status                                                   |
| ------------------------------------- | -------------------------------------------------------- |
| `/dashboard/analytics` — page         | ❌ Missing — sidebar links to it but page does not exist |
| `/api/admin/analytics` — API endpoint | ❌ Missing                                               |
| Dashboard main page stats             | ⚠️ Hardcoded mock data — no real API calls               |

#### Shared Infrastructure

| Item                                                                | Status   |
| ------------------------------------------------------------------- | -------- |
| Supabase server client (`createClient`, `createAdminClient`)        | ✅ Built |
| Supabase browser client                                             | ✅ Built |
| `requireAdmin` auth helper                                          | ✅ Built |
| `DashboardLayout`, `Header`, `Sidebar` components                   | ✅ Built |
| `Button`, `Input`, `Textarea`, `SimpleRichTextEditor` UI components | ✅ Built |
| `ThemeProvider` (light/dark)                                        | ✅ Built |

---

### Phase 3 — Mobile App (Backend APIs only)

| Item                                                          | Status                                           |
| ------------------------------------------------------------- | ------------------------------------------------ |
| `GET /api/mobile/courses`                                     | ✅ Built                                         |
| `GET /api/mobile/quizzes`                                     | ✅ Built                                         |
| `GET /api/mobile/quizzes/[id]` (without `is_correct` exposed) | ✅ Built                                         |
| `POST /api/mobile/quizzes/[id]/submit` (server-side scoring)  | ✅ Built                                         |
| React Native app (`/mobile` folder)                           | ❌ Does not exist — entire mobile app is missing |

---

### Phase 4 — Public Website

| Item                                                | Status            |
| --------------------------------------------------- | ----------------- |
| `GET /api/public/cms` (public CMS content endpoint) | ✅ Built          |
| Public Next.js site (`/web` folder)                 | ❌ Does not exist |
| `/` — developer portfolio page                      | ❌ Missing        |
| `/contact` — contact form                           | ❌ Missing        |
| `/french-learning` — CMS-driven showcase page       | ❌ Missing        |

---

### Phase 5 — Production

| Item                                     | Status                                           |
| ---------------------------------------- | ------------------------------------------------ |
| Staging Supabase credentials             | ❌ Not configured (`env.local` has placeholders) |
| `SUPABASE_SERVICE_ROLE_KEY` env variable | ❌ Not set (admin client will fail)              |
| Production Supabase project              | ❌ Not set up                                    |

---

## 2. Partial / Incomplete Items

| File                                           | Issue                                                     |
| ---------------------------------------------- | --------------------------------------------------------- |
| `src/app/dashboard/students/index.tsx`         | Completely empty — appears to be an abandoned placeholder |
| `src/app/dashboard/page.tsx`                   | Shows mock hardcoded stats — should fetch from real API   |
| `src/app/dashboard/courses/[id]/edit/page.tsx` | Only a redirect shim — no real edit form of its own       |

---

## 3. Bugs & Inconsistencies

### 🔴 Critical — Will Cause Runtime Failures

**1. Missing API Route: `/api/admin/student/[uid]`**  
`/dashboard/students/[uid]/page.tsx` calls both `GET /api/admin/student/${uid}` and `PATCH /api/admin/student/${uid}`. Neither route file exists. Visiting any student detail page will result in a 404 API error.

**2. Student List Type Mismatch (Firebase ↔ Supabase)**  
`/dashboard/students/page.tsx` uses an interface with `uid`, `creationTime`, `lastSignInTime` — fields from the **Firebase Admin SDK** that never existed in this project. The actual API (`/api/admin/list-students`) returns `id`, `name`, `username`, `email`, `phone`, `class`, `created_at`. The student list table will display empty or broken data.

**3. `SUPABASE_SERVICE_ROLE_KEY` Not Set**  
`src/lib/supabase/server.ts` uses `process.env.SUPABASE_SERVICE_ROLE_KEY` in `createAdminClient()`. This key is not present in `env.local`. Any route that calls `createAdminClient()` will fail silently or produce an invalid client.

---

### 🟡 Data Model Mismatches

**4. Course Form Sends Wrong Field Names**  
`/dashboard/courses/create/page.tsx` builds a payload using a nested `content` object:

```ts
content: {
  (text, audioUrl, videoUrl, imageUrl);
}
```

But the API and database use flat snake_case fields:

```ts
(content_text, content_audio_url, content_video_url, content_image_url);
```

Course creation and editing will silently save empty content.

**5. `types.ts` Has Stale / Misaligned Types**

- `User` type has `role: 'admin' | 'superadmin' | 'teacher'` — schema only allows `'student' | 'admin'`
- `Student` has `parentEmail`, `badges`, `level: FrenchLevel` — none of these columns exist in the `profiles` table
- `Course` has `order`, `prerequisites`, `estimatedDuration`, `createdBy`, and nested `content` object — none match the database schema
- `Quiz` has a `level` field — no such column exists in the `quizzes` table
- These stale types cause frontend forms to send/expect fields that the API and DB do not recognize

**6. Course Detail Page Expects Non-Existent Fields**  
`/dashboard/courses/[id]/page.tsx` maps over `data.course.createdAt` and `data.course.updatedAt` (camelCase). The API returns `created_at` (snake_case). Date conversion will fail.

---

### 🟠 Missing Pages Linked From Navigation

**7. Analytics Page Not Built**  
`Sidebar.tsx` links to `/dashboard/analytics`, which does not exist. Clicking it will return a Next.js 404.

**8. No CMS Editor UI**  
The admin CMS API is fully built, but `/dashboard/cms` page does not exist. Admins have no way to edit showcase content from the dashboard.

---

### 🟡 Minor Issues

**9. Dashboard Stats Are Mock Data**  
`/dashboard/page.tsx` hardcodes stats ("1,234 students", "45 courses", etc.). No real data is fetched.

**10. `sortBy`/`sortOrder` Params Sent But Not Handled by API**  
The courses and quizzes list pages send `sortBy` and `sortOrder` query params to the API, but the API routes do not read or apply these — they always sort by `created_at` descending.

**11. `students/index.tsx` Is Empty**  
This file exists but has no content. It should either be removed or populated.

---

## 4. Summary by Phase

| Phase                           | Status      | Completion                                                                                                        |
| ------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| Phase 1 — Foundation (DB + RLS) | Partial     | ~80% — schema + RLS done, no seed data, no live connection                                                        |
| Phase 2 — Admin Dashboard       | Partial     | ~65% — auth + CRUD APIs solid, student detail broken, analytics + CMS UI missing, mock dashboard, data model bugs |
| Phase 3 — Mobile App            | Partial     | ~20% — backend APIs ready, no React Native app                                                                    |
| Phase 4 — Public Website        | Not started | ~5% — only the public CMS API exists                                                                              |
| Phase 5 — Production            | Not started | 0%                                                                                                                |

---

## 5. Recommended Next Steps

1. **Connect Supabase** — fill in `env.local` with real staging project credentials (including `SUPABASE_SERVICE_ROLE_KEY`)
2. **Fix student detail** — create `/api/admin/student/[uid]` (GET + PATCH) using Supabase
3. **Fix student list** — update the `Student` interface to match the Supabase `profiles` schema
4. **Fix course form** — align form field names with the API/DB (flat snake_case)
5. **Clean up `types.ts`** — remove stale types and align all interfaces with the Supabase schema
6. **Build `/dashboard/cms`** — CMS editor UI (API is already done)
7. **Build `/dashboard/analytics`** — basic stats page + API endpoint
8. **Connect real data to dashboard home** — replace mock stats with real queries
9. **Add seed data** — admin user + sample courses + quizzes
10. **Begin mobile app** — React Native project setup

---

**Which phase would you like to continue building?**
