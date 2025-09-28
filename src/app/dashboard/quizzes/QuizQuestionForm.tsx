"use client";

import React, { useState } from "react";
import { QuizQuestionFormData } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SimpleRichTextEditor } from "@/components/ui/SimpleRichTextEditor";

interface QuizQuestionFormProps {
  question: QuizQuestionFormData;
  index: number;
  onUpdate: (updates: Partial<QuizQuestionFormData>) => void;
  onRemove: () => void;
}

export default function QuizQuestionForm({
  question,
  index,
  onUpdate,
  onRemove,
}: QuizQuestionFormProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const updateAnswer = (answerId: string, text: string) => {
    const updatedAnswers = question.answers.map((answer) =>
      answer.id === answerId ? { ...answer, text } : answer
    );
    onUpdate({ answers: updatedAnswers });
  };

  const setCorrectAnswer = (answerId: string) => {
    onUpdate({ correctAnswerId: answerId });
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
        >
          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
            {index + 1}
          </span>
          Question {index + 1}
          <svg
            className={`w-5 h-5 transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
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

        <Button
          onClick={onRemove}
          variant="danger"
          size="sm"
          title="Remove Question"
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Question Text *
            </label>
            <SimpleRichTextEditor
              value={question.question}
              onChange={(value: string) => onUpdate({ question: value })}
              placeholder="Enter your question..."
              className="w-full"
            />
          </div>

          {/* Multiple Choice Answers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Answer Options *
            </label>
            <div className="space-y-3">
              {question.answers.map((answer, answerIndex) => (
                <div key={answer.id} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name={`correct-${question.id}`}
                    checked={question.correctAnswerId === answer.id}
                    onChange={() => setCorrectAnswer(answer.id)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-6">
                    {String.fromCharCode(65 + answerIndex)}.
                  </span>
                  <Input
                    value={answer.text}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateAnswer(answer.id, e.target.value)
                    }
                    placeholder={`Answer ${String.fromCharCode(
                      65 + answerIndex
                    )}`}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Select the radio button next to the correct answer
            </p>
          </div>

          {/* Points and Explanation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Points
              </label>
              <Input
                type="number"
                value={question.points}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdate({ points: parseInt(e.target.value) || 1 })
                }
                min="1"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Explanation (Optional)
              </label>
              <Input
                value={question.explanation}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdate({ explanation: e.target.value })
                }
                placeholder="Explain the correct answer..."
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
