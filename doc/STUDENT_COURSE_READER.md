# Student dashboard cleanup and course reader

## Entry point and navigation

`/temp/dashboard` remains the deployed student entry point. Its only sidebar navigation is Home, Learn, Play, Leaderboard and Profile. View selection is reflected in `?view=learn` or `?view=profile`, so the merged profile can be linked directly. The old `/temp/dashboard/profile` page contains only an authenticated redirect to the merged profile; it no longer renders the legacy UI. Login, middleware, admin routes and teacher authoring are unchanged.

## Updated components

| File | Responsibility |
| --- | --- |
| `src/components/learning/StudentSidebar.tsx` | Single learning navigation; no course-library section or duplicate account links. |
| `src/components/learning/StudentProfile.tsx` | White account cards for plan, assigned French level, email and active status, alongside trusted progress and existing learning preferences. |
| `src/components/learning/NextChapterCard.tsx` | Separate grid cells for text and mascot, with progress and a full-width mobile action underneath. No absolute image positioning. |
| `src/components/learning/CourseStartDialog.tsx` | Read-material or skip-to-exercises choice, pending state and start-error feedback. |
| `src/components/learning/CourseMaterialReader.tsx` | Authenticated content loading, cancellation on exit, retry, media and the Start Exercises action. |
| `src/components/learning/CourseText.tsx` | Safe React rendering of the existing teacher editor's bold, italic, underline, inline code and lists; also accepts Markdown headings. Raw HTML is displayed as text. |
| `src/components/learning/StudentLearningApp.tsx` | Connects lesson selection, reading and the existing trusted session runtime. Review and resume flows retain their existing behavior. |
| `src/app/temp/dashboard/page.tsx` | Loads an explicit account-field allowlist through the authenticated Supabase client. Failed account reads are shown as unavailable, never assumed to mean Free. |

## Reader delivery

`GET /api/student/modules/[moduleId]/material` authenticates the cookie session, validates the module ID and checks the optional account-identity header. It calls `get_learning_material(uuid)` from migration `014_learning_course_material.sql` and returns private, non-cacheable responses.

The database function reuses `learning_delivery_module` to enforce active student status, password-reset restrictions, current module entitlement, published course/module state and active, approved teacher ownership. Its explicit JSON allowlist contains only course material and module metadata. No question grading keys or assessment feedback are read or returned. Existing table RLS policies are unchanged.

The migration was tested in a rolled-back fixture transaction and applied to the local development database. Apply `014_learning_course_material.sql` after the existing gamification migrations in any other environment before deploying these components.

## Content and session behavior

1. Start a lesson from Home or Learn to open the choice dialog.
2. **Skip to Exercises** calls the existing `/api/student/sessions/start` API with the module ID and its retained idempotency key.
3. **Read Course Material** loads the course text and media without creating a learning session or spending hearts.
4. **Start Exercises** invokes the same trusted session creation path. It rechecks access and pins the currently published question revision. Failed starts keep the reader/dialog available; retry behavior remains idempotent.
5. Courses without written material show an explicit empty state and still allow exercises.

Material currently belongs to the **course**, using the teacher course editor's `content_text`, image, audio and video fields. Module descriptions/objectives are also displayed. Modules in a course share its theory: do not place premium-only theory in a course that includes a free module. Course material is current content rather than an immutable question revision. Per-module, independently gated/versioned theory would need separate storage.

Audio/video controls are available without autoplay. YouTube links use the privacy-enhanced embed; other videos use native playback plus an external link fallback. Arbitrary HTML, scripts and iframe sources are never rendered from teacher text.

## Verification

- Automated route tests cover authentication, account changes, invalid IDs, access errors and private response headers.
- Database fixtures cover free/premium access, publication, teacher rejection, inactive accounts, mandatory password resets, staff/anonymous rejection, private-key exclusion and no session creation while reading.
- Formatting tests verify teacher-editor markup and escaping of malicious HTML.
- Desktop and phone browser previews cover card layout, dialog, reader, exercise handoff and account cards. These previews use synthetic data; they do not modify a real student's progress.
- Existing gamification and learning regression tests, TypeScript and the production build are checked before handoff.
