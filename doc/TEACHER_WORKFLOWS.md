# Teacher signup, approval, and authoring

Implemented and verified against local Supabase and the Next.js development server on 20 September 2026. No hosted database or production deployment was changed.

## 1. Database

The local database now has migrations through `009_teacher_workflows.sql`. Migration `008_account_role_security.sql` was absent from this local instance and was applied before 009.

- Existing migration 005 supplies `teacher_profiles`, `teacher_documents`, `teacher_students`, and content ownership columns.
- Migration 008 protects role/account fields and teacher approval fields, and adds active-account checks and the audit log.
- Migration 009 adds server-only teacher provisioning and signup throttling; approval/rejection with atomic audit logging; and approved-teacher course/quiz save functions.
- A signup always creates a teacher with `verification_status = 'pending'`. Submitted role, approval status, or owner values cannot grant privileges.
- Authoring functions derive ownership from `auth.uid()`. Authenticated clients cannot write directly to the content tables. Admins retain read access, but their old mutation APIs return 403.
- Rejecting an approved teacher unpublishes their courses and quizzes and revokes authoring access for existing sessions. Reapproval does not republish content automatically.

For another environment, apply the committed migrations in order before deploying these routes. Do not rerun the SQL manually against a database whose migration history already contains it. Never put the service-role key in a `NEXT_PUBLIC_*` variable.

## 2. Staff login and teacher application

Visit `/login` and choose **Sign Up as Teacher**. Provide name, username, email, password, and optional expertise/bio. The account is signed in and sent to `/teacher/pending`.

There is no signup OTP or confirmation email. The server provisions the email-confirmed Supabase account for this MVP; that flag is not evidence that the applicant proved email ownership. Administrative teacher approval remains separate. Password-reset OTP is not implemented by this block.

Key files:

- `src/app/login/page.tsx`
- `src/components/staff/StaffAuthForm.tsx`
- `src/app/api/auth/staff/login/route.ts`
- `src/app/api/auth/teacher-signup/route.ts`
- `src/app/teacher/pending/page.tsx`

Signup provisioning creates both application rows transactionally. If provisioning fails after Auth account creation, the API attempts to remove that new Auth account. Signup has shared database-backed limits of 60 attempts/hour globally and 5/hour per hashed email.

## 3. Administrator review

Sign in with an existing active admin and open **Teachers** in the sidebar, or visit `/dashboard/teachers`. Review the application and select **Approve** or **Reject**. The table refreshes after a successful decision; stale decisions return a conflict instead of overwriting another administrator's review.

Key files:

- `src/app/dashboard/teachers/page.tsx`
- `src/components/staff/TeacherTable.tsx`
- `src/app/api/admin/teachers/[id]/route.ts`
- `src/components/layout/Sidebar.tsx`
- `src/app/dashboard/layout.tsx`
- `src/components/staff/AdminShell.tsx`

The admin dashboard remains at `/dashboard`. Courses and quizzes there are read-only. Former create/edit pages return not-found, and former POST/PATCH/DELETE content APIs reject writes. Student management and other admin functionality stay on the existing surface.

## 4. Teacher workspace and ownership

An approved teacher signs in at `/login` and reaches `/teacher/courses`. A teacher already on the pending page can select **Check approval status** after approval.

Routes:

| Route | Purpose |
| --- | --- |
| `/teacher/pending` | Pending, rejected, or suspended application status |
| `/teacher/courses` | Teacher's own course catalogue |
| `/teacher/courses/create` | Create a course |
| `/teacher/courses/[id]/edit` | Edit an owned course and add quizzes |
| `/teacher/quizzes` | Teacher's own quiz catalogue |
| `/teacher/quizzes/create` | Create a quiz linked to an owned course |
| `/teacher/quizzes/[id]/edit` | Edit an owned quiz |

The `(approved)` route group does not appear in URLs. Its server layout checks approval, and every authoring API independently checks the authenticated user. Middleware provides redirects and cookie refresh; it is not the sole authorization boundary. The existing `FrenchLearnoApp` user-agent restriction keeps staff pages out of the mobile WebView surface.

Key files and folders:

- `src/app/teacher/layout.tsx`
- `src/app/teacher/(approved)/layout.tsx`
- `src/app/teacher/(approved)/courses/`
- `src/app/teacher/(approved)/quizzes/`
- `src/app/api/teacher/courses/`
- `src/app/api/teacher/quizzes/`
- `src/components/staff/ContentList.tsx`
- `src/components/staff/ContentReadOnly.tsx`
- `src/lib/staff/auth.ts`, `http.ts`, and `content-write.ts`
- `src/lib/supabase/auth-helpers.ts`
- `src/middleware.ts`

## 5. Verification

Passed:

- Production build with `NEXT_DIST_DIR=.next-build-check npm run build`.
- TypeScript (`npx tsc --noEmit`) and targeted ESLint for the changed staff, teacher, admin, and authorization files.
- All 17 existing student-learning regression tests.
- Local integration checks in `tests/staff/workflows.mjs`: forced pending signup, denied unapproved access, denied student/teacher approval, atomic approval/audit, stale-review conflict, course and quiz create/edit, invalid-quiz rollback, cross-teacher ownership restrictions, denied admin authoring, and rejection revoking access/unpublishing content.
- Browser checks: teacher signup → pending, admin login → approval table → approve, approved-teacher login → workspace, course creation, quiz creation, and reopening the saved quiz with correct answers intact.

Synthetic verification accounts and their content were removed afterward. Append-only audit entries from the local checks remain intentionally.

To rerun the local integration checks, start local Supabase and Next on port 3000, then run:

```sh
node --env-file=.env.local tests/staff/workflows.mjs
node --test tests/learning/*.test.mjs
```

The integration runner rejects non-local database URLs. It creates and removes synthetic accounts and content; do not use it against production.

## 6. Limits and separate follow-up work

- Existing platform content is preserved and is not automatically assigned to a teacher. An explicit ownership backfill is needed before a teacher can edit that content.
- A quiz with existing attempts cannot have its questions replaced. Create a new quiz to preserve student history. No content deletion UI is provided.
- Unsupported duration, course order, and quiz time-limit controls were removed from the migrated editors because the existing schema/API does not persist those values. Core content, publication state, passing score, questions, answers, and ownership are persisted.
- This block does not implement the separate `/student/*` migration, `/temp` legacy rewrites, password-recovery OTP, premium curriculum migration/RLS, or the previously identified mobile quiz-submission bypass. Student routes remain under `/temp`; this is not completion of the entire earlier platform roadmap.
