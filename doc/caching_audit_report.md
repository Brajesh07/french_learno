# Caching and Loading Audit

Scope audited:

- `/src/app/temp/**/*`
- `/src/app/dashboard/**/*`
- Supporting auth/layout code that directly impacts these routes (`/src/components/auth/AuthProvider.tsx`, `/src/components/layout/DashboardLayout.tsx`, `/src/hooks/useAuth.ts`)

Date: 2026-07-10

---

## 1. Current caching situation

### 1.1 Are any `fetch()` calls using `cache`, `next.revalidate`, or `unstable_cache`?

Findings:

- No `fetch()` call in audited scope uses `cache`, `next: { revalidate }`, or `next: { tags }`.
- No usage of `unstable_cache` in audited scope.
- Only cache-related API found is `revalidatePath` in a server action:

```ts
// src/app/temp/dashboard/actions.ts
import { revalidatePath } from "next/cache";

revalidatePath("/temp/dashboard");
revalidatePath("/temp/dashboard/profile");
```

Implication:

- Network/database calls are effectively uncached at the app level in this scope.
- In `/temp/dashboard/*` server components, data is fetched via Supabase server client calls (not `fetch()`), so Next fetch cache controls are not being applied.

### 1.2 Are any server components passing data down to avoid duplicate fetches?

Findings:

- No shared server-level data layer in `/temp/dashboard/layout.tsx`; layout only renders children + nav.
- Each `/temp/dashboard/*` page fetches its own user/profile/content independently.
- No parent server component is passing fetched data to sibling tabs/routes to avoid duplicate queries.

Examples of repeated server-side Supabase reads:

- `/src/app/temp/dashboard/page.tsx`:
  - `supabase.auth.getUser()`
  - `supabase.from("profiles")...`
  - `admin.from("courses")...`
  - `admin.from("quizzes")...`
- `/src/app/temp/dashboard/courses/page.tsx`:
  - `supabase.auth.getUser()`
  - `supabase.from("profiles")...`
  - `admin.from("courses")...`
- `/src/app/temp/dashboard/quizzes/page.tsx`:
  - `supabase.auth.getUser()`
  - `supabase.from("profiles")...`
  - `supabase.from("quizzes")...`
  - `supabase.from("courses")...`
- `/src/app/temp/dashboard/profile/page.tsx`:
  - `supabase.auth.getUser()`
  - `supabase.from("profiles")...`
  - `supabase.from("user_progress")...count`
  - `supabase.from("quiz_attempts")...count`
  - `supabase.from("quiz_attempts").order("score")...`

### 1.3 Is there any client-side caching (localStorage, in-memory, SWR, React Query)?

Findings:

- No SWR/React Query/TanStack Query usage in audited scope.
- No route-data cache in memory stores for temp/admin dashboard data.
- Some component-local state exists (`useState`) but it is per-page lifecycle only and reset on unmount.
- `localStorage` is used in general utilities/theme, not for route data caching:
  - `/src/components/ui/ThemeProvider.tsx`
  - `/src/lib/utils.ts`

Conclusion:

- Effective data caching strategy for these routes is currently: **none**.

### 1.4 Every page/component that fetches data with exact `fetch()` call

Below are all `fetch()` call sites found in audited scope (plus `AuthProvider` because it drives dashboard auth/profile loading).

#### `/src/app/temp/login/page.tsx`

```ts
const res = await fetch(
  `/api/auth/lookup-email?username=${encodeURIComponent(email)}`,
);
```

```ts
await fetch("/api/auth/notify-login", {
  method: "POST",
  credentials: "include",
});
```

#### `/src/app/temp/dashboard/courses/[id]/CompleteButton.tsx`

```ts
const res = await fetch(`/api/mobile/courses/${courseId}/complete`, {
  method: "POST",
  credentials: "include",
});
```

#### `/src/app/temp/dashboard/quizzes/[id]/QuizForm.tsx`

```ts
const res = await fetch(`/api/mobile/quizzes/${quiz.id}/submit`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ answers }),
});
```

#### `/src/app/dashboard/page.tsx`

```ts
fetch("/api/admin/list-students?limit=1", { credentials: "include" });
fetch("/api/admin/courses?limit=1", { credentials: "include" });
fetch("/api/admin/courses?isPublished=true&limit=1", {
  credentials: "include",
});
fetch("/api/admin/quizzes?limit=1", { credentials: "include" });
fetch("/api/admin/list-students?limit=4", { credentials: "include" });
fetch("/api/admin/courses?limit=4", { credentials: "include" });
fetch("/api/admin/quizzes?limit=4", { credentials: "include" });
```

