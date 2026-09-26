# Student UI integration: execution plan and handoff

## Scope

Integrate the `../app` gamified French MVP into the existing Next.js 15 student route at `/temp/dashboard`. Keep the source MVP intact. Keep current student/admin login, signup, Supabase clients, middleware, RBAC helper, admin dashboard, admin APIs and admin components unchanged. Preserve the existing uncommitted auth changes found at the start of this integration.

## Execution plan and exact file map

1. Copy the MVP's active component dependency graph into a separate student namespace. On macOS, `button.tsx` and the existing `Button.tsx` collide; never merge these directly into the same directory.

   | Source in `../app` | Destination in `french_learno` |
   | --- | --- |
   | `app/page.tsx` | `src/components/learning/StudentLearningApp.tsx` (adapted to authenticated progress) |
   | `components/learning/flows.tsx` | `src/components/learning/flows.tsx` |
   | `components/learning/views.tsx` | `src/components/learning/views.tsx` |
   | `components/ui/button.tsx` | `src/components/ui/learning/button.tsx` |
   | `components/ui/input.tsx` | `src/components/ui/learning/input.tsx` |
   | `components/ui/separator.tsx` | `src/components/ui/learning/separator.tsx` |
   | `components/ui/skeleton.tsx` | `src/components/ui/learning/skeleton.tsx` |
   | `components/ui/sheet.tsx` | `src/components/ui/learning/sheet.tsx` |
   | `components/ui/tooltip.tsx` | `src/components/ui/learning/tooltip.tsx` |
   | `components/ui/sidebar.tsx` | `src/components/ui/learning/sidebar.tsx` |
   | `components/ui/dialog.tsx` | `src/components/ui/learning/dialog.tsx` |
   | `components/ui/radio-group.tsx` | `src/components/ui/learning/radio-group.tsx` |
   | `components/ui/switch.tsx` | `src/components/ui/learning/switch.tsx` |
   | `components/ui/progress.tsx` | `src/components/ui/learning/progress.tsx` |
   | `hooks/use-mobile.ts` | `src/hooks/use-mobile.ts` |
   | `lib/learning/model.ts` | `src/lib/learning/model.ts` (stronger database payload validation) |
   | `lib/learning/content.ts` | `src/lib/learning/content.ts` |
   | `app/globals.css` | `src/components/learning/student-learning.css` (scoped adaptation) |
   | `public/learning-mascot.png` | `public/learning/learning-mascot.png` |

   Only the eleven used UI primitives are migrated. Unused catalog components are left in the MVP. No Vinext, Cloudflare, Sites deployment configuration, React upgrade, or Next upgrade is brought into production.

2. Isolate styling without changing the production Tailwind configuration.

   - Every student CSS selector starts with `.lla-student`.
   - All theme variables are renamed `--lla-*`; copied primitives use arbitrary-value Tailwind utilities referencing those variables.
   - No new `@import "tailwindcss"`, global preflight, `@theme`, `body`, or `:root` rule is added.
   - New `src/components/ui/learning/portal.tsx` keeps dialogs, sheets and tooltips inside the student theme boundary. Portal content therefore inherits the student palette without changing the body or admin theme.
   - Existing `src/app/globals.css`, root layout, PostCSS configuration, `src/lib/utils.ts`, and existing UI components are preserved.

3. Replace only the student entry point and adapt its layout.

   **Modified:**
   - `src/app/temp/dashboard/page.tsx`: server entry point, existing `requireStudentPage` guard, server-side progress read, client app props keyed to the authenticated user.
   - `src/app/temp/dashboard/layout.tsx`: delegates to the new route-aware frame.

   **Added:**
   - `src/app/temp/dashboard/StudentDashboardFrame.tsx`: the exact dashboard home owns its new navigation; course, quiz and account subroutes retain the existing layout and BottomNav.
   - `src/components/learning/LanguageSelection.tsx`: French selection before first use; returning students skip it.
   - `src/components/learning/ProgressSyncNotice.tsx`: save retry, revision conflict, and account/session change handling.

   Published courses, course quizzes and account settings remain reachable through the new shell. Their routes, subscription checks and backend data are not replaced by the sample curriculum.

4. Replace the MVP's two localStorage effects with account persistence.

   The original `../app/app/page.tsx` reads and writes `lla-progress-v1`. The migrated shell has neither operation; it uses:

   - `src/hooks/useLearningProgress.ts`: account-bound state interface, session-change listener, navigation save barrier and pending-save unload protection.
   - `src/lib/learning/progress.ts`: typed state envelope, French selection, revision and mutation validation.
   - `src/lib/learning/progress-sync.ts`: serialized writes, stable retry IDs, newest-state preservation and explicit conflict handling.
   - `src/lib/learning/progress-server.ts`: cookie-client reads with RLS; no service-role key.
   - `src/app/api/student/learning-progress/route.ts`: authenticated GET/PUT, student/active role checks, no-store responses, same-origin writes, user-ID guard, bounded validated JSON and optimistic revision checks.
   - `supabase/migrations/007_student_learning_progress.sql`: isolated per-student table and owner/student RLS policies. No existing table, auth trigger or admin policy changes.

   The server derives record ownership from `auth.getUser()`. The `X-Learning-User` header is only a comparison against that verified identity, preventing an old page from writing its state after another account signs in. It never grants access. A revision mismatch stops writes instead of silently replacing another device's work. Network retries retain their original mutation ID. Reads that fail never become an empty save. Initial page loads do not write anything.

   This is snapshot synchronization: another device sees progress when it reloads. It is not a realtime subscription. Older MVP localStorage is deliberately not imported into an arbitrary signed-in account.

