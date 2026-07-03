# Request Log Report — Notification & Profile Polling

> Investigated: 2026-06-28  
> Status: Read-only investigation — nothing changed.

---

## 1. Where Is the Polling Triggered?

**File:** `src/components/layout/Header.tsx`  
**Component:** `NotificationBell` (rendered inside `<Header>`, which is rendered inside every `<DashboardLayout>` page)

The `NotificationBell` component contains a `useEffect` with a `setInterval` that fires every 30 seconds:

```tsx
// src/components/layout/Header.tsx  Lines 66–82
useEffect(() => {
  const fetchCount = async () => {
    try {
      const res = await fetch("/api/admin/notifications?count=true");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch {
      // silently ignore network errors
    }
  };
  fetchCount(); // fires immediately on mount
  const timer = setInterval(fetchCount, 30_000); // then every 30 s
  return () => clearInterval(timer); // cleaned up on unmount
}, []);
```

Because `Header` is rendered by `DashboardLayout` (and DashboardLayout wraps **every** dashboard page), this polling is active for the entire authenticated session.

---

## 2. What Is the Polling Interval?

**30 seconds** (`30_000` ms).

One request fires immediately on mount, then repeats every 30 s as long as the user is on any dashboard page.

---

## 3. What Triggers a Re-fetch?

Two separate mechanisms:

| Trigger                                      | Request                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| `setInterval` every 30 s                     | `GET /api/admin/notifications?count=true`                                              |
| User clicks the bell icon (`toggleDropdown`) | `GET /api/admin/notifications?limit=10` + (if unread) `PATCH /api/admin/notifications` |

The bell dropdown fetch (`?limit=10`) is **not** a scheduled poll — it only fires on user interaction. However, each click causes two requests: the GET for items and a PATCH to mark all as read if any are unread.

---

## 4. What Does the Notification API Route Do?

**File:** `src/app/api/admin/notifications/route.ts`

### `GET ?count=true` (polled every 30 s)

```ts
// Fast-path: just return the unread badge count
if (searchParams.get("count") === "true") {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  return NextResponse.json({ count: count ?? 0 });
}
```

- Uses the **service-role** Supabase client (`createAdminClient`) — bypasses RLS entirely.
- Runs a `HEAD`-style count query (no rows returned, just the count header).
- Returns `{ count: N }`.

### `GET ?limit=10` (on bell click)

```ts
const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
let query = supabase
  .from("notifications")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(limit);

return NextResponse.json({ notifications: data ?? [] });
```

- Returns up to 10 full notification rows, ordered newest-first.

### Authentication guard

Both paths first call `requireAdmin(request)` from `src/lib/supabase/auth-helpers.ts`. If the user is not an admin, the route returns early with an error response.

---

## 5. Is `profile` Also Polling?

**Not on a timer — but it fires on every page load and every Supabase auth state change.**

**File:** `src/components/auth/AuthProvider.tsx`

### On mount (once per full page load)

```ts
// src/components/auth/AuthProvider.tsx  ~Line 232
const initSession = async () => {
  const {
    data: { session: currentSession },
  } = await supabase.auth.getSession();
  if (currentSession?.user && currentSession.access_token) {
    const profile = await fetchProfile(
      currentSession.user,
      currentSession.access_token,
    );
    // ...
  }
  setLoading(false);
};
initSession();
```

- Calls `GET /api/auth/profile` with `Authorization: Bearer <token>` header.

### On every Supabase `onAuthStateChange` event

```ts
supabase.auth.onAuthStateChange(async (event, newSession) => {
  if (event === "TOKEN_REFRESHED") {
    setSession(newSession); // ← only updates session, does NOT call fetchProfile
    return;
  }
  if (event === "SIGNED_IN" && isHandlingLogin.current) {
    return; // ← skipped during login() to prevent race
  }
  if (newSession?.user && newSession.access_token) {
    const profile = await fetchProfile(
      newSession.user,
      newSession.access_token,
    );
    // ...
  }
});
```

- `TOKEN_REFRESHED` **skips** the profile fetch (good — just updates the session object).
- `SIGNED_IN` from an external tab would trigger a profile re-fetch.
- `SIGNED_OUT` clears state, no fetch.

