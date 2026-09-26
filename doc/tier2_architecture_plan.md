# Tier 2 Architecture Plan: `/temp/dashboard/*` Caching Strategy

Date: 2026-07-10

## Executive Recommendation

**Recommend Option A as the primary path now** (with one structural enhancement):
- Use `unstable_cache` for repeated **content** queries (courses/quizzes) via shared server helpers.
- Keep auth/user/profile **uncached**.
- Optionally centralize auth/profile lookup in one helper function (not cached), reused by pages.

Why this recommendation:
- Lowest-risk change with immediate performance wins.
- Avoids App Router layout-to-page prop limitations.
- Avoids user-data leakage risk from caching auth/profile.
- Preserves current server-component architecture and avoids a client-context refactor.

---

## Option Evaluation

## Option A — `unstable_cache` per page (auth/profile uncached)

### Pros
- Minimal refactor, easy rollout.
- Directly reduces duplicated published content queries (`courses`, `quizzes`) across tab navigations.
- Keeps sensitive identity/subscription checks uncached.
- Works naturally with current page-level server components.

### Cons
- `supabase.auth.getUser()` and `profiles` lookup still run per request.
- If only "per-page" wrappers are used, duplicated query code can remain scattered.

### Risk
- **Low** (if profile/auth remains uncached and content cache keys are stable).

## Option B — move auth/profile fetch to `layout.tsx`, cache content in pages

### Pros
- Architecturally clean intent: common session/profile boundary in one place.
- Could remove duplicate auth checks from page files if data were shareable.

### Cons
- **Critical App Router constraint**: layouts cannot pass arbitrary props directly to child page components.
- To share layout-fetched data, you need a different pattern (client context/provider, shared server helper, or repeated reads).
- Client context path would force major page architecture changes (many server pages would need client conversion or duplicated server fetch anyway).

### Risk
- **Medium to High** due to refactor scope and potential auth/render regressions.

---

## App Router Constraint Answer

### Does Next.js App Router support passing props from `layout.tsx` to child page components directly?

**No.** Not as a direct, typed prop channel from layout to page.

### Correct patterns instead
1. **Shared server helper function** (recommended here):
   - Put common data access in a server utility and call it where needed.
   - For duplicated expensive non-user content, wrap helper internals with `unstable_cache`.
2. **React context provider**:
   - Works for client components.
   - Requires a client provider boundary and can trigger larger architectural changes.
3. **Request memoization / `cache()` helpers**:
   - Useful for deduping repeated calls within the same request boundary.

Given current server-page design, pattern #1 is the best fit.

---

## RLS/Auth Caching Side Effects

### Should profile/auth data be cached with `unstable_cache`?

**Generally no** for this app flow.

Reasons:
- Profile data is user-scoped and authorization-sensitive (`has_subscription`, role/status-like checks).
- Mis-keyed cache can leak data across users.
- Even correctly keyed per-user cache can create stale auth/profile behavior after updates.
- `unstable_cache` is better suited to shared published content than session/identity reads.

Safe rule:
- Cache: published `courses`, published `quizzes`, static mappings.
- Do not cache: `auth.getUser()`, `profiles` row, `user_progress`, quiz attempt counts used for personalized profile state.

---

## Cache Busting Answer (`revalidatePath`)

Current behavior in `/src/app/temp/dashboard/actions.ts`:
- `revalidatePath("/temp/dashboard")`
- `revalidatePath("/temp/dashboard/profile")`

### Will this bust cache correctly in both options?

- For route output and path-bound cache behavior: **yes, for those specific paths**.
- For shared `unstable_cache` entries reused across multiple pages: **not always sufficient by itself**.

Recommendation:
- Add **cache tags** to `unstable_cache` content helpers (e.g., `temp:courses:published`, `temp:quizzes:published`, `temp:course:{id}`, `temp:quiz:{id}`).
- Use `revalidateTag` from mutation points that affect those datasets.

For profile edit:
- Existing `revalidatePath` calls are appropriate for profile UI refresh.
- If profile data were ever cached (not recommended), tags + `revalidateTag` would be required.

---

## Recommended Implementation Roadmap

## Tier 2.1 — Low-Risk, High-Impact First

### 1) Files touched
- `src/lib/temp-dashboard/content-cache.ts` (new)
- `src/app/temp/dashboard/page.tsx`
- `src/app/temp/dashboard/courses/page.tsx`
- `src/app/temp/dashboard/quizzes/page.tsx`

### 2) What changes
- Create shared cached helpers for published content queries using `unstable_cache`:
  - `getPublishedCourses()`
  - `getPublishedQuizzes()`
  - optionally `getPublishedCourseMap()`
- Replace in-page duplicated course/quiz query blocks with helper calls.
- Keep all `auth.getUser()` and `profiles` fetches unchanged (uncached).

