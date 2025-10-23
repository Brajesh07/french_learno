"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FrenchLevel, Quiz } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { SimpleRichTextEditor } from "@/components/ui/SimpleRichTextEditor";

export default function CreateCoursePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const isEditMode = !!courseId;

  const [loading, setLoading] = useState(false);
  const [fetchingCourse, setFetchingCourse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    level: "A1" as FrenchLevel,
    content: {
      text: "",
      audioUrl: "",
      videoUrl: "",
      imageUrl: "",
    },
    isPublished: false,
    order: 0,
    prerequisites: [] as string[],
    estimatedDuration: 30,
  });

  // Fetch course data if in edit mode
  useEffect(() => {
    if (isEditMode && courseId) {
      fetchCourseData(courseId);
    }
  }, [isEditMode, courseId]);

  const fetchCourseData = async (id: string) => {
    try {
      setFetchingCourse(true);
      setError(null);

      const response = await fetch(`/api/admin/courses/${id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch course data");
      }

      const data = await response.json();
      const course = data.course;

      // Pre-fill form with course data
      setFormData({
        title: course.title || "",
        description: course.description || "",
        level: course.level || "A1",
        content: {
          text: course.content?.text || "",
          audioUrl: course.content?.audioUrl || "",
          videoUrl: course.content?.videoUrl || "",
          imageUrl: course.content?.imageUrl || "",
        },
        isPublished: course.isPublished || false,
        order: course.order || 0,
        prerequisites: course.prerequisites || [],
        estimatedDuration: course.estimatedDuration || 30,
      });

      // Set quiz data (convert date strings to Date objects)
      const processedQuizzes =
        data.quizzes?.map(
          (quiz: Quiz & { createdAt: string; updatedAt: string }) => ({
            ...quiz,
            createdAt: new Date(quiz.createdAt),
            updatedAt: new Date(quiz.updatedAt),
          })
        ) || [];

      setQuizzes(processedQuizzes);
    } catch (err) {
      console.error("Error fetching course:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch course data"
      );
    } finally {
      setFetchingCourse(false);
    }
  };

  const refreshQuizData = async () => {
    if (courseId) {
      await fetchCourseData(courseId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError("Course title is required");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const url = isEditMode
        ? `/api/admin/courses/${courseId}`
        : "/api/admin/courses";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to ${isEditMode ? "update" : "create"} course`
        );
      }

      const result = await response.json();
      const successMessage = isEditMode
        ? "Course updated successfully!"
        : "Course created successfully!";
      setSuccess(successMessage);

      // Redirect to the course preview page after a short delay
      setTimeout(() => {
        const targetCourseId = isEditMode ? courseId : result.courseId;
        router.push(`/dashboard/courses/${targetCourseId}`);
      }, 1500);
    } catch (err) {
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} course:`,
        err
      );
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${isEditMode ? "update" : "create"} course`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: string,
    value: string | number | boolean
  ) => {
    if (field.startsWith("content.")) {
      const contentField = field.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        content: {
          ...prev.content,
          [contentField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const getStatusColor = (isPublished: boolean) => {
    return isPublished
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  };

  const toggleQuizExpansion = (quizId: string) => {
    setExpandedQuiz(expandedQuiz === quizId ? null : quizId);
  };

  const renderFormattedText = (text: string) => {
    if (!text) return null;

    // Basic markdown-style formatting
    const formattedText = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/__(.*?)__/g, "<u>$1</u>")
      .replace(/\n/g, "<br />");

    return (
      <div
        className="whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: formattedText }}
      />
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/courses">
            <Button variant="outline">← Back to Courses</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {isEditMode ? "Edit Course" : "Create New Course"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {isEditMode
                ? "Update your French learning course"
                : "Add a new French learning course to your curriculum"}
            </p>
          </div>
        </div>
      </div>

      {/* Loading State for Edit Mode */}
      {fetchingCourse && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {!fetchingCourse && (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Basic Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Course Title *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Enter course title"
                  className="w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Enter course description"
                  rows={3}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Level *
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) =>
                      handleInputChange("level", e.target.value as FrenchLevel)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="A1">A1 - Beginner</option>
                    <option value="B1">B1 - Intermediate</option>
                    <option value="B2">B2 - Upper Intermediate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estimated Duration (minutes)
                  </label>
                  <Input
                    type="number"
                    value={formData.estimatedDuration}
                    onChange={(e) =>
                      handleInputChange(
                        "estimatedDuration",
                        parseInt(e.target.value) || 30
                      )
                    }
                    min="1"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Order
                  </label>
                  <Input
                    type="number"
                    value={formData.order}
                    onChange={(e) =>
                      handleInputChange("order", parseInt(e.target.value) || 0)
                    }
                    min="0"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={formData.isPublished}
                  onChange={(e) =>
                    handleInputChange("isPublished", e.target.checked)
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="isPublished"
                  className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                >
                  Publish immediately
                </label>
              </div>
            </div>
          </div>

          {/* Course Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Course Content
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course Text Content
                </label>
                <SimpleRichTextEditor
                  value={formData.content.text}
                  onChange={(value) => handleInputChange("content.text", value)}
                  placeholder="Enter the main course content..."
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Media Resources */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Media Resources
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Image URL
                </label>
                <Input
                  type="url"
                  value={formData.content.imageUrl}
                  onChange={(e) =>
                    handleInputChange("content.imageUrl", e.target.value)
                  }
                  placeholder="https://example.com/image.jpg"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  URL to an image that represents this course
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Audio URL
                </label>
                <Input
                  type="url"
                  value={formData.content.audioUrl}
                  onChange={(e) =>
                    handleInputChange("content.audioUrl", e.target.value)
                  }
                  placeholder="https://example.com/audio.mp3"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  URL to an audio file for pronunciation or listening exercises
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Video URL
                </label>
                <Input
                  type="url"
                  value={formData.content.videoUrl}
                  onChange={(e) =>
                    handleInputChange("content.videoUrl", e.target.value)
                  }
                  placeholder="https://example.com/video.mp4"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  URL to a video lesson or demonstration
                </p>
              </div>
            </div>
          </div>

          {/* Quiz Management Section (Edit Mode Only) */}
          {isEditMode && courseId && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Course Quizzes ({quizzes.length})
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => refreshQuizData()}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    🔄 Refresh
                  </button>
                  <Link
                    href={`/dashboard/quizzes/create?courseId=${courseId}&title=${encodeURIComponent(
                      formData.title
                    )}`}
                  >
                    <Button type="button" variant="primary">
                      Add Quiz
                    </Button>
                  </Link>
                </div>
              </div>

              {quizzes.length === 0 ? (
                <div className="text-center py-12">
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
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    No quizzes available
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Create a quiz to test students&apos; understanding of this
                    course.
                  </p>
                  <div className="mt-6">
                    <Link
                      href={`/dashboard/quizzes/create?courseId=${courseId}`}
                    >
                      <Button type="button" variant="primary">
                        Create First Quiz
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {quizzes.map((quiz, index) => (
                    <div
                      key={quiz.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      <div
                        className="px-6 py-4 bg-gray-50 dark:bg-gray-900 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => toggleQuizExpansion(quiz.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </span>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                {quiz.title}
                              </h3>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {quiz.questions.length} questions
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {quiz.timeLimit || "No time limit"}
                                  {quiz.timeLimit && " minutes"}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  Passing: {quiz.passingScore}%
                                </span>
                                <span
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                    quiz.isPublished
                                  )}`}
                                >
                                  {quiz.isPublished ? "Published" : "Draft"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link href={`/dashboard/quizzes/${quiz.id}/edit`}>
                              <Button type="button" variant="outline" size="sm">
                                Edit
                              </Button>
                            </Link>
                            <svg
                              className={`w-5 h-5 text-gray-400 transform transition-transform ${
                                expandedQuiz === quiz.id ? "rotate-180" : ""
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Quiz Content */}
                      {expandedQuiz === quiz.id && (
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                          {quiz.description && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Description
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {quiz.description}
                              </p>
                            </div>
                          )}

                          <div className="space-y-4">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Questions ({quiz.questions.length})
                            </h4>
                            {quiz.questions.map((question, qIndex) => (
                              <div
                                key={question.id}
                                className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4"
                              >
                                <div className="flex items-start gap-3">
                                  <span className="bg-white dark:bg-gray-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400 flex-shrink-0 mt-1">
                                    {qIndex + 1}
                                  </span>
                                  <div className="flex-1">
                                    <div className="text-gray-900 dark:text-white mb-2">
                                      {renderFormattedText(question.question)}
                                    </div>
                                    {question.answers &&
                                      question.answers.length > 0 && (
                                        <div className="space-y-1">
                                          {question.answers.map(
                                            (answer, aIndex) => (
                                              <div
                                                key={answer.id}
                                                className={`text-sm px-3 py-2 rounded ${
                                                  question.correctAnswerId ===
                                                  answer.id
                                                    ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 font-medium"
                                                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                                }`}
                                              >
                                                {String.fromCharCode(
                                                  65 + aIndex
                                                )}
                                                . {answer.text}
                                                {question.correctAnswerId ===
                                                  answer.id && (
                                                  <span className="ml-2 text-green-600 dark:text-green-400">
                                                    ✓ Correct
                                                  </span>
                                                )}
                                              </div>
                                            )
                                          )}
                                        </div>
                                      )}
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                      <span>🏆 {question.points} points</span>
                                      {question.explanation && (
                                        <span>💡 Has explanation</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Feedback Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Link href="/dashboard/courses">
              <Button type="button" variant="outline" className="flex-1">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={loading || fetchingCourse}
              variant="primary"
              className="flex-1"
            >
              {loading
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                ? "Update Course"
                : "Create Course"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
