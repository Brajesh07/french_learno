# Notification Fix Report

> Status: Proposal only — no files have been changed.

---

## File 1 — `src/components/layout/Header.tsx`

### What changes

- Remove `setInterval` / `clearInterval`.
- Import `createClient` from `@/lib/supabase/client` (the existing browser Supabase client).
- On mount: call `fetchCount()` once (unchanged).
- Subscribe to the `notifications` table for `INSERT`, `UPDATE`, and `DELETE` events via Supabase Realtime. On any event, call `fetchCount()` to refresh the badge.
- On unmount: call `channel.unsubscribe()` instead of `clearInterval`.

---

### Before

```tsx
// ----------------------------------------------------------------
// NotificationBell component
// ----------------------------------------------------------------
function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll unread count every 30 s
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
    fetchCount();
    const timer = setInterval(fetchCount, 30_000);
    return () => clearInterval(timer);
  }, []);
```

### After

```tsx
import { createClient } from "@/lib/supabase/client";

// ----------------------------------------------------------------
// NotificationBell component
// ----------------------------------------------------------------
function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch count once on mount, then keep in sync via Realtime
  useEffect(() => {
    const supabase = createClient();

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

    fetchCount();

    const channel = supabase
      .channel("notifications-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          fetchCount();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);
```

> **Note on the import line:** `createClient` is not currently imported in `Header.tsx`. The line:
>
> ```tsx
> import { createClient } from "@/lib/supabase/client";
> ```
>
> must be added alongside the existing imports at the top of the file.

---

## File 2 — `src/app/dashboard/page.tsx`

### What changes

- Remove the two separate async functions `fetchStats` and `fetchActivity`, each with their own `Promise.all` inside a single `useEffect`.
- Replace with one async function (`fetchDashboard`) that fires **all 7 fetches in a single `Promise.all`** — stats counts (4 requests at `limit=1`) and recent-items lists (3 requests at `limit=4`) simultaneously.
- Parse all 7 responses in one pass.
- Remove the separate `activityLoading` state — since everything resolves together, use a single `loading` guard (or keep `statsLoading` and `activityLoading` but set both from the same `finally` block).
- The `useEffect` dependency array stays `[]`.

---

### Before

```tsx
export default function DashboardPage() {
  const [statsLoading, setStatsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ ... });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [studentsRes, coursesRes, publishedRes, quizzesRes] =
          await Promise.all([
            fetch("/api/admin/list-students?limit=1", { credentials: "include" }),
            fetch("/api/admin/courses?limit=1", { credentials: "include" }),
            fetch("/api/admin/courses?isPublished=true&limit=1", { credentials: "include" }),
            fetch("/api/admin/quizzes?limit=1", { credentials: "include" }),
          ]);

        const [studentsData, coursesData, publishedData, quizzesData] =
          await Promise.all([
            studentsRes.ok ? studentsRes.json() : { total: 0 },
            coursesRes.ok ? coursesRes.json() : { total: 0 },
            publishedRes.ok ? publishedRes.json() : { total: 0 },
            quizzesRes.ok ? quizzesRes.json() : { total: 0 },
          ]);

        setStats({
          totalStudents: studentsData.total ?? 0,
          totalCourses: coursesData.total ?? 0,
          publishedCourses: publishedData.total ?? 0,
          totalQuizzes: quizzesData.total ?? 0,
        });
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
      } finally {
        setStatsLoading(false);
      }
    }

    async function fetchActivity() {
      try {
        const [studentsRes, coursesRes, quizzesRes] = await Promise.all([
          fetch("/api/admin/list-students?limit=4", { credentials: "include" }),
          fetch("/api/admin/courses?limit=4", { credentials: "include" }),
          fetch("/api/admin/quizzes?limit=4", { credentials: "include" }),
        ]);

        const [studentsData, coursesData, quizzesData] = await Promise.all([
          studentsRes.ok ? studentsRes.json() : { students: [] },
          coursesRes.ok ? coursesRes.json() : { data: [] },
          quizzesRes.ok ? quizzesRes.json() : { data: [] },
        ]);

        const activities: (ActivityItem & { rawDate: string })[] = [];
        for (const s of studentsData.students ?? []) {
          activities.push({ id: `student-${s.id}`, description: `New student registered: ${s.name || s.email}`, timestamp: "", rawDate: s.created_at });
        }
        for (const c of coursesData.data ?? []) {
          activities.push({ id: `course-${c.id}`, description: c.is_published ? `Course "${c.title}" published` : `Course "${c.title}" created`, timestamp: "", rawDate: c.created_at });
        }
        for (const q of quizzesData.data ?? []) {
          activities.push({ id: `quiz-${q.id}`, description: `Quiz "${q.title}" created`, timestamp: "", rawDate: q.created_at });
        }

        activities.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
        setRecentActivity(activities.slice(0, 6).map(({ rawDate, ...a }) => ({ ...a, timestamp: timeAgo(rawDate) })));
      } catch (err) {
        console.error("Failed to fetch recent activity:", err);
      } finally {
        setActivityLoading(false);
      }
    }

    fetchStats();
    fetchActivity();
  }, []);
```

