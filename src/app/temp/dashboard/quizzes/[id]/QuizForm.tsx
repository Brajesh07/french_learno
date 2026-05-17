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
      ([question_id, answer_id]) => ({
        question_id,
        answer_id,
      }),
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
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Result screen
  if (result) {
    return (
      <div className="space-y-6">
        <div
          className={`rounded-2xl border p-8 text-center ${
            result.passed
              ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
              : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
          }`}
        >
          <div
            className={`text-5xl font-bold mb-2 ${
              result.passed
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {result.score}%
          </div>
          <p
            className={`text-lg font-semibold ${
              result.passed
                ? "text-green-700 dark:text-green-300"
                : "text-red-700 dark:text-red-300"
            }`}
          >
            {result.passed ? "Passed!" : "Not quite — keep practising!"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {result.correct} of {result.total} correct · Passing score:{" "}
            {quiz.passing_score}%
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => {
              setSelected({});
              setResult(null);
            }}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Retake Quiz
          </button>
          {quiz.course_id && (
            <Link
              href={`/temp/dashboard/courses/${quiz.course_id}`}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              Back to Course
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Quiz form
  return (
    <div className="space-y-6">
      {quiz.questions.map((question, idx) => (
        <div
          key={question.id}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6"
        >
          <p className="font-medium text-gray-900 dark:text-white text-sm mb-4">
            <span className="text-gray-400 dark:text-gray-500 font-normal mr-1">
              Q{idx + 1}.
            </span>
            {question.question}
          </p>

          <div className="space-y-2">
            {question.answers.map((answer) => {
              const isSelected = selected[question.id] === answer.id;
              return (
                <label
                  key={answer.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
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
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-800 dark:text-gray-200">
                    {answer.answer}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!allAnswered || submitting}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
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
