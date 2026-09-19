# RBAC2 Page Guards Plan (`/temp/dashboard/*`)

## Scope

Audited server page files:

1. `src/app/temp/dashboard/page.tsx`
2. `src/app/temp/dashboard/courses/page.tsx`
3. `src/app/temp/dashboard/quizzes/page.tsx`
4. `src/app/temp/dashboard/profile/page.tsx`
5. `src/app/temp/dashboard/courses/[id]/page.tsx`
6. `src/app/temp/dashboard/quizzes/[id]/page.tsx`

Goal: add server-side defense-in-depth role checks on every temp dashboard page so non-student users are redirected to `/dashboard` even if they can reach these routes.

## Global Decisions

- Wrong role redirect target: `/dashboard` (not `/login`).
- Role check order: run `role !== "student"` guard before subscription checks.
- Keep existing unauthenticated redirect behavior as-is: `redirect("/temp/login")`.

## Per-Page Audit And Fix Points

### 1) `src/app/temp/dashboard/page.tsx`

Current auth/profile block:

- User auth check at lines 11-17.
- Profile fetch at lines 20-24 using `.select("*")`.
- Optional profile creation at lines 29-48 if missing.

`redirect` import present: yes (line 1).

Profile `select` includes `role`: yes (`*`).

Exact insertion point:

- Insert role guard after line 48 (after `profile` has been resolved/created), before line 50 (`const initials = ...`).

Guard to add:

```ts
if (!profile || profile.role !== "student") {
  redirect("/dashboard");
}
```

Notes:

- This page can create a default student profile when missing. Guard must run after that creation path completes.

### 2) `src/app/temp/dashboard/courses/page.tsx`

Current auth/profile block:

- User auth check at lines 17-20.
- Profile fetch at lines 22-26 with `.select("has_subscription")`.
- Subscription logic starts at line 28.

`redirect` import present: yes (line 1).

Profile `select` includes `role`: no.

Exact insertion point:

- Update select to include role, then insert guard after line 26, before line 28 subscription logic.

Required select change:

```ts
.select("has_subscription, role")
```

Guard to add:

```ts
if (!profile || profile.role !== "student") {
  redirect("/dashboard");
}
```

### 3) `src/app/temp/dashboard/quizzes/page.tsx`

Current auth/profile block:

- User auth check at lines 8-11.
- Profile fetch at lines 13-17 with `.select("has_subscription")`.
- Subscription logic starts at line 19.

`redirect` import present: yes (line 1).

Profile `select` includes `role`: no.

Exact insertion point:

- Update select to include role, then insert guard after line 17, before line 19 subscription logic.

Required select change:

```ts
.select("has_subscription, role")
```

Guard to add:

```ts
if (!profile || profile.role !== "student") {
  redirect("/dashboard");
}
```

### 4) `src/app/temp/dashboard/profile/page.tsx`

Current auth/profile block:

- User auth check at lines 29-32.
- Profile fetch at lines 34-38 with `.select("*")`.
- Existing profile-null redirect at line 40.

`redirect` import present: yes (line 1).

Profile `select` includes `role`: yes (`*`).

Exact insertion point:

- Insert role guard after line 40, before line 42 (`const initials = ...`).

Guard to add:

```ts
if (profile.role !== "student") {
  redirect("/dashboard");
}
```

### 5) `src/app/temp/dashboard/courses/[id]/page.tsx`

Current auth/profile block:

- User auth check at lines 25-28.
- Profile fetch at lines 31-35 with `.select("has_subscription, name")`.
- Subscription guard at line 37.

`redirect` import present: yes (line 1).

Profile `select` includes `role`: no.

Exact insertion point:

- Update select to include role, then insert role guard after line 35, before line 37 subscription guard.

Required select change:

```ts
.select("has_subscription, name, role")
```

Guard to add:

```ts
if (!profile || profile.role !== "student") {
  redirect("/dashboard");
}
```

### 6) `src/app/temp/dashboard/quizzes/[id]/page.tsx`

Current auth/profile block:

- User auth check at lines 16-19.
- Profile fetch at lines 22-26 with `.select("has_subscription")`.
- Subscription guard starts at line 28.

`redirect` import present: yes (line 1).

Profile `select` includes `role`: no.

Exact insertion point:

- Update select to include role, then insert role guard after line 26, before line 28 subscription guard.

Required select change:

```ts
.select("has_subscription, role")
```

Guard to add:

```ts
if (!profile || profile.role !== "student") {
  redirect("/dashboard");
}
```

## Shared Helper Recommendation

Current state:

- `src/lib/supabase/auth-helpers.ts` contains `requireAdmin(request)` for API routes.
- There is no equivalent server-component helper for temp student pages.

Recommendation:

Create a shared server-page helper to avoid six near-identical auth/profile/role blocks.

Suggested location:

- `src/lib/supabase/page-auth.ts`

Suggested signature:

```ts
export async function requireStudentPage(options?: {
  includeSubscription?: boolean;
  includeName?: boolean;
}): Promise<{
  user: { id: string };
  profile: {
    role: "student" | "admin";
    has_subscription?: boolean;
    name?: string | null;
  };
}>;
```

Behavior contract:

1. Resolve current user with `supabase.auth.getUser()`.
2. If no user, `redirect("/temp/login")`.
3. Query profile including `role` (+ optional fields requested by page).
4. If profile missing or `role !== "student"`, `redirect("/dashboard")`.
5. Return typed `user` + `profile` for page-level logic (such as subscription checks).

Why this is valuable:

- Prevents guard drift between pages.
- Makes future role policy updates single-point.
- Keeps RBAC2 behavior consistent with middleware intent.

## Rollout Order

1. Implement role checks on the four subscription-gated pages first:
   - `courses/page.tsx`
   - `quizzes/page.tsx`
   - `courses/[id]/page.tsx`
   - `quizzes/[id]/page.tsx`
2. Then apply guards on:
   - `dashboard/page.tsx`
   - `profile/page.tsx`
3. Optional refactor: extract helper and migrate all six pages in one pass.

## Expected Result After RBAC2

- Middleware remains first-line route filtering.
- Every temp dashboard server page independently enforces student role.
- Admin users cannot render temp student pages even if middleware behavior changes or route matching regresses.
