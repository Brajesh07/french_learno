"use client";

import React from "react";

export default function SimpleTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Simple Test Page
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            This is a simple test to check if the page loads.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Test Content
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            If you can see this, the page routing is working correctly.
          </p>
        </div>
      </div>
    </div>
  );
}
