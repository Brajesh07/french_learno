# Secure gamification submission

Implemented endpoint: `POST /api/student/sessions/[sessionId]/submit`.

## Files and setup

1. Apply `supabase/migrations/011_secure_gamification_submission.sql` after 010. It adds a stored receipt and the authenticated transactional RPC, plus private grading/normalization helpers. **011 has since been applied to the local database.**
2. The route is `src/app/api/student/sessions/[sessionId]/submit/route.ts`.
3. Request validation, bounded streaming reads and safe error mapping are in `src/lib/gamification/submission.ts`.
4. Response contracts are in `src/types/gamification.ts`.

No service-role key is used by this endpoint. The Supabase cookie-authenticated client invokes `submit_learning_answer`; that function derives identity from `auth.uid()` and rechecks authorization. A direct authenticated RPC call receives the same protections as the route. Private helper functions cannot be called by application roles.

## Request

Use actual IDs issued by a trusted session-creation process. Neither this endpoint nor the browser may create a session or choose its reward policy. Retry the exact request with the same key after a network failure.

```json
{
  "schemaVersion": 1,
  "sessionId": "71000000-0000-4000-8000-000000000001",
  "sessionQuestionId": "81000000-0000-4000-8000-000000000001",
  "idempotencyKey": "91000000-0000-4000-8000-000000000001",
  "type": "multiple_choice",
  "response": { "optionId": "option-a" },
  "assistance": { "hintIds": [], "transcriptShown": false }
}
```

Other `response` shapes:

- `typed_recall`: `{ "text": "café" }`
- `sentence_builder`: `{ "tokenIds": ["token-x", "token-y"] }`
- `listening_choice`: `{ "optionId": "option-a" }`

IDs are opaque; labels and submitted correctness are never used as MCQ keys. Unknown fields, mismatched route/body session IDs, unsupported versions, duplicate tokens, foreign option/token IDs, invalid hints, and bodies over 16 KiB are rejected. Hint/transcript metadata is descriptive and never grants extra rewards.

## Authorization and transaction

For each new answer, the database:

1. Locks and verifies the active student profile, including `must_change_password`.
2. Locks that student's totals row, serializing submissions across sessions/tabs.
3. Resolves an identical retry or rejects reuse of its key for a different payload.
4. Locks the owned active session, checks its fully populated question set, requires the next unanswered item, and checks the request type against the pinned question revision.
5. Rechecks the author's active/approved teacher status, course ownership, course/quiz publication and a live published module revision. Premium content requires the existing admin-managed `profiles.has_subscription` flag. This flag currently has no expiry; this endpoint does not invent a subscription-expiry model.
6. Retrieves the private grading key and evaluates the answer within the transaction. No correctness, score, XP or coins are accepted from the caller.
7. Inserts the first-attempt response, reward ledger events, review updates and totals; optionally completes the session and awards completion bonuses.
8. Stores and returns a receipt containing permitted feedback, reward deltas and confirmed totals.

The final receipt is saved once before commit. A failure anywhere, including reward insertion, rolls back every write. An exact retry returns the original receipt even after the session completes. Its totals reflect the original totals revision; clients must not overwrite a newer displayed revision with an older receipt.

An active student can retrieve an already committed receipt after content withdrawal: it is their existing result, not new grading. New submissions always recheck content access. Inactive accounts cannot retrieve receipts through this RPC.

## Grading and rewards

| Rule | Implemented policy |
| --- | --- |
| MCQ/listening | Selected option ID must belong to the presented options; compare with the private correct ID |
| Typed recall | Compare against accepted answers after NFC, lowercasing, apostrophe normalization, selected punctuation removal and whitespace normalization; accents remain significant |
| Sentence builder | Validate unique token IDs against the bank, then compare the full ordered array against accepted sequences |
| Correct answer | 10 XP, or 20 for sentence builders; determined by server policy, not uploaded arbitrary reward amounts |
| Repeat practice | Full answer XP once per question lineage/day; an eligible due review has a separate unique review reward key |
| Wrong answer | Zero XP; lose one heart outside review |
| Review mode | No heart loss; correct answers restore one heart, capped at five |
| Zero hearts outside review | `409 HEARTS_EMPTY`; no answer is consumed. A server-issued review session can recover hearts |
| First passing lesson | 10 coins once per module lineage; equal-weight first attempts, using the pinned passing threshold |
| Perfect first passing lesson | Additional 50 XP; a later perfect replay cannot claim this bonus |
| First daily completion | 50 XP and 10 coins once per session activity date, regardless of accuracy |
| Review schedule | Wrong answers reset stage/due date; eligible correct due reviews advance through 1/3/7/21 days at most once per date |

A lesson session must include the entire pinned module question set; submitting a subset cannot manufacture a passing score. The final accepted answer automatically completes the session. The response includes `session` and `rewardBreakdown` so clients can distinguish answer XP from completion bonuses.

## Response and errors

A successful response has `responseId`, `sessionQuestionId`, `isCorrect`, `score`, `feedback`, `reward`, `totals`, `session`, and `rewardBreakdown`, following `ConfirmedAnswer`. The private `assessment` is never returned. Responses use `Cache-Control: private, no-store`.

- `400`: malformed payload or invalid option/token/hint.
- `401`: no valid cookie session.
- `403`: inactive/wrong-role account, forced password change, revoked author/content access, or no premium entitlement.
- `404`: session/question missing or not owned by the student.
- `409`: changed retry payload, an already-answered question, closed session, wrong question order, empty hearts, or a retryable transaction conflict.
- `413`: request too large.
- `415`: JSON content type required.
- `503`: storage/unexpected failure or invalid persisted grading content. Raw database errors and private keys are not exposed.

## Current boundaries

- Session creation, presentation delivery and frontend wiring are implemented by migration 012 and the [learning session bridge](LEARNING_SESSION_BRIDGE.md). Apply 012 before using those endpoints; new sessions use UTC.
- For lesson sessions, archived pinned revisions remain usable while the module still has a live published revision and the parent content remains published. Both pinned and current access tiers are checked.
- Mixed practice in schema 010 has no per-question source-module revision column. It therefore accepts only questions still present in the current live module. If removed, a new session is required. It never guesses access to a retired question.
- The new student shell reads trusted totals and completion dates through the session bridge. Bundled-content migration, old mobile submission replacement, active-time measurement and legacy XP import remain separate. Existing client-scored snapshots are used only for profile/language preferences by the new shell.
- The old mobile submission endpoint is not secured by adding this new endpoint; migrate or retire it separately before claiming every quiz path is secure.

## Verification

```sh
node --test tests/gamification/api.test.mjs
node tests/gamification/database.mjs
npx tsc --noEmit
```

The database runner targets only the named local Supabase container and uses a single rolled-back transaction. It tests the four graders, ownership, first-attempt uniqueness, exact retries, daily answer caps, completion bonuses, heart recovery, review scheduling, malformed keys, publication/approval/entitlement changes, and rollback after an injected reward-write failure. HTTP tests cover authentication, request validation, CSRF, byte limits, RPC arguments and sanitized errors.
