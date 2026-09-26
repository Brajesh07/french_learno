# RBAC Audit Report

Date: 2026-07-10

Scope audited:

- Middleware: `src/middleware.ts`
- Auth and login flows: `src/app/login/page.tsx`, `src/components/auth/LoginForm.tsx`, `src/components/auth/AuthProvider.tsx`, `src/app/temp/login/page.tsx`
- Temp student routes: `src/app/temp/dashboard/**/*`, `src/app/temp/login/page.tsx`, `src/app/temp/signup/page.tsx`
- Admin routes: `src/app/dashboard/**/*`
- API routes: `src/app/api/admin/**/*`, `src/app/api/mobile/**/*`, `src/lib/supabase/auth-helpers.ts`
- Schema docs/migrations for role field: `supabase/migrations/001_initial_schema.sql`, `supabase/migrations/002_add_student_fields.sql`, `doc/03_database_schema.md`

---

## 1. Current middleware behavior

## What `src/middleware.ts` checks

Current checks in `src/middleware.ts`:

```ts
const { data } = await supabase.auth.getUser();
user = data.user;

const isProtectedRoute = pathname.startsWith("/dashboard");
const isAuthRoute = pathname.startsWith("/login");
const isTempProtectedRoute = pathname.startsWith("/temp/dashboard");

if (isProtectedRoute && !user) {
  return NextResponse.redirect(new URL("/login", request.url));
}

if (isAuthRoute && user) {
  return NextResponse.redirect(new URL("/dashboard", request.url));
}

if (isTempProtectedRoute && !user) {
  return NextResponse.redirect(new URL("/temp/login", request.url));
}
```

Finding:

- Middleware verifies **session existence only** (`user` truthy/falsy).
- Middleware does **not** verify profile role (`admin`/`student`).

## Which routes are protected and how

- `/dashboard*`: requires a session; otherwise redirect to `/login`.
- `/temp/dashboard*`: requires a session; otherwise redirect to `/temp/login`.
- `/login*`: if already authenticated (any role), redirect to `/dashboard`.
- Matcher applies to almost all app routes except static/image/public assets.

---

## 2. Role check audit per route group

## `/temp/login` and `/temp/signup`

### Role checks after login?

- `/temp/login` (`src/app/temp/login/page.tsx`) does **not** check role.
- On success it always does:

```ts
router.push("/temp/dashboard");
```

- `/temp/signup` only creates account and redirects to `/temp/login`; no role routing.

Conclusion:

- No role-based redirecting in temp auth pages.

## `/temp/dashboard/*`

### Is there role check blocking admins from student pages?

Finding: **No** role-based admin block.

- Pages verify session via `supabase.auth.getUser()` and redirect only when missing user.
- They query profile mainly for `has_subscription` and display data.
- No `if (profile.role !== "student")` guard exists in temp dashboard pages.

Example from `src/app/temp/dashboard/page.tsx`:

```ts
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) redirect("/temp/login");

const { data: existingProfile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", user.id)
  .maybeSingle();
```

No role gate present.

## `/dashboard/*` (admin)

### Is there role check blocking students from admin pages?

Finding: **Partially yes**, but not in middleware.

- Middleware only checks session existence, not role.
- Admin UI role gating is enforced through `AuthProvider` + `useRequireAuth`.

`AuthProvider` login enforces admin role:

```ts
if (profile.role !== "admin") {
  await supabase.auth.signOut();
  setError("Access denied: admin accounts only");
  return;
}
```

`AuthProvider` session restore only sets `user` for admins:

```ts
if (profile && profile.role === "admin") {
  setUser(profile);
  setSession(currentSession);
}
```

`src/app/dashboard/layout.tsx` then uses `useRequireAuth()` and redirects when no admin-context user.

Important nuance:

- This is **client-layer role gating**, not edge middleware role gating.
- Students with valid session cookie can still pass middleware `/dashboard` check, then get bounced by client logic.

## `/api/admin/*` routes

### Do they verify `role === "admin"`?

Finding: **Yes**, consistently.

- All `src/app/api/admin/**/route.ts` files import and call `requireAdmin`.
- Verified no admin route is missing `requireAdmin`.

`requireAdmin` (`src/lib/supabase/auth-helpers.ts`) does:

```ts
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) return 401;

const { data: profile } = await supabase
  .from("profiles")
  .select("role")
  .eq("id", user.id)
  .single();

if (!profile || profile.role !== "admin") return 403;
```

Conclusion:

- Admin APIs correctly enforce admin role before executing.

## `/api/mobile/*` routes

### Do they verify `role === "student"`?

Finding: **No** explicit student-role enforcement.

- `src/app/api/mobile/courses/route.ts`: no auth check at all; returns published courses.
- `src/app/api/mobile/quizzes/route.ts` and `[id]/route.ts`: no auth check; published quiz data.
- `src/app/api/mobile/courses/[id]/complete/route.ts` and `quizzes/[id]/submit/route.ts`: require authenticated user but do not check profile role.

Example:

```ts
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();
if (authError || !user) return 401;
// no profile.role === 'student' check
```

Conclusion:

- Mobile APIs are authenticated/public by endpoint type, but not role-strict for student role.

---

## 3. Login flow audit

