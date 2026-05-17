"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QuizCreator from "../../QuizCreator";
import { Button } from "@/components/ui/Button";

export default function EditQuizPage() {
  const params = useParams();
  const quizId = params.id as string;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/quizzes">
            <Button variant="outline">
              ← Back to Quizzes
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Edit Quiz
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Update your quiz questions and settings
            </p>
          </div>
        </div>
      </div>

      {/* Quiz Creator in Edit Mode */}
      <QuizCreator quizId={quizId} />
    </div>
  );
}
