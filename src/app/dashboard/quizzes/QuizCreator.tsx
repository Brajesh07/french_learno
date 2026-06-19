"use client";

import React, { useState, useCallback, useEffect } from "react";
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
  courseTitle?: string;
  quizId?: string;
}

export default function QuizCreator({
  courseId: initialCourseId,
  courseTitle,
  quizId,
}: QuizCreatorProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(!!quizId);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
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

  // Fetch courses for the dropdown
  useEffect(() => {
    if (!initialCourseId) {
      const fetchCourses = async () => {
        try {
          const response = await fetch("/api/admin/courses?limit=100", {
            credentials: "include",
          });
          if (response.ok) {
            const result = await response.json();
            setCourses(result.data || []);
          }
        } catch (error) {
          console.error("Error fetching courses:", error);
        }
      };
      fetchCourses();
    }
  }, [initialCourseId]);

  // Fetch quiz data if in edit mode
  useEffect(() => {
    if (quizId) {
      const fetchQuiz = async () => {
        try {
          setIsFetching(true);
          const response = await fetch(`/api/admin/quizzes/${quizId}`, {
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error("Failed to fetch quiz data");
          }

          const quiz = await response.json();

          setFormData({
            title: quiz.title || "",
            description: quiz.description || "",
            courseId: quiz.courseId || "",
            timeLimit: quiz.timeLimit || 30,
            passingScore: quiz.passingScore || 70,
            questions: (quiz.questions || []).map(
              (q: {
                id: string;
                question: string;
                points: number;
                explanation?: string;
                correctAnswerId?: string;
                answers: { id: string; text: string }[];
              }) => ({
                id: q.id,
                question: q.question,
                points: q.points,
                explanation: q.explanation || "",
                correctAnswerId: q.correctAnswerId,
                answers: (q.answers || []).map(
                  (a: { id: string; text: string }) => ({
                    id: a.id,
                    text: a.text,
                  }),
                ),
              }),
            ),
          });
        } catch (error) {
          console.error("Error fetching quiz:", error);
          setFeedback({
            type: "error",
            message: "Failed to load quiz data for editing",
          });
        } finally {
          setIsFetching(false);
        }
      };
      fetchQuiz();
    }
  }, [quizId]);

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
          q.id === questionId ? { ...q, ...updates } : q,
        ),
      }));
    },
    [],
  );

  const removeQuestion = useCallback((questionId: string) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== questionId),
    }));
  }, []);

  const handleSave = async (publishStatus: boolean = false) => {
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

    // Use provided courseId or form courseId
    const finalCourseId = initialCourseId || formData.courseId.trim();

    if (!finalCourseId) {
      setFeedback({ type: "error", message: "Please select a course" });
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
        (answer) => !answer.text.trim(),
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
      // Transform camelCase form data to snake_case API format
      const submissionData = {
        title: formData.title,
        description: formData.description,
        course_id: finalCourseId,
        passing_score: formData.passingScore,
        is_published: publishStatus,
        questions: formData.questions.map((q) => ({
          question: q.question,
          points: q.points,
          explanation: q.explanation,
          answers: q.answers.map((a) => ({
            answer: a.text,
            is_correct: a.id === q.correctAnswerId,
          })),
        })),
      };

      const url = quizId
        ? `/api/admin/quizzes/${quizId}`
        : "/api/admin/quizzes";
      const method = quizId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `Failed to ${quizId ? "update" : "create"} quiz`,
        );
      }

      setFeedback({
        type: "success",
        message: `Quiz ${quizId ? "updated" : publishStatus ? "published" : "created"} successfully!`,
      });

      if (!quizId) {
        // Reset form only on creation
        setFormData({
          title: "",
          description: "",
          courseId: initialCourseId || "",
          timeLimit: 30,
          passingScore: 70,
          questions: [],
        });
      }
    } catch (error) {
      console.error(`Error ${quizId ? "updating" : "creating"} quiz:`, error);
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : `Failed to ${quizId ? "update" : "create"} quiz`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    await handleSave(true);
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading quiz data...</span>
      </div>
    );
  }

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
                {/* Course ID Field - Conditional rendering */}
                {initialCourseId ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Course
                    </label>
                    <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {courseTitle || `Course ID: ${initialCourseId}`}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {initialCourseId}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Course *
                    </label>
                    <select
                      value={formData.courseId}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          courseId: e.target.value,
                        }))
                      }
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Select a course</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
              onClick={() => handleSave()}
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