## `/temp/login` success flow

From `src/app/temp/login/page.tsx`:

```ts
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
// ...
router.push("/temp/dashboard");
```

Finding:

- Redirect target is always `/temp/dashboard`.
- No role check before redirect.

## `/dashboard/login` success flow

There is **no `/dashboard/login` route** in this project.

Actual admin login route is `/login` via `src/app/login/page.tsx` + `src/components/auth/LoginForm.tsx`.

Admin login flow:

- `LoginForm` calls `useAuth().login(...)`.
- `AuthProvider.login()` fetches profile and requires `role === "admin"`.
- On success, `/login` page pushes to redirect path (default `/dashboard`).

## What if admin hits `/temp/login`?

- Admin credentials can sign in (no role filter there).
- Temp login then pushes to `/temp/dashboard`.
- `/temp/dashboard/*` has no admin-block role guard.

Result:

- **Admin can access student temp pages** (subject to subscription-based checks on some pages).

## What if student hits `/dashboard/login`?

- `/dashboard/login` does not exist.
- Equivalent is `/login` (admin login page).
- Student credentials fail role check in `AuthProvider.login()` and trigger signOut + error.

Result for active student session edge case:

- Middleware redirects any authenticated user on `/login` to `/dashboard`.
- But dashboard client auth context only admits admins.
- This can create confusing redirects/loop-like behavior for student sessions moving between `/login` and `/dashboard`.

---

## 4. Shared cookie problem

## Same-domain Supabase cookie auth across `/temp/*` and `/dashboard/*`

Confirmed:

- Both areas use Supabase SSR/browser clients with same project URL + anon key:
  - `src/lib/supabase/server.ts`
  - `src/lib/supabase/client.ts`
- No route-group-specific cookie isolation implemented.

Implication:

- Session cookie/token is shared across route groups on same domain.

## Is same session/cookie shared across both route groups?

Yes.

- Middleware/session checks and both route groups reference the same Supabase auth session context.

## `profiles.role` field values

From migration `supabase/migrations/001_initial_schema.sql`:

```sql
role text not null default 'student'
  check (role in ('student', 'admin'))
```

Also `has_subscription` and `is_active` are added in migration 002.

---

## 5. Recommended fix

## What exact role checks need to be added and where

## A) Middleware (edge-level coarse routing by role)

File: `src/middleware.ts`

Add profile role check for relevant paths:

1. For `/dashboard*`:
   - Require authenticated user **and** `role === 'admin'`.
   - If non-admin -> redirect to `/temp/dashboard` (or `/temp/login` if no profile).
2. For `/temp/dashboard*`:
   - Require authenticated user **and** `role === 'student'`.
   - If admin -> redirect to `/dashboard`.
3. For `/login`:
   - If authenticated admin -> redirect `/dashboard`.
   - If authenticated student -> redirect `/temp/dashboard`.
4. Optionally for `/temp/login`:
   - If authenticated admin -> redirect `/dashboard`.
   - If authenticated student -> redirect `/temp/dashboard`.

Why middleware too:

- Prevents wrong-area access before rendering.
- Prevents role-mismatch redirect loops.

## B) Server page guards (defense-in-depth)

Files:

- `src/app/temp/dashboard/page.tsx`
- `src/app/temp/dashboard/courses/page.tsx`
- `src/app/temp/dashboard/quizzes/page.tsx`
- `src/app/temp/dashboard/profile/page.tsx`
- `src/app/temp/dashboard/courses/[id]/page.tsx`
- `src/app/temp/dashboard/quizzes/[id]/page.tsx`

Add explicit role guard after profile fetch:

- If role is not student, redirect to `/dashboard`.

Why:

- Keeps correct behavior even if middleware changes or is bypassed in edge cases.

## C) API role hardening

1. `/api/mobile/*`
   - For endpoints that mutate student progress/attempts, enforce `role === 'student'`.
   - For read-only published content endpoints (`/api/mobile/courses`, `/api/mobile/quizzes`, `/api/mobile/quizzes/:id`), decide policy:
     - public by design, or
     - authenticated student-only.
   - If student-only desired, add explicit role check.

2. `/api/auth/notify-login`
   - Optional hardening: only allow student-role logins to emit student login notification.

## Should fix live in middleware, pages, or both?

Recommendation: **Both**.

- Middleware: first-line route segregation and UX correctness.
- Pages/API: defense-in-depth and correctness under internal calls or edge exceptions.

## Wrong-role behavior (redirect targets)

Recommended redirects:

1. Admin tries student area (`/temp/dashboard*`, `/temp/login`, `/temp/signup`):
   - Redirect to `/dashboard`.
2. Student tries admin area (`/dashboard*`, `/login` admin route):
   - Redirect to `/temp/dashboard`.
3. Unauthenticated:
   - Admin area -> `/login`
   - Student area -> `/temp/login`

---

## Key Risk Notes

1. Current middleware role-blind logic allows cross-area session leakage behavior.
2. Current client-layer admin gating in `AuthProvider` is helpful but insufficient alone for route-level separation.
3. Shared Supabase session cookie across route groups is expected; role segmentation must be explicit.
4. Mobile API role assumptions are currently implicit, not enforced.
