# Rich teacher editor — Stage 5

## 1. Apply the additive migration

Apply `supabase/migrations/013_rich_teacher_authoring.sql` after 012. **013 has been tested in rolled-back transactions and remains unapplied locally.** Deploy the migration before the new application code: the editor and legacy quiz filters depend on its new columns.

The migration adds:

- `quiz_revisions.edit_version` for stale-write protection.
- A private idempotency receipt table, `teacher_revision_writes`. It stores request fingerprints and revision receipts, not duplicate grading documents.
- A narrowly scoped, service-role-only transaction function, `write_teacher_revision`.
- `quizzes.learning_runtime`, separating legacy MCQs from rich modules. Existing quizzes with rich revisions are marked `gamified`; ordinary MCQs remain `legacy`.

Browser roles cannot call the new write RPC or modify the revision tables. API routes verify the cookie-authenticated approved teacher before invoking the service function. The function locks and rechecks that teacher's active/approved status and content ownership, so rejection cannot race a successful save or publish.

## 2. Server APIs

| Method and route | Implementation | Behavior |
| --- | --- | --- |
| `POST /api/teacher/modules` | `src/app/api/teacher/modules/route.ts` | Create a module or save a new version of its draft |
| `GET /api/teacher/modules/[id]` | `src/app/api/teacher/modules/[id]/route.ts` | Load the owner's latest document, including private assessment and feedback |
| `POST /api/teacher/modules/[id]/publish` | `src/app/api/teacher/modules/[id]/publish/route.ts` | Revalidate the stored document and publish the expected draft atomically |
| `GET /api/teacher/assets/[id]` | `src/app/api/teacher/assets/[id]/route.ts` | Preview an owned ready asset using a private signed URL |

Shared server code:

- `src/lib/gamification/authoring.ts`: strict recursive runtime validation and authoring request types. Also runs in the editor to show field-specific errors.
- `src/lib/gamification/authoring-server.ts`: cookie-client/RLS reads with explicit ownership filters and a version recheck to reject a mixed concurrent-read snapshot.
- `src/lib/gamification/authoring-http.ts`: streamed 1 MiB request limit, JSON/CSRF checks, no-store responses, and sanitized errors.

### Save a draft

```ts
const request = {
  mutationId: crypto.randomUUID(),
  moduleId: null,        // Existing module: its quizzes.id.
  baseRevisionId: null,  // Existing module: the revision loaded by the editor.
  expectedVersion: 0,   // Existing module: its loaded editVersion.
  document,
};

const response = await fetch('/api/teacher/modules', {
  method: 'POST',
  credentials: 'same-origin',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(request),
});
```

The document has `schemaVersion`, `courseId`, `title`, `description`, `objective`, `kind`, `proficiency`, `accessTier`, `passingScore`, and `questions`. Each question contains a stable `questionId`, `type`, `presentation`, `assessment`, and `feedback`. The question contract derives from `AuthoringExercise` in `types/gamification.ts`; revision IDs, revision numbers and fixed language/reward metadata are assigned by the server. The initial editor uses French, English instructions, easy difficulty, empty tags/skill arrays, and the existing standard/builder reward policy.

The response is:

```ts
{ moduleId, revisionId, editVersion, status: 'draft' }
```

Retain the same mutation key and payload after a timeout. An exact retry returns the existing receipt. A changed payload under that key or a stale edit version is rejected instead of overwriting another editor's work.

Saving inserts/replaces draft module items, but **appends** question revisions and private keys. It never edits an existing question snapshot. Stable question lineage IDs preserve reward caps and review identity across edits. Private assessment and feedback are written only to `quiz_question_keys`; legacy question rows are neutral lineage anchors with no answer rows.

Draft saves require a complete, structurally valid module with 1–50 questions. Draft means “saved but not visible to students”; this first editor does not persist arbitrary incomplete form states. Local edits stay in memory, and leaving with unsaved changes triggers the browser's normal warning. No private authoring data is stored in localStorage.

### Publish a draft

```ts
await fetch(`/api/teacher/modules/${saved.moduleId}/publish`, {
  method: 'POST',
  credentials: 'same-origin',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mutationId: crypto.randomUUID(),
    moduleId: saved.moduleId,
    revisionId: saved.revisionId,
    expectedVersion: saved.editVersion,
  }),
});
```

