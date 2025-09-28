"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Course, Quiz, FrenchLevel } from "@/lib/types";
import { Button } from "@/components/ui/Button";

interface CourseDetails {
  course: Course;
  quizzes: Quiz[];
}

export default function CoursePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);

  const fetchCourseDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/courses/${courseId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch course details");
      }

      const data: CourseDetails = await response.json();
      setCourseDetails(data);
    } catch (err) {
      console.error("Error fetching course details:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch course details"
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId, fetchCourseDetails]);

  const getLevelColor = (level: FrenchLevel) => {
    const colors = {
      A1: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      B1: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      B2: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return colors[level];
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <div className="mt-4">
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!courseDetails) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Course not found
          </h3>
          <div className="mt-4">
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { course, quizzes } = courseDetails;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Navigation */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={() => router.back()} variant="outline">
            ← Back to Courses
          </Button>
          <div className="flex-1">
            <nav className="text-sm text-gray-500 dark:text-gray-400">
              <Link
                href="/dashboard/courses"
                className="hover:text-gray-700 dark:hover:text-gray-300"
              >
                Courses
              </Link>
              <span className="mx-2">/</span>
              <span className="text-gray-900 dark:text-white">
                {course.title}
              </span>
            </nav>
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/courses/${course.id}/edit`}>
              <Button variant="primary">Edit Course</Button>
            </Link>
            <Link href={`/dashboard/quizzes?courseId=${course.id}`}>
              <Button variant="outline">Manage Quizzes</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Course Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {course.title}
            </h1>
            <div className="flex items-center gap-4 mb-4">
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getLevelColor(
                  course.level
                )}`}
              >
                Level {course.level}
              </span>
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                  course.isPublished
                )}`}
              >
                {course.isPublished ? "Published" : "Draft"}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {course.estimatedDuration} minutes
              </span>
            </div>
            {course.description && (
              <div className="text-gray-700 dark:text-gray-300 mb-6">
                {renderFormattedText(course.description)}
              </div>
            )}
          </div>
        </div>

        {/* Course Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Created
            </h3>
            <p className="text-sm text-gray-900 dark:text-white">
              {course.createdAt.toLocaleDateString()}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Last Updated
            </h3>
            <p className="text-sm text-gray-900 dark:text-white">
              {course.updatedAt.toLocaleDateString()}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Number of Quizzes
            </h3>
            <p className="text-sm text-gray-900 dark:text-white">
              {quizzes.length}
            </p>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Course Content
        </h2>
        {course.content.text ? (
          <div className="prose dark:prose-invert max-w-none">
            {renderFormattedText(course.content.text)}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 italic">
            No content available for this course.
          </p>
        )}

        {/* Media Content */}
        {(course.content.audioUrl ||
          course.content.videoUrl ||
          course.content.imageUrl) && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Media Resources
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {course.content.imageUrl && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Course Image
                  </h4>
                  <Image
                    src={course.content.imageUrl}
                    alt="Course"
                    width={300}
                    height={128}
                    className="w-full h-32 object-cover rounded"
                  />
                </div>
              )}
              {course.content.audioUrl && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Audio Resource
                  </h4>
                  <audio controls className="w-full">
                    <source src={course.content.audioUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
              {course.content.videoUrl && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Video Resource
                  </h4>
                  <video controls className="w-full h-32">
                    <source src={course.content.videoUrl} type="video/mp4" />
                    Your browser does not support the video element.
                  </video>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Course Quizzes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Course Quizzes ({quizzes.length})
          </h2>
          <Link href={`/dashboard/quizzes/create?courseId=${course.id}`}>
            <Button variant="primary">Add Quiz</Button>
          </Link>
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
              Create a quiz to test students&apos; understanding of this course.
            </p>
            <div className="mt-6">
              <Link href={`/dashboard/quizzes/create?courseId=${course.id}`}>
                <Button variant="primary">Create First Quiz</Button>
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
                        <Button variant="outline" size="sm">
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
                                    {question.answers.map((answer, aIndex) => (
                                      <div
                                        key={answer.id}
                                        className={`text-sm px-3 py-2 rounded ${
                                          question.correctAnswerId === answer.id
                                            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 font-medium"
                                            : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                        }`}
                                      >
                                        {String.fromCharCode(65 + aIndex)}.{" "}
                                        {answer.text}
                                        {question.correctAnswerId ===
                                          answer.id && (
                                          <span className="ml-2 text-green-600 dark:text-green-400">
                                            ✓ Correct
                                          </span>
                                        )}
                                      </div>
                                    ))}
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
    </div>
  );
}
