"use client";
import { useState, useRef } from "react";
import { StudentSurface } from "@/components/ui/learning/portal";
import { TrustedLesson } from "@/components/learning/TrustedLesson";
import type { AuthoringDocument } from "@/lib/gamification/authoring";
import type {
  AnswerSubmission,
  ConfirmedAnswer,
  StartedSession,
  StudentExercise,
} from "@/types/gamification";
import "@/components/learning/student-learning.css";
const normalize = (s: string) =>
  s
    .normalize("NFC")
    .toLocaleLowerCase("fr")
    .replace(/’/g, "'")
    .replace(/[.,!?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
export function ModulePreview({
  document,
  userId,
  onClose,
}: {
  document: AuthoringDocument;
  userId: string;
  onClose: () => void;
}) {
  const [session] = useState<StartedSession>(() => ({
    id: crypto.randomUUID(),
    title: document.title,
    mode: "lesson",
    status: "active",
    timeZone: "UTC",
    receipts: [],
    totals: { xp: 0, coins: 0, hearts: 5, revision: 1 },
    questions: document.questions.map((q, i) => ({
      id: q.questionId,
      position: i + 1,
      displayOrder:
        q.type === "sentence_builder"
          ? [...q.presentation.interaction.tokens].reverse().map((t) => t.id)
          : q.type === "typed_recall"
            ? []
            : [...q.presentation.interaction.options]
                .reverse()
                .map((o) => o.id),
      exercise: {
        questionId: q.questionId,
        questionRevisionId: q.questionId,
        contentRevision: 1,
        schemaVersion: 1,
        targetLanguage: "fr-FR",
        instructionLanguage: "en",
        proficiency: document.proficiency,
        difficulty: "easy",
        skillIds: [],
        tags: [],
        rewardClass: q.type === "sentence_builder" ? "builder" : "standard",
        type: q.type,
        presentation: q.presentation,
      } as StudentExercise,
    })),
  }));
  const scoreRef = useRef<boolean[]>([]);
  async function grade(input: AnswerSubmission): Promise<ConfirmedAnswer> {
    const q = document.questions.find(
      (q) => q.questionId === input.sessionQuestionId,
    )!;
    let correct = false;
    if (
      (q.type === "multiple_choice" || q.type === "listening_choice") &&
      (input.type === "multiple_choice" || input.type === "listening_choice")
    )
      correct = input.response.optionId === q.assessment.correctOptionId;
    if (q.type === "typed_recall" && input.type === "typed_recall")
      correct = q.assessment.acceptedAnswers.some(
        (a) => normalize(a) === normalize(input.response.text),
      );
    if (q.type === "sentence_builder" && input.type === "sentence_builder")
      correct = q.assessment.acceptedSequences.some(
        (s) => JSON.stringify(s) === JSON.stringify(input.response.tokenIds),
      );
    const scores = scoreRef.current;
    scores.push(correct);
    return {
      responseId: input.idempotencyKey,
      sessionQuestionId: q.questionId,
      isCorrect: correct,
      score: correct ? 1 : 0,
      feedback: q.feedback,
      reward: { xp: 0, coins: 0, heartsDelta: 0 },
      totals: session.totals,
      session: {
        completed: scores.length === document.questions.length,
        correct: scores.filter(Boolean).length,
        answered: scores.length,
        total: document.questions.length,
        passed: null,
      },
      rewardBreakdown: { answerXp: 0, completionXp: 0, completionCoins: 0 },
    };
  }
  return (
    <StudentSurface>
      <TrustedLesson
        session={session}
        userId={userId}
        hearts={5}
        onConfirm={() => {}}
        onClose={onClose}
        onResume={onClose}
        previewSubmit={grade}
        assetUrl={(id) => `/api/teacher/assets/${encodeURIComponent(id)}`}
      />
    </StudentSurface>
  );
}