### After

```tsx
export default function DashboardPage() {
  const [statsLoading, setStatsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ ... });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        // All 7 requests fire simultaneously in a single Promise.all
        const [
          studentsCountRes,
          coursesCountRes,
          publishedCountRes,
          quizzesCountRes,
          studentsListRes,
          coursesListRes,
          quizzesListRes,
        ] = await Promise.all([
          fetch("/api/admin/list-students?limit=1", { credentials: "include" }),
          fetch("/api/admin/courses?limit=1", { credentials: "include" }),
          fetch("/api/admin/courses?isPublished=true&limit=1", { credentials: "include" }),
          fetch("/api/admin/quizzes?limit=1", { credentials: "include" }),
          fetch("/api/admin/list-students?limit=4", { credentials: "include" }),
          fetch("/api/admin/courses?limit=4", { credentials: "include" }),
          fetch("/api/admin/quizzes?limit=4", { credentials: "include" }),
        ]);

        // Parse all 7 responses simultaneously
        const [
          studentsCountData,
          coursesCountData,
          publishedCountData,
          quizzesCountData,
          studentsListData,
          coursesListData,
          quizzesListData,
        ] = await Promise.all([
          studentsCountRes.ok ? studentsCountRes.json() : { total: 0 },
          coursesCountRes.ok ? coursesCountRes.json() : { total: 0 },
          publishedCountRes.ok ? publishedCountRes.json() : { total: 0 },
          quizzesCountRes.ok ? quizzesCountRes.json() : { total: 0 },
          studentsListRes.ok ? studentsListRes.json() : { students: [] },
          coursesListRes.ok ? coursesListRes.json() : { data: [] },
          quizzesListRes.ok ? quizzesListRes.json() : { data: [] },
        ]);

        // Stats
        setStats({
          totalStudents: studentsCountData.total ?? 0,
          totalCourses: coursesCountData.total ?? 0,
          publishedCourses: publishedCountData.total ?? 0,
          totalQuizzes: quizzesCountData.total ?? 0,
        });

        // Recent activity
        const activities: (ActivityItem & { rawDate: string })[] = [];
        for (const s of studentsListData.students ?? []) {
          activities.push({ id: `student-${s.id}`, description: `New student registered: ${s.name || s.email}`, timestamp: "", rawDate: s.created_at });
        }
        for (const c of coursesListData.data ?? []) {
          activities.push({ id: `course-${c.id}`, description: c.is_published ? `Course "${c.title}" published` : `Course "${c.title}" created`, timestamp: "", rawDate: c.created_at });
        }
        for (const q of quizzesListData.data ?? []) {
          activities.push({ id: `quiz-${q.id}`, description: `Quiz "${q.title}" created`, timestamp: "", rawDate: q.created_at });
        }

        activities.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
        setRecentActivity(activities.slice(0, 6).map(({ rawDate, ...a }) => ({ ...a, timestamp: timeAgo(rawDate) })));
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setStatsLoading(false);
        setActivityLoading(false);
      }
    }

    fetchDashboard();
  }, []);
```

> **Key differences:**
>
> - The two sequential `fetchStats()` + `fetchActivity()` calls (which each internally `await` a `Promise.all`) are replaced by one function.
> - All 7 fetch requests now start at the same time. Previously, `fetchStats` and `fetchActivity` ran concurrently at the function level but each had its own internal sequential JSON parse `await Promise.all` — this is preserved and combined.
> - Both loading states (`setStatsLoading(false)` and `setActivityLoading(false)`) are now set together in a single `finally` block. The loading spinners in the JSX are unchanged and still work correctly.

---

## Summary of Changes

| File                 | Change                                                                                   | Reason                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `Header.tsx`         | Replace `setInterval(30s)` with Supabase Realtime channel subscription                   | Eliminates 30 s polling; updates badge instantly on any DB change                          |
| `Header.tsx`         | Add `import { createClient } from "@/lib/supabase/client"`                               | Required for Realtime subscription                                                         |
| `dashboard/page.tsx` | Merge `fetchStats` + `fetchActivity` into single `fetchDashboard` with one `Promise.all` | Reduces 2 sequential async boundaries to 1; all 7 requests fire in parallel from the start |
