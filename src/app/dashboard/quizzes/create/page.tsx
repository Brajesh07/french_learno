"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import QuizCreator from "../QuizCreator";
import { Button } from "@/components/ui/Button";

interface CourseInfo {
  id: string;
  title: string;
  level: string;
}

export default function CreateQuizPage() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
  const [loading, setLoading] = useState(!!courseId);

  useEffect(() => {
    if (courseId) {
      fetchCourseInfo(courseId);
    }
  }, [courseId]);

  const fetchCourseInfo = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/courses/${id}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setCourseInfo({
          id: data.course.id,
          title: data.course.title,
          level: data.course.level,
        });
      }
    } catch (error) {
      console.error("Error fetching course info:", error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading course information...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={
              courseId
                ? `/dashboard/courses/${courseId}/edit`
                : "/dashboard/quizzes"
            }
          >
            <Button variant="outline">
              ← Back to {courseId ? "Course" : "Quizzes"}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Create New Quiz
              {courseInfo && (
                <span className="text-lg font-normal text-gray-600 dark:text-gray-400 ml-2">
                  for {courseInfo.title}
                </span>
              )}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {courseInfo
                ? `Create a quiz for "${courseInfo.title}" (${courseInfo.level} level)`
                : "Create a new quiz for your French learning courses"}
            </p>
          </div>
        </div>
      </div>

      {/* Quiz Creator */}
      <QuizCreator
        courseId={courseId || undefined}
        courseTitle={courseInfo?.title}
      />
    </div>
  );
}
