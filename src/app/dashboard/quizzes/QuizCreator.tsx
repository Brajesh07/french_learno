"use client";

import React, { useState, useCallback } from "react";
import { QuizFormData, QuizQuestionFormData } from "@/lib/types";
import QuizQuestionForm from "./QuizQuestionForm";
import QuizPreview from "./QuizPreview";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/components/auth/AuthProvider";
import { generateId } from "@/lib/utils";

interface QuizCreatorProps {
  courseId?: string;
}

export default function QuizCreator({
  courseId: initialCourseId,
}: QuizCreatorProps) {
  const { user } = useAuth();
  console.log("QuizCreator - Current user:", user); // Debug log
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [formData, setFormData] = useState<QuizFormData>({
    title: "",
    description: "",
    courseId: initialCourseId || "",
    timeLimit: 30,
    passingScore: 70,
    questions: [],
  });

  const addQuestion = useCallback(() => {
    const newQuestion: QuizQuestionFormData = {
      id: generateId(),
      question: "",
      answers: [
        { id: generateId(), text: "" },
        { id: generateId(), text: "" },
        { id: generateId(), text: "" },
        { id: generateId(), text: "" },
      ],
      correctAnswerId: "",
      points: 1,
      explanation: "",
    };

    setFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));
  }, []);

  const updateQuestion = useCallback(
    (questionId: string, updates: Partial<QuizQuestionFormData>) => {
      setFormData((prev) => ({
        ...prev,
        questions: prev.questions.map((q) =>
          q.id === questionId ? { ...q, ...updates } : q
        ),
      }));
    },
    []
  );

  const removeQuestion = useCallback((questionId: string) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== questionId),
    }));
  }, []);

  const handleSave = async () => {
    if (!user) {
      setFeedback({
        type: "error",
        message: "You must be logged in to create quizzes",
      });
      return;
    }

    if (!formData.title.trim()) {
      setFeedback({ type: "error", message: "Quiz title is required" });
      return;
    }

    if (!formData.courseId.trim()) {
      setFeedback({ type: "error", message: "Course ID is required" });
      return;
    }

    if (formData.questions.length === 0) {
      setFeedback({
        type: "error",
        message: "At least one question is required",
      });
      return;
    }

    // Validate questions
    for (const question of formData.questions) {
      if (!question.question.trim()) {
        setFeedback({
          type: "error",
          message: "All questions must have content",
        });
        return;
      }

      if (!question.correctAnswerId) {
        setFeedback({
          type: "error",
          message: "All questions must have a correct answer selected",
        });
        return;
      }

      const hasEmptyAnswers = question.answers.some(
        (answer) => !answer.text.trim()
      );
      if (hasEmptyAnswers) {
        setFeedback({
          type: "error",
          message: "All answer options must be filled",
        });
        return;
      }
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create quiz");
      }

      setFeedback({ type: "success", message: "Quiz created successfully!" });

      // Reset form
      setFormData({
        title: "",
        description: "",
        courseId: initialCourseId || "",
        timeLimit: 30,
        passingScore: 70,
        questions: [],
      });
    } catch (error) {
      console.error("Error creating quiz:", error);
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to create quiz",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    // For now, just save as published
    await handleSave();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Quiz Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quiz Title *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter quiz title"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Enter quiz description"
                  rows={3}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Course ID *
                  </label>
                  <Input
                    value={formData.courseId}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        courseId: e.target.value,
                      }))
                    }
                    placeholder="Enter course ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Time Limit (minutes)
                  </label>
                  <Input
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        timeLimit: parseInt(e.target.value) || 30,
                      }))
                    }
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Passing Score (%)
                  </label>
                  <Input
                    type="number"
                    value={formData.passingScore}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        passingScore: parseInt(e.target.value) || 70,
                      }))
                    }
                    min="1"
                    max="100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Questions Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Questions ({formData.questions.length})
              </h2>
              <Button onClick={addQuestion} variant="primary">
                Add Question
              </Button>
            </div>

            <div className="space-y-6">
              {formData.questions.map((question, index) => (
                <QuizQuestionForm
                  key={question.id}
                  question={question}
                  index={index}
                  onUpdate={(updates) => updateQuestion(question.id, updates)}
                  onRemove={() => removeQuestion(question.id)}
                />
              ))}

              {formData.questions.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No questions added yet. Click &quot;Add Question&quot; to get
                  started.
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              {isLoading ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isLoading}
              variant="primary"
              className="flex-1"
            >
              {isLoading ? "Publishing..." : "Save & Publish"}
            </Button>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={`p-4 rounded-md ${
                feedback.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {feedback.message}
            </div>
          )}
        </div>

        {/* Preview Section */}
        <div className="lg:sticky lg:top-6">
          <QuizPreview quiz={formData} />
        </div>
      </div>
    </div>
  );
}