5. Add only required dependencies.

   **Modified:** `package.json`, `package-lock.json`, `yarn.lock`.
   Added `lucide-react` and `radix-ui`; existing Next.js 15.5.9, React 19.1 and Tailwind v4 stay in place. Both existing lockfiles were updated by npm.

6. Verify and roll out.

   **Added tests:**
   - `tests/learning/compile.mjs`: temporary TypeScript compilation for Node tests; no extra test framework.
   - `tests/learning/progress.test.mjs`: game model and sync queue.
   - `tests/learning/api.test.mjs`: actual route handlers against a mocked cookie client/database.
   - `tests/learning/style-boundary.test.mjs`: CSS, portal and storage isolation.

## Verification results

- All 17 tests passed: `node --test tests/learning/*.test.mjs` (Node 20.11+).
- ESLint passed for migrated and added code.
- Tailwind utility compilation passed, including the scoped semantic colors and sidebar width.
- All student stylesheet selectors are scoped; none replace global theme tokens.
- The production bundle compiled successfully. Full `npm run build` remains blocked during type validation by existing errors in `src/lib/supabase/page-auth.ts` at lines 41, 48, 50 and 52: `GenericStringError` does not expose `role`, `has_subscription`, or `name` after the dynamically assembled select string. These errors were recorded before any edits. That protected file is unchanged; no ignoreBuildErrors setting or type suppression was added.
- The old student page's three existing `user_metadata`/`email` type errors were removed with its replacement.
- Protected admin/auth/shared configuration files were compared against pre-edit hashes and preserved, including the user's uncommitted auth edits.

The automated API tests use a mocked Supabase client. The subsequent local repair was also verified against the running database and in a browser, as recorded below. No production deployment was made.

## Local repair and verification — 20 September 2026

The post-login retry screen was caused by migration 007 being absent from the running local Supabase database. PostgREST returned HTTP 404 / `PGRST205` for `student_learning_progress`. Migration history confirmed 001–006 were already applied and only 007 was pending. Running `supabase migration up --local` applied 007 successfully; the table now returns HTTP 200.

Verified using disposable local student accounts:

- Existing student login → French selection → gamified dashboard showing “Progress saved”.
- Refresh → dashboard directly, with French selection retained in PostgreSQL.
- Authenticated API initial read, language insert, XP update and subsequent reload all succeed.
- Retrying the same mutation does not increment its revision again; stale writes return HTTP 409.
- A second student cannot read or update the first student's progress through RLS; anonymous table access is denied.
- All 67 protected auth, admin and shared files match their pre-integration hashes.

Temporary test accounts and their progress were removed after verification. No real student's progress was edited. Migration 007 is applied locally; other environments still need the rollout below.

## Database rollout: required in other environments before end-to-end use

1. Review `supabase/migrations/007_student_learning_progress.sql` and test it in your Supabase staging environment. Follow the project's existing migration workflow; confirm migrations 005/006 are accounted for in that environment before advancing the migration history.
2. Apply migration 007 through your normal deployment process. It creates only `student_learning_progress`, with one row per existing profile and French as the initially supported language.
3. Resolve the existing `page-auth.ts` typing issue in a separately authorized change. It can be addressed without changing redirect behavior, but was left untouched under the integration constraint.
4. Run the production build and sign in through the existing student login. Verify: first login → French selection → dashboard; repeat login → dashboard directly; answer/review → refresh → progress retained.
5. Verify two student accounts cannot read or write each other's rows, anonymous users cannot access progress, admins are redirected exactly as before, and a second tab receives a conflict rather than overwriting newer progress.
6. Check `/dashboard`, `/temp/dashboard/courses`, `/temp/dashboard/quizzes`, and `/temp/dashboard/profile` in their existing themes. In the student dashboard, verify desktop/mobile layout, keyboard navigation, lesson dialogs and save failures.

Before migration 007 is present, the dashboard deliberately shows a retryable progress-loading error. It does not revert to localStorage or claim unsaved progress is durable.

## Remaining production work

The gamified foundation course still uses the MVP's authored French questions. Admin-published courses/quizzes continue through their existing routes; mapping that content into the game question schema is separate work. XP and hearts are still computed by the migrated client model and stored as user-owned practice data, not authoritative grades, real-money balances, or leaderboard scores. Move scoring to validated server-side answer events before adding competitive rankings or valuable rewards. Actual quiz/course completion analytics are untouched.
