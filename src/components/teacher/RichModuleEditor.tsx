"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AuthoringError,
  validateDocument,
  type AuthoringDocument,
  type DraftWrite,
  type EditorSnapshot,
  type PublishWrite,
  type RevisionReceipt,
} from "@/lib/gamification/authoring";
import { newQuestion, QuestionEditor, questionTypes } from "./QuestionEditor";
import { ModulePreview } from "./ModulePreview";
import type { ExerciseType } from "@/types/gamification";
import "./rich-editor.css";
export type TeacherCourse = {
  id: string;
  title: string;
  is_published: boolean;
};
export function RichModuleEditor({
  userId,
  courses,
  initial = null,
  courseId,
}: {
  userId: string;
  courses: TeacherCourse[];
  initial?: EditorSnapshot | null;
  courseId?: string;
}) {
  const router = useRouter();
  const [document, setDocument] = useState<AuthoringDocument>(
    initial?.document ?? {
      schemaVersion: 1,
      courseId: courseId || courses[0]?.id || "",
      title: "",
      description: "",
      objective: "",
      kind: "lesson",
      proficiency: "A1",
      accessTier: "free",
      passingScore: 70,
      questions: [],
    },
  );
  const [snapshot, setSnapshot] = useState<
    RevisionReceipt | EditorSnapshot | null
  >(initial);
  const [selected, setSelected] = useState(0),
    [type, setType] = useState<ExerciseType>("multiple_choice");
  const [dirty, setDirty] = useState(!initial),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [conflict, setConflict] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [preview, setPreview] = useState<AuthoringDocument | null>(null);
  const pending = useRef<{
      action: "save" | "publish";
      input: DraftWrite | PublishWrite;
    } | null>(null),
    locked = useRef(false);
  const disabled = busy || uncertain || conflict;
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty || pending.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function edit(change: Partial<AuthoringDocument>) {
    setDocument((d) => ({ ...d, ...change }));
    setDirty(true);
    setNotice("");
  }
  function validate() {
    try {
      validateDocument(document);
      setError("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check the module fields.");
      if (e instanceof AuthoringError) {
        const index = e.path.match(/questions\[(\d+)\]/)?.[1];
        if (index !== undefined) setSelected(Number(index));
        else setSelected(-1);
      }
      return false;
    }
  }
  async function write(action: "save" | "publish") {
    if (locked.current || conflict) return;
    if (!pending.current) {
      if (!validate()) return;
      if (
        action === "publish" &&
        (!snapshot || snapshot.status !== "draft" || dirty)
      ) {
        setError("Save your draft before publishing.");
        return;
      }
      const input =
        action === "save"
          ? {
              mutationId: crypto.randomUUID(),
              moduleId: snapshot?.moduleId ?? null,
              baseRevisionId: snapshot?.revisionId ?? null,
              expectedVersion: snapshot?.editVersion ?? 0,
              document: structuredClone(document),
            }
          : {
              mutationId: crypto.randomUUID(),
              moduleId: snapshot!.moduleId,
              revisionId: snapshot!.revisionId,
              expectedVersion: snapshot!.editVersion,
            };
      pending.current = { action, input };
    }
    locked.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const attempt = pending.current;
      const response = await fetch(
        attempt.action === "save"
          ? "/api/teacher/modules"
          : `/api/teacher/modules/${attempt.input.moduleId}/publish`,
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            "X-Learning-User": userId,
          },
          body: JSON.stringify(attempt.input),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        if (response.status < 500) {
          pending.current = null;
          setUncertain(false);
          if ([401, 403, 404, 409].includes(response.status)) setConflict(true);
        } else setUncertain(true);
        throw new Error(data.error || "Unable to save this module.");
      }
      setSnapshot(data);
      setDirty(false);
      setUncertain(false);
      pending.current = null;
      setNotice(
        attempt.action === "save"
          ? "Draft saved. Preview it, then publish when ready."
          : "Published. Students with access can now start this module.",
      );
      // Keep local form state and its question IDs while upgrading the URL.
      if (!snapshot)
        window.history.replaceState(
          null,
          "",
          `/teacher/quizzes/${data.moduleId}/edit`,
        );
      router.refresh();
    } catch (e) {
      if (pending.current) setUncertain(true);
      setError(
        e instanceof Error
          ? e.message
          : "Connection interrupted. Retry the same request.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function add() {
    if (document.questions.length >= 50) return;
    edit({ questions: [...document.questions, newQuestion(type)] });
    setSelected(document.questions.length);
  }
  const current = document.questions[selected];
  const course = courses.find((c) => c.id === document.courseId);
  return (
    <section className="rich-editor">
      <header className="rich-heading">
        <div>
          <Link href="/teacher/quizzes">← My modules</Link>
          <p className="rich-eyebrow">TEACHER WORKSPACE</p>
          <h1>
            {snapshot ? "Edit learning module" : "Create a learning module"}
          </h1>
          <p>
            Build French lessons with English explanations, meaningful feedback
            and interactive practice.
          </p>
        </div>
        <span className="rich-badge">
          {dirty
            ? "Unsaved changes"
            : snapshot?.status === "published"
              ? "Published"
              : "Draft saved"}
        </span>
      </header>
      {!courses.length ? (
        <div className="rich-message">
          Create a course before adding its first module.{" "}
          <Link href="/teacher/courses/create">Create course →</Link>
        </div>
      ) : (
        <>
          {snapshot?.status === "published" && (
            <p className="rich-message">
              Saving edits creates a new draft. The published lesson stays
              available until you publish its replacement.
            </p>
          )}
          {error && (
            <div className="rich-error" role="alert">
              {error}
              {uncertain && (
                <p>
                  The result is uncertain. Retry sends the same request without
                  duplicating revisions.
                </p>
              )}
              {conflict && (
                <button
                  className="rich-secondary"
                  onClick={() => window.location.reload()}
                >
                  Discard local changes and reload
                </button>
              )}
            </div>
          )}
          {notice && (
            <p className="rich-message" role="status">
              {notice}
            </p>
          )}
          <fieldset disabled={disabled} className="rich-layout">
            <aside className="rich-outline">
              <h2>Module outline</h2>
              <button
                className={selected === -1 ? "selected" : ""}
                onClick={() => setSelected(-1)}
              >
                Module settings
              </button>
              <ol>
                {document.questions.map((q, i) => (
                  <li key={q.questionId}>
                    <button
                      className={selected === i ? "selected" : ""}
                      onClick={() => setSelected(i)}
                    >
                      <span>
                        {i + 1}.{" "}
                        {q.presentation.prompt.en || "Untitled question"}
                      </span>
                      <small>
                        {questionTypes.find((t) => t.value === q.type)?.label}
                      </small>
                    </button>
                  </li>
                ))}
              </ol>
              <label>
                New question type
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ExerciseType)}
                >
                  {questionTypes.map((t) => (
                    <option value={t.value} key={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="rich-secondary"
                disabled={document.questions.length >= 50}
                onClick={add}
              >
                + Add question
              </button>
              <small>{document.questions.length} / 50 questions</small>
            </aside>
            <main className="rich-card">
              {selected === -1 || !current ? (
                <>
                  <h2>Module settings</h2>
                  <div className="rich-question-fields">
                    <label>
                      Course
                      <select
                        value={document.courseId}
                        disabled={!!snapshot}
                        onChange={(e) => edit({ courseId: e.target.value })}
                      >
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                            {c.is_published ? "" : " (unpublished)"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Module title
                      <input
                        maxLength={200}
                        value={document.title}
                        onChange={(e) => edit({ title: e.target.value })}
                      />
                    </label>
                    <label>
                      Learning objective
                      <textarea
                        maxLength={2000}
                        value={document.objective}
                        onChange={(e) => edit({ objective: e.target.value })}
                      />
                    </label>
                    <label>
                      Description (optional)
                      <textarea
                        maxLength={4000}
                        value={document.description}
                        onChange={(e) => edit({ description: e.target.value })}
                      />
                    </label>
                    <div className="rich-settings-grid">
                      <label>
                        Module kind
                        <select
                          value={document.kind}
                          onChange={(e) =>
                            edit({ kind: e.target.value as "lesson" | "quiz" })
                          }
                        >
                          <option value="lesson">Lesson</option>
                          <option value="quiz">Quiz</option>
                        </select>
                      </label>
                      <label>
                        Level
                        <select
                          value={document.proficiency}
                          onChange={(e) =>
                            edit({
                              proficiency: e.target
                                .value as AuthoringDocument["proficiency"],
                            })
                          }
                        >
                          {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                            <option key={l}>{l}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Access
                        <select
                          value={document.accessTier}
                          onChange={(e) =>
                            edit({
                              accessTier: e.target.value as "free" | "premium",
                            })
                          }
                        >
                          <option value="free">Free</option>
                          <option value="premium">Premium</option>
                        </select>
                      </label>
                      <label>
                        Passing score (%)
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={document.passingScore}
                          onChange={(e) =>
                            edit({ passingScore: Number(e.target.value) })
                          }
                        />
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="rich-question-heading">
                    <h2>Question {selected + 1}</h2>
                    <div>
                      <button
                        className="rich-text-button"
                        disabled={selected === 0}
                        onClick={() => {
                          const qs = [...document.questions];
                          [qs[selected - 1], qs[selected]] = [
                            qs[selected],
                            qs[selected - 1],
                          ];
                          edit({ questions: qs });
                          setSelected(selected - 1);
                        }}
                      >
                        Move up
                      </button>
                      <button
                        className="rich-text-button"
                        disabled={selected === document.questions.length - 1}
                        onClick={() => {
                          const qs = [...document.questions];
                          [qs[selected + 1], qs[selected]] = [
                            qs[selected],
                            qs[selected + 1],
                          ];
                          edit({ questions: qs });
                          setSelected(selected + 1);
                        }}
                      >
                        Move down
                      </button>
                      <button
                        className="rich-text-button"
                        onClick={() => {
                          edit({
                            questions: document.questions.filter(
                              (_, i) => i !== selected,
                            ),
                          });
                          setSelected(Math.max(0, selected - 1));
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <QuestionEditor
                    question={current}
                    onChange={(q) =>
                      edit({
                        questions: document.questions.map((old, i) =>
                          i === selected ? q : old,
                        ),
                      })
                    }
                  />
                </>
              )}
            </main>
          </fieldset>
          <footer className="rich-actions">
            <div>
              <strong>
                {document.questions.length} questions ·{" "}
                {document.accessTier === "premium" ? "Premium" : "Free"}
              </strong>
              <small>
                {course?.is_published
                  ? "Save a complete draft, preview, then publish."
                  : "Publish the parent course before this module can go live."}
              </small>
            </div>
            <button
              className="rich-secondary"
              disabled={disabled}
              onClick={() => {
                if (validate()) setPreview(structuredClone(document));
              }}
            >
              Student preview
            </button>
            <button
              className="rich-secondary"
              disabled={busy || conflict}
              onClick={() => void write(pending.current?.action ?? "save")}
            >
              {busy
                ? "Saving…"
                : uncertain
                  ? "Retry same request"
                  : "Save draft"}
            </button>
            <button
              className="rich-primary"
              disabled={
                disabled ||
                dirty ||
                snapshot?.status !== "draft" ||
                !course?.is_published
              }
              onClick={() => void write("publish")}
            >
              Publish module
            </button>
          </footer>
          <details className="rich-json">
            <summary>Inspect authoring JSON</summary>
            <p>
              This includes private grading keys and is visible only in your
              teacher workspace.
            </p>
            <pre>{JSON.stringify(document, null, 2)}</pre>
          </details>
        </>
      )}
      {preview && (
        <ModulePreview
          document={preview}
          userId={userId}
          onClose={() => setPreview(null)}
        />
      )}
    </section>
  );
}