#### `/src/app/dashboard/students/page.tsx`

```ts
const res = await fetch("/api/admin/list-students", {
  headers: { Accept: "application/json" },
});
```

#### `/src/app/dashboard/students/[uid]/page.tsx`

```ts
const res = await fetch(`/api/admin/student/${resolvedParams.uid}`, {
  headers: { Accept: "application/json" },
});
```

```ts
const res = await fetch(`/api/admin/student/${resolvedParams.uid}`, {
  method: "PATCH",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(updates),
});
```

#### `/src/app/dashboard/courses/page.tsx`

```ts
const response = await fetch(`/api/admin/courses?${params}`, {
  headers: { Accept: "application/json" },
});
```

```ts
const response = await fetch(`/api/admin/courses/${courseId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ isPublished: !currentStatus }),
});
```

#### `/src/app/dashboard/courses/[id]/page.tsx`

```ts
const response = await fetch(`/api/admin/courses/${courseId}`, {
  credentials: "include",
});
```

#### `/src/app/dashboard/courses/create/page.tsx`

```ts
const response = await fetch(`/api/admin/courses/${id}`, {
  credentials: "include",
});
```

```ts
const response = await fetch(url, {
  method,
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify(formData),
});
```

#### `/src/app/dashboard/quizzes/page.tsx`

```ts
const response = await fetch(`/api/admin/quizzes?${params}`, {
  credentials: "include",
});
```

```ts
const response = await fetch(`/api/admin/quizzes/${quizId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ is_published: !currentStatus }),
});
```

#### `/src/app/dashboard/quizzes/[id]/page.tsx`

```ts
const response = await fetch(`/api/admin/quizzes/${quizId}`, {
  credentials: "include",
});
```

#### `/src/app/dashboard/quizzes/create/page.tsx`

```ts
const response = await fetch(`/api/admin/courses/${id}`, {
  credentials: "include",
});
```

#### `/src/app/dashboard/quizzes/QuizCreator.tsx`

```ts
const response = await fetch("/api/admin/courses?limit=100", {
  credentials: "include",
});
```

```ts
const response = await fetch(`/api/admin/quizzes/${quizId}`, {
  credentials: "include",
});
```

```ts
const response = await fetch(url, {
  method,
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify(submissionData),
});
```

#### `/src/app/dashboard/notifications/page.tsx`

```ts
const res = await fetch("/api/admin/notifications?limit=50");
```

```ts
await fetch("/api/admin/notifications", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ markAllRead: true }),
});
```

#### `/src/app/dashboard/analytics/page.tsx`

```ts
const res = await fetch("/api/admin/analytics/kpis", {
  credentials: "include",
});
```

```ts
const res = await fetch(`/api/admin/analytics/activity?range=${range}`, {
  credentials: "include",
});
```

```ts
const res = await fetch("/api/admin/analytics/subscriptions", {
  credentials: "include",
});
```

```ts
const res = await fetch("/api/admin/analytics/quiz-performance", {
  credentials: "include",
});
```

```ts
const res = await fetch("/api/admin/analytics/level-distribution", {
  credentials: "include",
});
```

#### `/src/components/auth/AuthProvider.tsx` (impacts dashboard session/profile loading)

```ts
const res = await fetch("/api/auth/profile", {
  headers: { Authorization: `Bearer ${accessToken}` },
});
```

```ts
const res = await fetch(
  `/api/auth/lookup-email?username=${encodeURIComponent(email)}`,
);
```

---

## 2. Duplicate / redundant fetches

### 2.1 Same endpoints called multiple times across navigations/pages

Yes. Repeated endpoint usage exists in several places:

- `/api/admin/courses/:id`
  - `/dashboard/courses/[id]/page.tsx`
  - `/dashboard/courses/create/page.tsx` (edit mode prefill)
  - `/dashboard/quizzes/create/page.tsx` (course info banner)
- `/api/admin/quizzes/:id`
  - `/dashboard/quizzes/[id]/page.tsx`
  - `/dashboard/quizzes/QuizCreator.tsx` (edit mode)
- `/api/admin/courses?...`
  - `/dashboard/page.tsx` (counts + activity feed)
  - `/dashboard/courses/page.tsx` (table)
  - `/dashboard/quizzes/QuizCreator.tsx` (`limit=100`)
- `/api/admin/list-students...`
  - `/dashboard/page.tsx` (counts + activity feed)
  - `/dashboard/students/page.tsx` (full list)

Within single pages there are also redundant count/list patterns:

- `/dashboard/page.tsx` performs two calls to each resource class for counts and recent activity snapshots.

### 2.2 Bottom-nav tab switching in `/temp/dashboard/*`

Tabs examined:

- `/temp/dashboard`
- `/temp/dashboard/courses`
- `/temp/dashboard/quizzes`
- `/temp/dashboard/profile`

Result:

- Yes, switching tabs will re-run server data queries on the destination page.
- Reasons:
  - Data for each tab is fetched inside the tab page itself (no shared server data boundary in layout).
  - No Next cache directives (`fetch` cache options or `unstable_cache`) are used.
  - Repeated auth/profile queries exist in every tab page.

Repeated query patterns on tab switch:

- `supabase.auth.getUser()` repeats in all 4 tabs.
- `profiles` query repeats in all 4 tabs.
- `courses` data fetched in both Home and Courses tabs.
- `quizzes` data fetched in both Home and Quizzes tabs.

---

## 3. Loading states

### 3.1 Pages/components with explicit loading feedback

Temp routes:

- `/src/app/temp/login/page.tsx`: submit button loading state.
- `/src/app/temp/signup/page.tsx`: submit button loading state.
- `/src/app/temp/dashboard/courses/[id]/CompleteButton.tsx`: spinner + button disabled while submit.
- `/src/app/temp/dashboard/quizzes/[id]/QuizForm.tsx`: submit button pending state.
- `/src/app/temp/dashboard/profile/ProfileEditForm.tsx`: saving button state.
- `/src/app/temp/dashboard/ProfileSection.tsx`: saving state in edit form.

Main dashboard:

- `/src/app/dashboard/layout.tsx`: full-page auth check spinner.
- `/src/components/layout/DashboardLayout.tsx`: temporary `null` render until mounted (no visual loader).
- `/src/app/dashboard/page.tsx`: card skeletons + activity skeletons.
- `/src/app/dashboard/students/page.tsx`: centered spinner.
- `/src/app/dashboard/students/[uid]/page.tsx`: centered spinner.
- `/src/app/dashboard/courses/page.tsx`: skeleton table.
- `/src/app/dashboard/courses/[id]/page.tsx`: skeleton state.
- `/src/app/dashboard/courses/[id]/edit/page.tsx`: redirect skeleton.
- `/src/app/dashboard/courses/create/page.tsx`: edit-mode skeleton.
- `/src/app/dashboard/quizzes/page.tsx`: skeleton table.
- `/src/app/dashboard/quizzes/[id]/page.tsx`: skeleton state.
- `/src/app/dashboard/quizzes/create/page.tsx`: loading spinner when course preselected.
- `/src/app/dashboard/quizzes/QuizCreator.tsx`: loading spinner for edit mode fetch.
- `/src/app/dashboard/notifications/page.tsx`: list skeleton.
- `/src/app/dashboard/analytics/page.tsx`: per-widget skeletons.

### 3.2 Pages with no route-level loading feedback (no `loading.tsx` / no skeleton while route data resolves)

No `loading.tsx` files were found under either `/src/app/temp` or `/src/app/dashboard`.

Pages with server-side data work but no explicit route transition loader:

- `/src/app/temp/dashboard/page.tsx`
- `/src/app/temp/dashboard/courses/page.tsx`
- `/src/app/temp/dashboard/courses/[id]/page.tsx`
- `/src/app/temp/dashboard/quizzes/page.tsx`
- `/src/app/temp/dashboard/quizzes/[id]/page.tsx`
- `/src/app/temp/dashboard/profile/page.tsx`

User-facing behavior risk:

- During tab/page transitions in temp dashboard, users get no dedicated loading skeleton for incoming route content.

Additional blank-screen risk in admin:

- `/src/components/layout/DashboardLayout.tsx` returns `null` before `isMounted` is set, which can show a brief blank frame.

---

## 4. Recommendations

### 4.1 Page-by-page caching plan

#### Temp student dashboard tabs

- `/temp/dashboard`
  - Cache target: published courses list, published quizzes list.
  - TTL: 60s to 300s (content usually not second-by-second).
  - Type: server-side `unstable_cache` around Supabase list queries (or route handlers with `fetch` + `next.revalidate`).
  - Do not cache: user auth/session check, user profile fields that can change immediately after profile edit.

- `/temp/dashboard/courses`
  - Cache target: published course catalog.
  - TTL: 300s.
  - Type: `unstable_cache` (key by published status) or cached route handler.
  - Do not cache: `has_subscription` for current user for long periods; keep short or no cache.

- `/temp/dashboard/quizzes`
  - Cache target: published quizzes + published course title map.
  - TTL: 120s to 300s.
  - Type: `unstable_cache` for quiz/course catalog lookups.
  - Do not cache: current user subscription guard for long periods.

- `/temp/dashboard/profile`
  - Cache target: mostly user-scoped metrics are volatile (`user_progress`, `quiz_attempts`); keep minimal caching.
  - TTL: 15s to 60s if cached at all.
  - Type: short-lived `unstable_cache` for expensive aggregates only.
  - Do not cache strongly: profile/account details right after edits.

- `/temp/dashboard/courses/[id]`
  - Cache target: course content body/media and quiz list for that course.
  - TTL: 300s.
  - Type: `unstable_cache` for published course payload by `id` and related published quizzes.
  - Do not cache: `user_progress.completed` (user-specific and updated by complete action).

- `/temp/dashboard/quizzes/[id]`
  - Cache target: quiz metadata, question list, answer options (published).
  - TTL: 300s.
  - Type: `unstable_cache` for quiz structure by `id`.
  - Do not cache: quiz submission result path (`/api/mobile/quizzes/:id/submit`).

#### Main admin dashboard

- `/dashboard` (overview)
  - Cache target: count/list endpoints (`list-students`, `courses`, `quizzes`) used for cards/activity.
  - TTL: 30s to 120s.
  - Type: client-side cache (SWR/React Query) recommended to dedupe and share between cards/activity; optionally consolidate into one backend summary endpoint.

- `/dashboard/courses`
  - Cache target: paginated course list and filter/sort combinations.
  - TTL: 30s to 60s.
  - Type: client-side cache keyed by query params via SWR/React Query.

- `/dashboard/courses/[id]`
  - Cache target: course details + related quizzes.
  - TTL: 60s to 300s.
  - Type: client-side cache keyed by `courseId`.

- `/dashboard/courses/create` (edit mode)
  - Cache target: prefill fetch `/api/admin/courses/:id`.
  - TTL: 30s to 60s.
  - Type: client-side cache to avoid repeated prefill fetch when moving between edit/preview flows.

- `/dashboard/quizzes`
  - Cache target: paginated quiz list/filter combinations.
  - TTL: 30s to 60s.
  - Type: client-side cache keyed by params.

- `/dashboard/quizzes/[id]`
  - Cache target: quiz detail payload.
  - TTL: 60s to 300s.
  - Type: client-side cache keyed by `quizId`.

- `/dashboard/quizzes/create` and `QuizCreator`
  - Cache target: `/api/admin/courses?limit=100`, `/api/admin/quizzes/:id`.
  - TTL: 60s.
  - Type: client-side cache to avoid re-fetching course options and quiz edit payload on small navigation hops.

- `/dashboard/students`
  - Cache target: student list.
  - TTL: 30s to 120s.
  - Type: client-side cache.

- `/dashboard/students/[uid]`
  - Cache target: student details.
  - TTL: 30s.
  - Type: client-side cache keyed by `uid`; invalidate after PATCH.

- `/dashboard/notifications`
  - Cache target: latest notification list.
  - TTL: 10s to 30s (high-change feed).
  - Type: client-side cache + manual refresh/invalidate on mark-all-read.

- `/dashboard/analytics`
  - Cache target: all analytics endpoints.
  - TTL: 60s to 300s by widget.
  - Type: client-side cache strongly recommended; analytics is ideal for stale-while-revalidate UX.

### 4.2 Pages that need skeleton loaders added

Priority 1 (visible route transitions with server data and no `loading.tsx`):

- `/src/app/temp/dashboard/page.tsx`
- `/src/app/temp/dashboard/courses/page.tsx`
- `/src/app/temp/dashboard/quizzes/page.tsx`
- `/src/app/temp/dashboard/profile/page.tsx`
- `/src/app/temp/dashboard/courses/[id]/page.tsx`
- `/src/app/temp/dashboard/quizzes/[id]/page.tsx`

Priority 2:

- Add segment-level `loading.tsx` under `/src/app/temp/dashboard` (and optionally nested segments) so bottom-nav tab switches show immediate feedback.

Priority 3:

- Replace initial `null` render in `/src/components/layout/DashboardLayout.tsx` with a lightweight shell/skeleton to remove brief blank frame.

---

## Summary

- Current state: no effective caching strategy for dashboard/temp data flows.
- Duplicate data retrieval is present across both temp tabs and admin pages.
- Main admin has good in-page loading states; temp routes rely on server render without route-level loading feedback.
- Highest impact improvements: introduce caching for repeated list/detail queries, and add `loading.tsx` for `/temp/dashboard` segments.
