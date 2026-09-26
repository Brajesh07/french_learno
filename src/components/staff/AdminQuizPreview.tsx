"use client";
import { useState } from "react";
import { StudentSurface } from "@/components/ui/learning/portal";
import {
  AudioButton,
  ExercisePresentation,
} from "@/components/learning/ExercisePresentation";
import type { AdminPreviewQuestion } from "@/types/admin-preview";
import "@/components/learning/student-learning.css";

const assetUrl = (id: string) =>
  `/api/admin/learning-assets/${encodeURIComponent(id)}`;
const labels = {
  multiple_choice: "Multiple choice",
  typed_recall: "Typed recall",
  sentence_builder: "Sentence builder",
  listening_choice: "Listening choice",
};

/** Local interaction only: never mounts the student session/reward runtime. */
export function AdminQuizPreview({
  questions,
}: {
  questions: AdminPreviewQuestion[];
}) {
  const [index, setIndex] = useState(0);
  if (!questions.length)
    return (
      <p className="rounded-2xl border p-6">
        This revision has no questions yet.
      </p>
    );
  return (
    <StudentSurface>
      <section
        className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
        aria-label="Read-only quiz preview"
      >
        <div className="grid gap-2">
          <h2 className="text-xl font-semibold">Question preview</h2>
          <p className="text-sm text-slate-600">
            Try the controls and inspect the answer key. Nothing is graded or
            saved.
          </p>
        </div>
        <nav aria-label="Preview questions" className="flex flex-wrap gap-2">
          {questions.map((q, i) => (
            <button
              key={q.exercise.questionRevisionId}
              aria-label={`Question ${i + 1}: ${labels[q.exercise.type]}`}
              aria-current={i === index ? "step" : undefined}
              onClick={() => setIndex(i)}
              className={`h-10 min-w-10 rounded-xl border px-3 ${i === index ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}
            >
              {i + 1}
            </button>
          ))}
        </nav>
        <AdminQuestion
          key={questions[index].exercise.questionRevisionId}
          question={questions[index]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <button
            className="plain-button disabled:opacity-40"
            disabled={index === 0}
            onClick={() => setIndex((i) => i - 1)}
          >
            Previous question
          </button>
          <span className="text-sm text-slate-500">
            {index + 1} of {questions.length}
          </span>
          <button
            className="plain-button disabled:opacity-40"
            disabled={index === questions.length - 1}
            onClick={() => setIndex((i) => i + 1)}
          >
            Next question
          </button>
        </div>
      </section>
    </StudentSurface>
  );
}

function AdminQuestion({
  question: { exercise, answerKey, feedback },
}: {
  question: AdminPreviewQuestion;
}) {
  const [answer, setAnswer] = useState(""),
    [tokens, setTokens] = useState<string[]>([]);
  const [hints, setHints] = useState<string[]>([]),
    [transcript, setTranscript] = useState(false);
  const displayOrder =
    exercise.type === "sentence_builder"
      ? exercise.presentation.interaction.tokens.map((t) => t.id)
      : exercise.type === "typed_recall"
        ? []
        : exercise.presentation.interaction.options.map((o) => o.id);
  return (
    <div className="grid min-w-0 gap-5">
      <span className="eyebrow">{labels[exercise.type]}</span>
      <h3 className="flow-title break-words">
        {exercise.presentation.prompt.en}
      </h3>
      <p className="text-slate-600">{exercise.presentation.instructions.en}</p>
      <ExercisePresentation
        question={exercise}
        displayOrder={displayOrder}
        answer={answer}
        setAnswer={setAnswer}
        tokens={tokens}
        setTokens={setTokens}
        hints={hints}
        setHints={setHints}
        transcript={transcript}
        setTranscript={setTranscript}
        assetUrl={assetUrl}
      />
      <details className="rounded-xl border border-violet-100 bg-violet-50 p-4">
        <summary className="cursor-pointer font-semibold">
          Answer key and teaching notes
        </summary>
        <div className="mt-4 grid gap-3 text-sm leading-relaxed">
          <h4 className="font-semibold">Accepted answers</h4>
          {answerKey.length ? (
            <ul className="list-disc pl-5">
              {answerKey.map((answer, i) => (
                <li key={i} lang="fr">
                  {answer}
                </li>
              ))}
            </ul>
          ) : (
            <p>No correct answer has been assigned.</p>
          )}
          {feedback.correctAnswerDisplay && (
            <p lang="fr">{feedback.correctAnswerDisplay}</p>
          )}
          {feedback.explanation.en && <p>{feedback.explanation.en}</p>}
          {feedback.pronunciation && (
            <p>
              {feedback.pronunciation.ipa} ·{" "}
              {feedback.pronunciation.respelling.en}
            </p>
          )}
          {feedback.pronunciation?.audio && (
            <AudioButton
              audio={feedback.pronunciation.audio}
              assetUrl={assetUrl}
            />
          )}
          {feedback.example && (
            <p>
              <span lang="fr">{feedback.example.target}</span> —{" "}
              {feedback.example.translation.en}
            </p>
          )}
          {feedback.cultureNote && <p>{feedback.cultureNote.en}</p>}
        </div>
      </details>
    </div>
  );
}
