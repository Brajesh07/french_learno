# Admin moderation and student–teacher assignments

Implemented and verified locally on 26 September 2026.

## Admin read-only moderation

- `/dashboard/courses/[id]` uses the same `CourseText` and `CourseMedia` renderers as the student reader. It displays formatted text, images, audio, video/YouTube embeds, and links to the course's modules and quizzes.
- `/dashboard/quizzes/[id]` previews all four rich question types, with selectable published, draft, and archived revisions. Legacy MCQs remain viewable.
- `src/lib/staff/content-read.ts` verifies the active Admin before reading through existing Admin SELECT policies. Revision IDs are scoped to the requested quiz. Concurrent draft changes fail rather than mixing revisions.
- `src/components/staff/AdminQuizPreview.tsx` reuses `ExercisePresentation`, the presentation component extracted from `TrustedLesson`. Answers and tokens can be tried locally; there are no Edit, Save, Publish, Submit, XP, or Hearts controls. It never creates a student session or calls the grading API.
- Answer keys and teaching notes are available only after Admin authorization. Private media uses the Admin-only GET endpoint `/api/admin/learning-assets/[id]`, with short-lived signed URLs and no-store responses.

## Assignment workflow

1. Open **Admin → Students → a student** (`/dashboard/students/[uid]`).
2. In **Teacher assignment**, select an active, approved teacher and click **Assign teacher**.
3. Select a different approved teacher to reassign, or click **Unassign** to remove access. Existing learning history is preserved.
4. The teacher sees their current roster under **My students** (`/teacher/students`).
5. Students refresh the dashboard, return focus to it, or click **Check assignment** to load the current assignment.

There is one active teacher per student. Unassignment ends the current `teacher_students` row; reassignment ends it and creates a new row. No real student assignments were created during implementation.

## API and database contract

`GET /api/admin/student/[uid]/assignment` returns:

```ts
{
  assignment: null | {
    id: string;
    teacherId: string;
    teacherName: string;
    status: string;
    active: boolean;
  };
  teachers: { id: string; name: string; email: string }[];
}
```

`PUT` to the same URL accepts exactly:

```json
{
  "teacherId": "approved-teacher-uuid-or-null",
  "expectedAssignmentId": "current-assignment-uuid-or-null"
}
```

Use JSON `null`, not the literal strings above, when unassigning or when no current assignment exists. The response is the refreshed GET shape. Stale conflicting changes return HTTP 409. Repeating the already-applied desired state is safe.

The API validates Admin authorization, request origin, JSON fields, and IDs. The `assign_student_teacher` RPC repeats authorization inside the transaction, locks the student record, verifies teacher approval, updates assignment history, and writes an audit event. Direct authenticated INSERT/UPDATE/DELETE on `teacher_students` is revoked.

`list_assigned_students()` authorizes approved teachers and returns only their current assigned students. It exposes the specific roster fields without broadening general profile RLS.

`GET /api/student/modules` already calls `get_learning_catalogue()`. Migration 015 adds:

```ts
assignment: null | { id: string; teacherId: string; teacherName: string };
```

The catalogue returns modules owned by that teacher, while retaining existing publication and Freemium checks. A paid subscription does not bypass teacher assignment. An inactive or unapproved teacher is treated as unavailable.

When `assignment` is null, the student Home/Learn/Play views hide the learning path and display:

> You have not been assigned to a teacher yet. Please wait or contact your administrator.

Assignment changes clear the active frontend session and pending start request. Historical totals, rewards, and completed sessions remain intact.

## Access enforcement

Filtering is enforced in the database, not only in React:

- Catalogue and resumable sessions are limited to the assigned teacher.
- Session creation, resumption, course material, media delivery, and answer submission check current assignment.
- Assignment writes and trusted submissions lock the student profile so reassignment cannot race a reward transaction.
- The original audited grader is retained as a private implementation; direct execution is revoked. The public submission wrapper checks assignment even before returning an old receipt.
- Direct course/quiz SELECT policies enforce assignment and entitlement. Legacy student pages use cookie-authenticated reads. Legacy submission verifies that every submitted question/option belongs to the authorized quiz.
- Existing Admin and teacher content read policies remain in place.

## Files and rollout

- Migration: `supabase/migrations/015_student_teacher_assignments.sql`
- Assignment API: `src/app/api/admin/student/[uid]/assignment/route.ts`
- Admin form: `src/components/staff/StudentAssignment.tsx`
- Teacher roster: `src/app/teacher/(approved)/students/page.tsx`
- Student empty state: `src/components/learning/StudentLearningApp.tsx`
- Student catalogue/session state: `src/hooks/useTrustedLearning.ts`
- Catalogue type: `src/types/gamification.ts`

Migration 015 was applied successfully to the local Supabase database after rollback-only validation. Apply it after 014 in other environments before deploying the frontend/API changes. It intentionally aborts if a student already has multiple active assignment rows; resolve those assignments explicitly before retrying. The SQL is safe to rerun: functions are replaced, the index is created only if absent, policies are replaced transactionally, and the original grader is renamed only once. Grants and revokes can be replayed. Rerunning the SQL does not seed or reset application data.

Existing students without assignments will see the new empty state until an Admin assigns them. Existing Admin-authored courses are not automatically reassigned to teachers.

## Verification

- All 45 gamification/learning unit and API tests passed.
- Five rollback-only database suites passed: submission, delivery, teacher authoring, course material, and assignments. These cover unassigned access, role restrictions, stale Admin updates, assignment history, cross-teacher isolation, deactivation, private keys, entitlement, and reward integrity.
- Production build passed, including type checking. Six existing unused-variable lint warnings remain outside the new functionality.
- Browser checks used synthetic fixtures to verify four-type Admin preview interactions, answer-key display, assignment/unassignment success, and formatted course/media controls. No real accounts were modified. Actual remote media playback and a full authenticated browser journey were not tested.
- Temporary browser fixture routes were removed before the production build.

Commands:

```sh
node --test tests/gamification/*.test.mjs tests/learning/*.test.mjs
node tests/gamification/database.mjs
node tests/gamification/delivery-database.mjs
node tests/gamification/authoring-database.mjs
node tests/gamification/material-database.mjs
node tests/gamification/assignment-database.mjs
NEXT_DIST_DIR=.next-build-check npm run build
```
