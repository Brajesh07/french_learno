# RBAC1 Middleware Fix Plan

Date: 2026-07-10
Target file: src/middleware.ts

## 1) Current Middleware Code (As-Is)

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase-aware middleware.
 *
 * Responsibilities:
 * 1. Refresh the Supabase session cookie on every request (keeps sessions alive).
 * 2. Redirect unauthenticated users away from protected routes.
 * 3. Redirect authenticated users away from auth routes (e.g. /login).
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Apply cookies to the request (for downstream server components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          // Re-create response so cookies are forwarded to the browser too
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Do not add any logic between createServerClient and getUser().
  // A simple mistake can cause random logouts.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // If the auth check fails (e.g. network error, missing env vars),
    // fall through and let route handlers deal with auth instead of crashing.
    return supabaseResponse;
  }

  const { pathname } = request.nextUrl;

  const isProtectedRoute = pathname.startsWith("/dashboard");
  const isAuthRoute = pathname.startsWith("/login");
  const isTempProtectedRoute = pathname.startsWith("/temp/dashboard");

  // Redirect unauthenticated users trying to access protected routes
  if (isProtectedRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from the login page
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users from /temp/dashboard to /temp/login
  if (isTempProtectedRoute && !user) {
    return NextResponse.redirect(new URL("/temp/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

Current behavior summary:

- Session-only guard (user exists or not).
- No role fetch from profiles table.
- No role routing between /dashboard and /temp/dashboard.

---

## 2) Profile Role Fetch Strategy

## How to fetch role in middleware

Use the existing Supabase client already created in middleware (same client used for auth.getUser), then query profiles:

```ts
const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("role")
  .eq("id", user.id)
  .maybeSingle();
```

This is feasible and does not require creating a second Supabase client.

## Can middleware reuse current Supabase server client?

Yes. The middleware client can perform both:

- auth.getUser() for session validation
- profiles role lookup for routing decisions

## Performance impact of adding DB query

If applied naively to all requests matched by middleware:

- +1 database query per authenticated request can be significant.

Mitigation strategy:

- Only fetch role when pathname is one of:
  - /dashboard\*
  - /temp/dashboard\*
  - /login
  - /temp/login
  - /temp/signup (optional but recommended)
- Skip role query for unrelated paths/APIs/static pages.

## Safer/faster alternative

Use JWT custom claims for role (embedded in access token):

- Middleware reads role from token payload, avoiding DB call per request.
- Faster at runtime, but requires Supabase JWT claim configuration and claim refresh discipline.

Tradeoff:

- DB lookup approach: simpler to implement now, stronger source-of-truth freshness.
- JWT claim approach: higher setup complexity but better edge performance.

Recommended now:

- Implement DB lookup first with path gating.
- Consider JWT claim optimization later if middleware latency is measurable.

---

## 3) Edge Cases To Handle

## Case A: auth.getUser succeeds but profile row is missing

Possible scenarios:

- Newly created user before profile row insertion
- Data inconsistency

Recommended behavior:

- Protected routes (/dashboard*, /temp/dashboard*): fail closed and redirect to role-neutral entry (/login).
- Auth routes (/login, /temp/login, /temp/signup): allow through, so user can recover/login/logout flows.

## Case B: role query fails/timeouts in middleware

Recommended behavior:

- Protected routes: fail closed (redirect to /login for /dashboard*; redirect to /temp/login for /temp/dashboard*).
- Auth routes: allow through to avoid hard lockout loops.

Optional:

- Attach query param such as ?reason=role_check_failed for diagnostics.
- Log profileError server-side.

## Case C: /temp/signup role checks

Recommended:

- Apply authenticated-user role redirect behavior here too:
  - authenticated admin -> /dashboard
  - authenticated student -> /temp/dashboard
- Unauthenticated users should still access /temp/signup.

## Case D: /api/admin/_ and /api/mobile/_ in middleware

Recommendation:

- Do not move full API RBAC into middleware.
- Keep API authorization in route handlers (already implemented for /api/admin via requireAdmin).
- Middleware may still enforce coarse auth redirection for UI routes only.

Reason:

- Handler-level auth is authoritative, explicit, and easier to test per endpoint.

---

## 4) Proposed Updated Middleware Logic

## 4.1 Pseudocode

```text
create supabase client with cookie passthrough
user = auth.getUser()
if auth call throws:
  return next response (existing resilient behavior)

pathname = request path
classify path:
  isAdminArea = startsWith('/dashboard')
  isStudentArea = startsWith('/temp/dashboard')
  isAdminLogin = startsWith('/login')
  isStudentLogin = startsWith('/temp/login')
  isStudentSignup = startsWith('/temp/signup')

if no user:
  if isAdminArea -> redirect '/login?redirect=pathname'
  if isStudentArea -> redirect '/temp/login'
  else allow

if user exists:
  if path needs role decision (admin area, student area, admin login, student login, student signup):
    fetch profiles.role by user.id

    if role fetch fails or no profile:
      if isAdminArea -> redirect '/login'
      if isStudentArea -> redirect '/temp/login'
      else allow auth routes through

    if role == 'admin':
      if isStudentArea or isStudentLogin or isStudentSignup -> redirect '/dashboard'
      if isAdminLogin -> redirect '/dashboard'
      else allow

    if role == 'student':
      if isAdminArea or isAdminLogin -> redirect '/temp/dashboard'
      if isStudentLogin or isStudentSignup -> redirect '/temp/dashboard'
      else allow

    for unexpected role values:
      fail closed on protected areas

return next response
```

## 4.2 Proposed TypeScript Implementation

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type AppRole = "admin" | "student";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Keep this directly after createServerClient
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return supabaseResponse;
  }

  const { pathname } = request.nextUrl;

  const isAdminArea = pathname.startsWith("/dashboard");
  const isStudentArea = pathname.startsWith("/temp/dashboard");
  const isAdminLogin = pathname.startsWith("/login");
  const isStudentLogin = pathname.startsWith("/temp/login");
  const isStudentSignup = pathname.startsWith("/temp/signup");

  // Unauthenticated behavior (unchanged where required)
  if (!user) {
    if (isAdminArea) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isStudentArea) {
      return NextResponse.redirect(new URL("/temp/login", request.url));
    }

    return supabaseResponse;
  }

  // Fetch role only when needed for routing decisions
  const needsRoleDecision =
    isAdminArea ||
    isStudentArea ||
    isAdminLogin ||
    isStudentLogin ||
    isStudentSignup;

  let role: AppRole | null = null;

  if (needsRoleDecision) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      // Fail closed on protected areas, fail open on auth pages
      if (isAdminArea) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      if (isStudentArea) {
        return NextResponse.redirect(new URL("/temp/login", request.url));
      }
      return supabaseResponse;
    }

    role = profile.role as AppRole;
  }

  if (role === "admin") {
    // Admin should stay in admin area
    if (isStudentArea || isStudentLogin || isStudentSignup) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (isAdminLogin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return supabaseResponse;
  }

  if (role === "student") {
    // Student should stay in temp area
    if (isAdminArea || isAdminLogin) {
      return NextResponse.redirect(new URL("/temp/dashboard", request.url));
    }
    if (isStudentLogin || isStudentSignup) {
      return NextResponse.redirect(new URL("/temp/dashboard", request.url));
    }
    return supabaseResponse;
  }

  // Unknown role fallback
  if (isAdminArea) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isStudentArea) {
    return NextResponse.redirect(new URL("/temp/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

## 4.3 What changed vs current version

Added:

- Route classifiers for `/temp/login` and `/temp/signup`.
- Profile role fetch from `profiles` for role-sensitive paths.
- Admin/student split routing decisions for:
  - protected areas
  - login pages
  - signup page

Changed:

- Authenticated `/login` redirect now role-aware:
  - admin -> `/dashboard`
  - student -> `/temp/dashboard`

Preserved:

- Unauthenticated `/dashboard*` -> `/login`
- Unauthenticated `/temp/dashboard*` -> `/temp/login`
- Cookie/session refresh flow and matcher.

---

## 5) Risk Assessment

Overall risk: **Medium**

Why:

- Middleware runs on many requests.
- Adds a DB query in an edge-critical path for role-sensitive routes.
- Redirect logic complexity increases and can cause loops if incorrectly ordered.

What could go wrong if role fetch fails silently:

- Cross-area access might be accidentally allowed.
- Users can be redirected to wrong login/home areas.
- Inconsistent behavior between middleware and page/API-level checks.

Recommended fallback if profile fetch fails:

- Protected areas: fail closed with redirect to area-appropriate login.
- Auth pages: fail open (allow page), so user can recover and avoid loops.
- Log server-side error details for observability.

---

## 6) What To Test After Applying

Manual test matrix:

1. Unauthenticated -> `/dashboard`

- Expected: redirect to `/login?redirect=/dashboard`.

2. Unauthenticated -> `/temp/dashboard`

- Expected: redirect to `/temp/login`.

3. Admin session -> `/dashboard`

- Expected: allow.

4. Admin session -> `/temp/dashboard`

- Expected: redirect to `/dashboard`.

5. Student session -> `/dashboard`

- Expected: redirect to `/temp/dashboard`.

6. Student session -> `/temp/dashboard`

- Expected: allow.

7. Authenticated admin -> `/login`

- Expected: redirect to `/dashboard`.

8. Authenticated student -> `/login`

- Expected: redirect to `/temp/dashboard`.

9. Authenticated admin -> `/temp/login`

- Expected: redirect to `/dashboard`.

10. Authenticated student -> `/temp/login`

- Expected: redirect to `/temp/dashboard`.

11. Authenticated admin -> `/temp/signup`

- Expected: redirect to `/dashboard`.

12. Authenticated student -> `/temp/signup`

- Expected: redirect to `/temp/dashboard`.

13. Missing profile row + authenticated user -> `/dashboard`

- Expected: redirect to `/login` (fail closed).

14. Missing profile row + authenticated user -> `/temp/dashboard`

- Expected: redirect to `/temp/login` (fail closed).

15. Role query failure simulation -> `/dashboard`

- Expected: redirect `/login` (fail closed).

16. Role query failure simulation -> `/login`

- Expected: allow page render (fail open for auth route).

17. Student tries admin API endpoint `/api/admin/courses`

- Expected: 403 from route handler (`requireAdmin`) regardless of middleware decision.

18. Admin tries mobile mutate endpoint `/api/mobile/quizzes/:id/submit`

- Current expected: may succeed if authenticated (because no role check there).
- Note: this validates known gap outside middleware scope.

19. Verify no redirect loops

- `/login` with student session should land in `/temp/dashboard` and stay there.
- `/temp/login` with admin session should land in `/dashboard` and stay there.

20. Verify normal logout path

- After logout, protected routes should return to their respective login pages.

---

## Recommendation Summary

- Implement role-aware middleware routing as shown.
- Keep API route handlers as authoritative RBAC enforcement layer.
- Treat role-lookup failure as closed on protected routes and open on auth routes.
- Optionally plan a later optimization to JWT custom role claims if middleware DB query overhead becomes measurable.
