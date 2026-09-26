# Learning session creation and frontend bridge

## 1. Database setup

Apply `supabase/migrations/012_learning_session_delivery.sql` after 010 and 011. Migration 011 is already present in the local database. Migration 012 has since been applied locally by the user.

012 adds start-request idempotency columns to `learning_sessions` and authenticated RPCs for session creation, resume, the module catalogue, and media authorization. These functions derive identity from `auth.uid()`. Internal access and presentation helpers cannot be called directly by application roles. Student table-write privileges remain unchanged.

The local database had **zero published rich module revisions** when inspected. Applying 012 alone will therefore show the new empty state. A teacher-owned, published course and quiz need a published `quiz_revisions` row with revision items, question revisions, and private keys from 010 before a session can start. The existing legacy MCQ authoring flow does not automatically create these rows. The rich teacher editor is now implemented in [Stage 5](RICH_TEACHER_EDITOR.md); apply migration 013 to use it. Legacy backfill remains separate, and no sample curriculum was inserted into live data.

## 2. Start API

Route: `src/app/api/student/sessions/start/route.ts`.

```ts
const request = {
  moduleId: publishedModule.id, // Stable quizzes.id from GET /api/student/modules.
  mode: 'lesson',
  idempotencyKey: crypto.randomUUID(),
};
const response = await fetch('/api/student/sessions/start', {
  method: 'POST',
  credentials: 'same-origin',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(request),
});
```

Alternatively send `courseId` instead of `moduleId`. Exactly one target is required. For a course, the server selects the earliest published eligible module, preferring free modules for unsubscribed students. Keep the exact request and key for retries; never generate a new key just because a response was lost.

The authenticated database transaction:

1. Validates the target, mode, and request key; rejects arbitrary identity/question/reward fields.
2. Checks active student status and password-reset requirements, then locks the student's totals row.
3. Resolves an existing request or rejects changed content under the same key.
4. Rechecks approved/active teacher ownership, published course and quiz, and premium entitlement through the existing `profiles.has_subscription` flag.
5. Pins the published module and question revisions, counts, review eligibility, and randomized opaque option/token display order.
6. Inserts the session and every session question atomically.
7. Returns `StartedSession`: session metadata, presentation-only exercises, saved receipts, and trusted totals.

The key table is only checked for existence during creation; `assessment` never enters the returned DTO. Nested presentation fields are explicitly projected rather than spreading authoring JSON. Feedback is returned only through receipts after an answer is committed.

Modes are `lesson`, `review`, `daily`, `words`, and `listening`. Lesson/review/daily sessions contain the full selected module and pin its revision. Words/listening filter the appropriate types and follow migration 011's current-live-membership rule. Gentle review includes the module's questions; only questions due at creation receive `reviewEligible = true`. Correct review answers can restore hearts even when no reviews are due.

All newly created sessions use **UTC**. The client cannot change the time zone or reward day. The UI labels UTC streaks and daily reset behavior. An account time-zone preference would need its own trusted policy before changing this default.

## 3. Supporting delivery routes

| Endpoint | Purpose |
| --- | --- |
| `GET /api/student/modules` | Published module metadata, premium lock state, trusted totals, completions, due-review counts, activity dates, and recent active sessions |
| `GET /api/student/sessions/[sessionId]` | Resume owned sessions with original presentation/order and committed receipts; recheck current entitlement |
| `GET /api/student/sessions/[sessionId]/assets/[assetId]` | Check ownership, entitlement and question-asset links; redirect to a private 60-second signed URL |
| `POST /api/student/sessions/[sessionId]/submit` | Existing migration 011 grading and transactional rewards |

All responses are private/no-store. Start and submit reject cross-origin writes. The bridge supplies `X-Learning-User`; API routes reject an account mismatch instead of attaching an in-flight request to a newly signed-in user. Database checks remain authoritative even for direct RPC calls.

Media delivery is the only new path that uses the service-role client, and only after an authenticated RPC authorizes the exact asset. Presentation assets can play before answering; feedback-only assets require a committed answer. Asset records must be ready and linked to the question revision before publication. TTS uses browser French speech synthesis; a transcript is available for listening questions when playback is unavailable.

## 4. Frontend wiring

- `StudentLearningApp.tsx` discovers real modules and renders trusted totals. It no longer imports the bundled question bank or invokes local `recordAnswer` / `completeSession` grading.
- `useTrustedLearning.ts` owns catalogue loading, idempotent starts, resume, and monotonic totals updates.
- `TrustedLesson.tsx` renders the four presentation contracts: multiple choice, typed recall, sentence building, and listening choice. Option/token labels are separate from opaque submitted IDs.
- `lib/gamification/client.ts` centralizes authenticated fetch/error handling and rejects older totals revisions when processing retry receipts.
- `Onboarding.tsx` preserves preference editing without pulling the legacy question bank into this runtime.
- `types/gamification.ts` now includes start, delivery and catalogue DTOs.

Answers stay frozen during a pending/uncertain submission. Retry sends the same answer, assistance metadata, and idempotency key. The UI advances and changes rewards only after receiving a confirmed receipt. Session conflicts offer a reload; empty hearts direct the learner to a review session. Closing a session retains database answers, and the dashboard offers resume.

The existing learning-progress snapshot now supplies **language/profile preferences only** to this shell. Its old client-computed XP, hearts, completion numbers and mistakes are not merged into the trusted ledger. Existing trusted totals from 011 are retained. Legacy XP import is a separate migration decision.

The student entry point remains `/temp/dashboard` in this checkout. This change does not alter auth, middleware, admin pages, or establish the separately planned `/student/*` namespace. Legacy course/quiz library links are preserved; those legacy quiz submissions do not become secure merely by adding this bridge.

## 5. Verification

```sh
node --test tests/gamification/*.test.mjs tests/learning/*.test.mjs
node tests/gamification/delivery-database.mjs
npx tsc --noEmit
NEXT_DIST_DIR=.next-build-check npm run build
```

The database runner targets the local `supabase_db_french_learno` container, installs 012 in the transaction if needed, supplies synthetic fixtures, and rolls everything back. It verifies full start → four graded answers → rewards → resume; stable retries; private grading isolation; course targeting; practice filters; foreign-session denial; premium gating; and live teacher-approval withdrawal. The HTTP/client suite covers malformed/oversized requests, cross-origin rejection, account switches, RPC dispatch, sanitized errors, and totals revisions. The production build passes with existing unrelated lint warnings.

Browser end-to-end validation against published production content is still pending the application of 012 and publication of a rich module. No test results here claim that the new teacher authoring stage or curriculum backfill is finished.
