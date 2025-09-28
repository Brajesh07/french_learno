"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function MigrateStudentsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    totalStudents?: number;
    migratedStudents?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMigration = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/migrate-students", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Migration failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Student Data Migration
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Migrate existing student records to include subscription and access
          control fields.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Migration Details
        </h2>

        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            This migration will update existing student records to include:
          </p>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2">
            <li>
              <strong>hasSubscription</strong>: Set to false by default (can be
              changed by admin)
            </li>
            <li>
              <strong>isActive</strong>: Set to true by default
            </li>
            <li>
              <strong>Level conversion</strong>: beginner → A1, intermediate →
              B1, advanced → B2
            </li>
            <li>
              <strong>Progress structure</strong>: Move quizzesCompleted to
              progress object
            </li>
            <li>
              <strong>Timestamps</strong>: Add missing createdAt and lastUpdated
              fields
            </li>
          </ul>
        </div>

        <div className="border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-200">
                <strong>Important:</strong> This migration is safe and will only
                add missing fields. Existing data will not be overwritten.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            <strong>Success:</strong> {result.message}
            {result.totalStudents && (
              <div className="mt-2">
                <p>Total Students: {result.totalStudents}</p>
                <p>Migrated Students: {result.migratedStudents}</p>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleMigration}
          disabled={loading}
          variant="primary"
          className="w-full sm:w-auto"
        >
          {loading ? "Migrating..." : "Start Migration"}
        </Button>
      </div>

      <div className="mt-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          After Migration
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Once migration is complete, you can:
        </p>
        <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2">
          <li>
            Use the student management dashboard to grant/revoke subscriptions
          </li>
          <li>
            Students will be able to access quizzes based on their subscription
            status
          </li>
          <li>A1 level content remains free for all students</li>
          <li>B1 and B2 level content requires subscription</li>
        </ul>
      </div>
    </div>
  );
}
