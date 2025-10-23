"use client";

import React, { useState, useEffect } from "react";

interface Course {
  id: string;
  title: string;
  quizCount: number;
}

interface Quiz {
  id: string;
  title: string;
  courseId: string;
}

export default function QuizMigrationTool() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [globalQuizzes, setGlobalQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/debug/courses", {
        credentials: "include",
      });
      const data = await response.json();

      if (data.success) {
        setCourses(data.courses);
        setGlobalQuizzes(data.globalQuizzes);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const migrateQuiz = async (
    quizId: string,
    oldCourseId: string,
    newCourseId: string
  ) => {
    setMigrating(true);
    setMessage("");

    try {
      const response = await fetch("/api/debug/migrate-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          quizId,
          oldCourseId,
          newCourseId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ ${result.message}`);
        // Refresh data
        await fetchData();
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Quiz Migration Tool</h1>

      {message && (
        <div
          className={`p-4 rounded mb-6 ${
            message.startsWith("✅")
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Courses */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Current Courses</h2>
          <div className="space-y-3">
            {courses.map((course) => (
              <div key={course.id} className="border rounded-lg p-4">
                <h3 className="font-medium">{course.title}</h3>
                <p className="text-sm text-gray-600">ID: {course.id}</p>
                <p className="text-sm text-gray-600">
                  Quizzes: {course.quizCount}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Global Quizzes */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Global Quizzes (Need Migration)
          </h2>
          <div className="space-y-3">
            {globalQuizzes.map((quiz) => (
              <div key={quiz.id} className="border rounded-lg p-4">
                <h3 className="font-medium">{quiz.title}</h3>
                <p className="text-sm text-gray-600">ID: {quiz.id}</p>
                <p className="text-sm text-gray-600">
                  Current Course ID: {quiz.courseId}
                </p>

                <div className="mt-3">
                  <label className="block text-sm font-medium mb-2">
                    Migrate to Course:
                  </label>
                  <select
                    className="w-full border rounded px-3 py-2 mb-2"
                    onChange={(e) => {
                      if (e.target.value) {
                        const newCourseId = e.target.value;
                        const course = courses.find(
                          (c) => c.id === newCourseId
                        );
                        if (
                          course &&
                          window.confirm(
                            `Migrate "${quiz.title}" to "${course.title}"?`
                          )
                        ) {
                          migrateQuiz(quiz.id, quiz.courseId, newCourseId);
                        }
                      }
                    }}
                  >
                    <option value="">Select course...</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900">Instructions:</h3>
        <ol className="list-decimal list-inside text-sm text-blue-800 mt-2 space-y-1">
          <li>Review your current courses and global quizzes</li>
          <li>For each quiz, select the correct course to migrate it to</li>
          <li>The quiz will be moved to the course&apos;s subcollection</li>
          <li>
            After migration, the quiz should appear in the course edit page
          </li>
        </ol>
      </div>

      {migrating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-center">Migrating quiz...</p>
          </div>
        </div>
      )}
    </div>
  );
}
