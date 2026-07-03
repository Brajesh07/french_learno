"use client";

import { useState } from "react";
import Link from "next/link";

interface Answer {
  id: string;
  answer: string;
}

interface Question {
  id: string;
  question: string;
  answers: Answer[];
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  course_id: string | null;
  questions: Question[];
}

interface Result {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  breakdown: {
    questionId: string;
    question: string;
    selectedAnswerId: string;
    selectedAnswer: string;
    correctAnswerId: string | null;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
}

export default function QuizForm({ quiz }: { quiz: Quiz }) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = quiz.questions.every((q) => selected[q.id]);

  async function handleSubmit() {
    if (!allAnswered) return;
    setSubmitting(true);
    setError(null);

    const answers = Object.entries(selected).map(
      ([question_id, answer_id]) => ({ question_id, answer_id }),
    );

    try {
      const res = await fetch(`/api/mobile/quizzes/${quiz.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answers }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit quiz. Please try again.");
        return;
      }

      setResult({
        score: data.score,
        passed: data.passed,
        correct: data.correct,
        total: data.total,
        breakdown: data.breakdown ?? [],
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Result screen ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="flex flex-col gap-4">
        {/* Score card */}
        <div
          className={`rounded-[24px] p-8 text-center shadow-[0_4px_20px_rgba(0,0,0,0.06)] ${
            result.passed ? "bg-[#DCFCE7]" : "bg-[#FEE2E2]"
          }`}
        >
          <div
            className={`text-[52px] font-black leading-none mb-3 ${
              result.passed ? "text-green-600" : "text-red-500"
            }`}
          >
            {result.score}%
          </div>
          <p
            className={`text-[18px] font-bold mb-2 ${
              result.passed ? "text-green-700" : "text-red-600"
            }`}
          >
            {result.passed ? "Passed! 🎉" : "Not quite — keep practising!"}
          </p>
          <p className="text-[13px] text-[#555555]">
            {result.correct} of {result.total} correct · Passing score:{" "}
            {quiz.passing_score}%
          </p>
        </div>

        {/* Per-question breakdown */}
        {result.breakdown.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-[13px] font-semibold text-[#555555] px-1">
              Question Review
            </h3>
            {result.breakdown.map((item, idx) => (
              <div
                key={item.questionId}
                className={`rounded-[20px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] ${
                  item.isCorrect ? "bg-[#DCFCE7]" : "bg-[#FEE2E2]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                      item.isCorrect ? "bg-green-500" : "bg-red-400"
                    }`}
                  >
                    {item.isCorrect ? "✓" : "✗"}
                  </span>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <p className="text-[14px] font-semibold text-[#111111]">
                      <span className="text-[#999999] font-normal mr-1">
                        Q{idx + 1}.
                      </span>
                      {item.question}
                    </p>
                    <p
                      className={`text-[12px] ${
                        item.isCorrect ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      Your answer:{" "}
                      <span className="font-semibold">
                        {item.selectedAnswer}
                      </span>
                    </p>
                    {!item.isCorrect && item.correctAnswer && (
                      <p className="text-[12px] text-green-700">
                        Correct:{" "}
                        <span className="font-semibold">
                          {item.correctAnswer}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => {
              setSelected({});
              setResult(null);
            }}
            className="px-5 py-3 rounded-[20px] bg-white border border-[#E5E5E5] text-[14px] font-semibold text-[#555555] shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-colors hover:bg-[#F5F5F7]"
          >
            Retake Quiz
          </button>
          {quiz.course_id && (
            <Link
              href={`/temp/dashboard/courses/${quiz.course_id}`}
              className="px-5 py-3 rounded-[20px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[14px] font-semibold transition-colors no-underline"
            >
              Back to Course
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ── Quiz form ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {quiz.questions.map((question, idx) => (
        <div
          key={question.id}
          className="bg-white rounded-[20px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
        >
          <p className="text-[15px] font-bold text-[#111111] mb-4 leading-snug">
            <span className="text-[#999999] font-normal mr-1.5">
              Q{idx + 1}.
            </span>
            {question.question}
          </p>

          <div className="flex flex-col gap-2">
            {question.answers.map((answer) => {
              const isSelected = selected[question.id] === answer.id;
              return (
                <label
                  key={answer.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-[14px] border cursor-pointer transition-all ${
                    isSelected
                      ? "border-[#A78BFA] bg-[#A78BFA]/10"
                      : "border-[#E5E5E5] bg-[#F5F5F7] hover:border-[#A78BFA]/50"
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={answer.id}
                    checked={isSelected}
                    onChange={() =>
                      setSelected((prev) => ({
                        ...prev,
                        [question.id]: answer.id,
                      }))
                    }
                    className="accent-[#7C3AED]"
                  />
                  <span className="text-[14px] text-[#111111]">
                    {answer.answer}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {error && (
        <div className="px-4 py-3 rounded-[14px] bg-red-100 text-red-600 text-[13px] font-medium">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!allAnswered || submitting}
        className={`w-full py-4 rounded-[20px] text-white font-bold text-[16px] border-none transition-colors duration-200 ${
          !allAnswered || submitting
            ? "bg-[#C4B5FD] cursor-not-allowed"
            : "bg-[#7C3AED] cursor-pointer hover:bg-[#6D28D9]"
        }`}
      >
        {submitting
          ? "Submitting…"
          : !allAnswered
            ? `Answer all ${quiz.questions.length} questions to submit`
            : "Submit Quiz"}
      </button>
    </div>
  );
}
