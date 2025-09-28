"use client";

import React, { useState } from "react";
import { QuizFormData } from "@/lib/types";

interface QuizPreviewProps {
  quiz: QuizFormData;
}

export default function QuizPreview({ quiz }: QuizPreviewProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});

  const handleAnswerSelect = (questionId: string, answerId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answerId,
    }));
  };

  const totalQuestions = quiz.questions.length;
  const totalPoints = quiz.questions.reduce(
    (sum, question) => sum + question.points,
    0
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sticky top-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Quiz Preview
      </h2>

      {!quiz.title && !quiz.questions.length ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <p className="mt-2">Start creating your quiz to see the preview</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quiz Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {quiz.title || "Untitled Quiz"}
            </h3>
            {quiz.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {quiz.description}
              </p>
            )}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
              <span>📊 {totalQuestions} questions</span>
              <span>🏆 {totalPoints} points</span>
              <span>⏰ {quiz.timeLimit} minutes</span>
              <span>✅ {quiz.passingScore}% to pass</span>
            </div>
          </div>

          {/* Question Navigation */}
          {totalQuestions > 0 && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Question {currentQuestion + 1} of {totalQuestions}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() =>
                      setCurrentQuestion(Math.max(0, currentQuestion - 1))
                    }
                    disabled={currentQuestion === 0}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
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
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Current Question */}
              {quiz.questions[currentQuestion] && (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                        {currentQuestion + 1}
                      </span>
                      <div className="flex-1">
                        <div className="text-gray-900 dark:text-white whitespace-pre-wrap">
                          {quiz.questions[currentQuestion].question ||
                            "Question text..."}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>
                            🏆 {quiz.questions[currentQuestion].points} points
                          </span>
                          {quiz.questions[currentQuestion].explanation && (
                            <span>💡 Has explanation</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Answer Options */}
                  <div className="space-y-2">
                    {quiz.questions[currentQuestion].answers.map(
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
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                                  isSelected
                                    ? "border-blue-500 bg-blue-500 text-white"
                                    : "border-gray-300 dark:border-gray-600"
                                }`}
                              >
                                {String.fromCharCode(65 + index)}
                              </span>
                              <span
                                className={`flex-1 ${
                                  isSelected
                                    ? "text-blue-700 dark:text-blue-300"
                                    : "text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {answer.text ||
                                  `Answer ${String.fromCharCode(65 + index)}`}
                              </span>
                              {isCorrect && (
                                <span className="text-green-500 text-xs">
                                  ✓ Correct
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              {/* Question Dots */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                {quiz.questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(index)}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      index === currentQuestion
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