### What the profile route does (`GET /api/auth/profile`)

```ts
// src/app/api/auth/profile/route.ts
// 1. Validates the Bearer token using the anon Supabase client
const {
  data: { user },
} = await anonClient.auth.getUser(accessToken);

// 2. Fetches the profile row using the service-role client (bypasses RLS)
const { data: profile } = await adminClient
  .from("profiles")
  .select("id, name, username, email, role")
  .eq("id", user.id)
  .maybeSingle();
```

**Net effect:** Profile is fetched once on mount and once after any auth state change event (except TOKEN_REFRESHED). It is **not** on a timer, but Supabase JWT auto-refresh fires `TOKEN_REFRESHED` roughly every hour which does update `session` state — this can cause React re-renders that cascade through any component consuming `useAuth()`, potentially re-mounting children and retriggering their own `useEffect`s (including `NotificationBell`'s mount-time fetch).

---

## 6. Other Repeated / Bulk Requests

### Dashboard home page — fires on every visit

**File:** `src/app/dashboard/page.tsx`

```ts
// useEffect with empty deps [] — fires once per mount
await Promise.all([
  fetch("/api/admin/list-students?limit=1"),
  fetch("/api/admin/courses?limit=1"),
  fetch("/api/admin/courses?isPublished=true&limit=1"),
  fetch("/api/admin/quizzes?limit=1"),
]);
// Then also:
await Promise.all([
  fetch("/api/admin/list-students?limit=4"),
  fetch("/api/admin/courses?limit=4"),
  fetch("/api/admin/quizzes?limit=4"),
]);
```

That is **7 requests** on every visit to `/dashboard`. Not polling (no interval), but fires twice per mount: once for stats (count only) and once for recent-items lists.

### Notifications page — fires once on mount

**File:** `src/app/dashboard/notifications/page.tsx`

```ts
const fetchNotifications = useCallback(async () => {
  const res = await fetch("/api/admin/notifications?limit=50");
  // ...
}, []);

useEffect(() => {
  fetchNotifications();
}, [fetchNotifications]);
```

`fetchNotifications` is wrapped in `useCallback` with an empty dependency array, so it never changes reference → `useEffect` fires exactly once on mount. No interval.

### Analytics page — fires once on mount

**File:** `src/app/dashboard/analytics/page.tsx`

Multiple `useCallback`-wrapped fetch helpers (`fetchKpis`, `fetchActivity`, `fetchSubscriptions`, `fetchQuizPerf`, `fetchLevelDist`) are each called once from a `useEffect` on mount. No intervals.

---

## Summary Table

| Request                                        | Source File                     | Frequency                                    | Mechanism                         |
| ---------------------------------------------- | ------------------------------- | -------------------------------------------- | --------------------------------- |
| `GET /api/admin/notifications?count=true`      | `Header.tsx` `NotificationBell` | Every **30 seconds**                         | `setInterval`                     |
| `GET /api/admin/notifications?limit=10`        | `Header.tsx` `NotificationBell` | On **bell icon click**                       | User interaction                  |
| `PATCH /api/admin/notifications` (markAllRead) | `Header.tsx` `NotificationBell` | On **bell icon click** (if unread)           | User interaction                  |
| `GET /api/auth/profile`                        | `AuthProvider.tsx`              | Once on **page load** + on auth state change | `useEffect` + `onAuthStateChange` |
| `GET /api/admin/notifications?limit=50`        | `notifications/page.tsx`        | Once on **page mount**                       | `useEffect` (no interval)         |
| 7× dashboard stats/list fetches                | `dashboard/page.tsx`            | Once on **dashboard mount**                  | `useEffect` (no interval)         |
| Analytics fetches (5 endpoints)                | `analytics/page.tsx`            | Once on **analytics mount**                  | `useEffect` (no interval)         |

### Key Finding

The **only true poll** in the codebase is the `setInterval(fetchCount, 30_000)` in `NotificationBell`. Every other fetch is either one-shot on mount or user-triggered. The `profile` route is not polled on a timer, but it is called on initial mount and on auth state change events from the Supabase SDK.