The API reloads and validates the persisted authoring document. The transaction checks the same version again, requires a published course owned by the teacher, archives the previous live revision, publishes the draft, and updates the parent quiz's live metadata. All changes commit together. A new draft based on a published revision leaves the old live revision available until replacement publication.

The module cannot move between courses: moving would change access for existing pinned sessions. Create a new module in the other course instead. Publication does not automatically publish the parent course or grant a subscription.

## 3. Teacher UI

- `/teacher/courses` and its existing create/edit forms continue to manage courses.
- `/teacher/quizzes` lists rich modules and existing legacy quizzes with revision/publication status.
- `/teacher/quizzes/new` opens the rich module editor. Optional `?courseId=...` preselects an owned course.
- `/teacher/quizzes/create` redirects to the new editor, preserving the course parameter.
- `/teacher/quizzes/[id]/edit` uses the rich editor when revisions exist; existing MCQ quizzes retain their legacy editor.

Components:

- `RichModuleEditor.tsx`: module settings, question outline, reordering, adding/removing questions, save/retry state, preview, publish, and authoring JSON inspection.
- `QuestionEditor.tsx`: four dynamic forms.
- `ModulePreview.tsx`: the shared `TrustedLesson` renderer with an isolated teacher preview transport. It makes no student submission requests and grants no XP, coins or progress.
- `rich-editor.css`: responsive styles scoped to the new editor classes.

| Type | Author enters | Generated private key |
| --- | --- | --- |
| Multiple choice | 2–6 distinct labels and one selected correct option | `single_option` + opaque `correctOptionId` |
| Typed recall | Accepted French answers, one per line, plus input length | `accepted_text`, `fr-basic-v1`, `acceptedAnswers` |
| Sentence builder | 2–20 individually identified tokens; click tokens in order for each accepted variant | `ordered_tokens` + `acceptedSequences` |
| Listening choice | French TTS text, speed, transcript, answer options and correct selection | `single_option` + `correctOptionId` |

Each type includes prompt/instructions, up to three hints, correct-answer display and an English explanation. Optional feedback includes IPA/respelling, a translated example and a culture note. IDs remain stable when labels change; repeated sentence words receive separate token IDs.

The current listening form creates **browser TTS**. File upload/asset ingestion is not added in this stage. The API validates existing ready asset references, verifies teacher ownership, and records presentation/feedback links before publication; existing audio references are preserved and can be previewed. A full recorded-media upload form remains separate work.

## 4. Student integration and boundaries

After 013 is applied, publish an owned course, create a complete rich module under it, save, preview, and publish. The existing student catalogue/session APIs from 012 discover the published revision automatically. Premium modules require the existing `profiles.has_subscription` entitlement.

Legacy mobile quiz reads/submissions and the old student MCQ library now filter `learning_runtime = 'legacy'`. This prevents a rich module from being rendered or graded through the old MCQ path. It does **not** otherwise redesign or claim to fix the remaining legacy submission behavior. Rich modules use the trusted session flow in `/temp/dashboard`.

No auth, middleware, admin authoring permissions or staff approval UX changed. No existing MCQ curriculum was automatically converted and no real lesson content was seeded. Tests use synthetic disposable fixtures.

## 5. Verification

```sh
node --test tests/gamification/*.test.mjs tests/learning/*.test.mjs
node tests/gamification/authoring-database.mjs
npx tsc --noEmit
NEXT_DIST_DIR=.next-build-check npm run build
```

The database runner installs 013 if needed inside a transaction, loads synthetic fixtures and rolls back. It covers save/publish retries, version conflicts, append-only revisions, live replacement, private grading isolation, failed-write rollback and teacher rejection. It also runs the full author → publish → student session → four graded answers flow.

HTTP/validator tests cover authorization, account switching, malformed/oversized documents, cross-origin writes, invalid option/sequence/audio contracts, persisted-document validation and safe errors. Browser checks used a temporary synthetic editor page to inspect all four forms and complete all four shared-renderer preview questions; that page was removed afterward. The migration remains available for the user's local application rather than being installed by the test runner.
