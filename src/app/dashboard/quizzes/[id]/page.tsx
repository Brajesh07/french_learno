"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Quiz } from "@/lib/types";
import { Button } from "@/components/ui/Button";

export default function QuizPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/admin/quizzes/${quizId}`, {
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch quiz");
        }

        const quizData = await response.json();
        setQuiz(quizData);
      } catch (err) {
        console.error("Error fetching quiz:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch quiz");
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      fetchQuiz();
    }
  }, [quizId]);

  const handleAnswerSelect = (questionId: string, answerId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answerId,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-center py-8">
              <div className="text-red-600 dark:text-red-400 mb-4">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Error Loading Quiz
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => router.back()}>
                  Go Back
                </Button>
                <Button
                  variant="primary"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Quiz Not Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The quiz you&apos;re looking for doesn&apos;t exist.
              </p>
              <Button variant="primary" onClick={() => router.back()}>
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalQuestions = quiz.questions?.length || 0;
  const totalPoints =
    quiz.questions?.reduce((sum, question) => sum + question.points, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => router.back()}>
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Quizzes
              </Button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Quiz Preview
              </h1>
            </div>
            <div className="flex gap-3">
              <Link href={`/dashboard/quizzes/${quizId}/edit`}>
                <Button variant="primary">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit Quiz
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Quiz Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="space-y-6">
            {/* Quiz Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {quiz.title}
                  </h2>
                  {quiz.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                      {quiz.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      quiz.isPublished
                        ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                        : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                    }`}
                  >
                    {quiz.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {totalQuestions}
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    Questions
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {totalPoints}
                  </div>
                  <div className="text-sm text-green-800 dark:text-green-300">
                    Total Points
                  </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {quiz.timeLimit}
                  </div>
                  <div className="text-sm text-orange-800 dark:text-orange-300">
                    Minutes
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {quiz.passingScore}%
                  </div>
                  <div className="text-sm text-purple-800 dark:text-purple-300">
                    To Pass
                  </div>
                </div>
              </div>
            </div>

            {/* Questions */}
            {totalQuestions > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    Question {currentQuestion + 1} of {totalQuestions}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setCurrentQuestion(Math.max(0, currentQuestion - 1))
                      }
                      disabled={currentQuestion === 0}
                      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() =>
                        setCurrentQuestion(
                          Math.min(totalQuestions - 1, currentQuestion + 1)
                        )
                      }
                      disabled={currentQuestion === totalQuestions - 1}
                      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Current Question */}
                {quiz.questions[currentQuestion] && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                      <div className="flex items-start gap-4">
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">
                          {currentQuestion + 1}
                        </span>
                        <div className="flex-1">
                          <div className="text-xl text-gray-900 dark:text-white mb-3 whitespace-pre-wrap">
                            {quiz.questions[currentQuestion].question}
                          </div>
                          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                                />
                              </svg>
                              {quiz.questions[currentQuestion].points} points
                            </span>
                            {quiz.questions[currentQuestion].explanation && (
                              <span className="flex items-center gap-1">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                  />
                                </svg>
                                Has explanation
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Answer Options */}
                    <div className="space-y-3">
                      {quiz.questions[currentQuestion]?.answers?.map(
                        (answer, index) => {
                          const isSelected =
                            selectedAnswers[
                              quiz.questions[currentQuestion].id
                            ] === answer.id;
                          const isCorrect =
                            quiz.questions[currentQuestion].correctAnswerId ===
                            answer.id;

                          return (
                            <button
                              key={answer.id}
                              onClick={() =>
                                handleAnswerSelect(
                                  quiz.questions[currentQuestion].id,
                                  answer.id
                                )
                              }
                              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <span
                                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors ${
                                    isSelected
                                      ? "border-blue-500 bg-blue-500 text-white"
                                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                                  }`}
                                >
                                  {String.fromCharCode(65 + index)}
                                </span>
                                <span
                                  className={`flex-1 text-lg ${
                                    isSelected
                                      ? "text-blue-700 dark:text-blue-300 font-medium"
                                      : "text-gray-700 dark:text-gray-300"
                                  }`}
                                >
                                  {answer.text}
                                </span>
                                {isCorrect && (
                                  <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-xs font-medium">
                                    ✓ Correct Answer
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        }
                      )}
                    </div>

                    {/* Explanation */}
                    {quiz.questions[currentQuestion].explanation && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                            />
                          </svg>
                          <div>
                            <div className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                              Explanation
                            </div>
                            <div className="text-yellow-700 dark:text-yellow-300">
                              {quiz.questions[currentQuestion].explanation}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Question Navigation Dots */}
                <div className="flex flex-wrap gap-2 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">
                    Jump to:
                  </span>
                  {quiz.questions.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestion(index)}
                      className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors ${
                        index === currentQuestion
                          ? "bg-blue-500 text-white shadow-md"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600"
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <svg
                  className="mx-auto h-16 w-16 text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Questions Added
                </h3>
                <p className="mb-4">
                  This quiz doesn&apos;t have any questions yet.
                </p>
                <Link href={`/dashboard/quizzes/${quizId}/edit`}>
                  <Button variant="primary">Add Questions</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