### 3) Risk level
- **Low**
- Why: mainly extraction + substitution; no auth flow change.

### 4) What to test after Tier 2.1
- Navigate repeatedly between:
  - `/temp/dashboard`
  - `/temp/dashboard/courses`
  - `/temp/dashboard/quizzes`
- Verify content renders correctly and no permission regressions.
- Confirm home/course/quiz counts and lists remain accurate.
- Validate no runtime errors from cache helper imports in server components.

### 5) Gotchas / edge cases
- Ensure cache key uniqueness for each helper.
- Ensure helper returns stable plain data structures.
- Do not include user-specific filters in shared content cache helper unless user key is included.

---

## Tier 2.2 — Normalize Auth/Profile Access Pattern (Without Caching It)

### 1) Files touched
- `src/lib/temp-dashboard/session.ts` (new)
- `src/app/temp/dashboard/page.tsx`
- `src/app/temp/dashboard/courses/page.tsx`
- `src/app/temp/dashboard/quizzes/page.tsx`
- `src/app/temp/dashboard/profile/page.tsx`
- `src/app/temp/dashboard/courses/[id]/page.tsx`
- `src/app/temp/dashboard/quizzes/[id]/page.tsx`

### 2) What changes
- Introduce shared uncached helper(s):
  - `requireTempUser()`
  - `getTempProfile(userId)`
- Replace repeated inline auth/profile fetch boilerplate in each page with helper usage.
- Preserve route-specific redirects and checks.

### 3) Risk level
- **Low to Medium**
- Why: broad touch across pages; behavior should remain identical if helpers are accurate.

### 4) What to test after Tier 2.2
- Auth redirects for anonymous users still go to `/temp/login`.
- Subscription gate behavior still works for protected pages.
- Profile page data remains correct.
- No accidental changes in route-level redirect targets.

### 5) Gotchas / edge cases
- Avoid changing semantics around profile auto-creation currently present on `/temp/dashboard/page.tsx`.
- Keep helper boundary clear: helper should not accidentally cache profile.

---

## Tier 2.3 — Add Cache Tags + Explicit Invalidation Hooks

### 1) Files touched
- `src/lib/temp-dashboard/content-cache.ts`
- Mutation points affecting published content (likely admin API routes under `src/app/api/admin/courses/**` and `src/app/api/admin/quizzes/**`)
- Potentially `src/app/temp/dashboard/actions.ts` (if tags are introduced for profile-adjacent state)

### 2) What changes
- Add `tags` to `unstable_cache` entries.
- On publish/unpublish/create/edit mutations, call `revalidateTag` for impacted datasets.
- Keep existing `revalidatePath` for route refresh semantics.

### 3) Risk level
- **Medium**
- Why: touches write paths and invalidation semantics; incorrect tagging can cause stale data or unnecessary churn.

### 4) What to test after Tier 2.3
- Admin edits/publishes a course or quiz -> temp tabs reflect updates promptly.
- Content appears/disappears correctly after publish toggles.
- No stale entries after mutation.

### 5) Gotchas / edge cases
- Tag taxonomy should be consistent and documented.
- Ensure invalidation is fired on all mutation branches (success paths only).

---

## Tier 2.4 — Final Cleanup & Optional Structural Upgrade

### 1) Files touched
- `src/app/temp/dashboard/layout.tsx` (optional, lightweight async guard only)
- `src/lib/temp-dashboard/session.ts`
- Documentation file for caching conventions (optional)

### 2) What changes
- Optional: make layout async only for shared non-prop concerns (e.g., common guard wrapper), **not** for prop passing.
- Remove dead duplicated query code paths if any remain.
- Add comments/doc for cache scope, what is safe to cache, and invalidation policy.

### 3) Risk level
- **Low** (if kept to cleanup)
- **High** if attempting full client-context conversion to emulate prop passing.

### 4) What to test after Tier 2.4
- Full smoke pass of all `/temp/dashboard/*` routes.
- Profile edit + path revalidation behavior.
- Cache invalidation after admin content mutations.

### 5) Gotchas / edge cases
- Do not attempt to "force" layout-to-page prop passing via brittle ReactNode manipulation.
- Keep server/client boundaries explicit.

---

## Why Option B Is Not the Primary Recommendation Right Now

Option B as written assumes data can be fetched in layout and directly passed to page components. In App Router this is not the default capability. Achieving similar behavior requires either:
- a client context architecture shift, or
- shared server helpers (which largely converges back to Option A + helper consolidation).

Therefore, the best practical architecture now is:
- **Option A for cached shared content**,
- plus **shared uncached auth/profile helpers** for consistency,
- plus **tag-based invalidation** for correctness.

This delivers most performance gain with significantly lower migration risk.
