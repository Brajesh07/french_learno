"use client";

import React from "react";
import {
  UsersIcon,
  BookOpenIcon,
  PuzzlePieceIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {title}
              </dt>
              <dd className="text-lg font-medium text-gray-900 dark:text-white">
                {value}
              </dd>
            </dl>
          </div>
        </div>
        {trend && (
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <span
                className={`${
                  trend.isPositive ? "text-green-600" : "text-red-600"
                } font-medium`}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}%
              </span>
              <span className="ml-2 text-gray-500 dark:text-gray-400">
                from last month
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function DashboardPage() {
  // Mock data - in a real app, this would come from your API
  const stats = [
    {
      title: "Total Students",
      value: "1,234",
      icon: UsersIcon,
      trend: { value: 12, isPositive: true },
    },
    {
      title: "Active Courses",
      value: "45",
      icon: BookOpenIcon,
      trend: { value: 5, isPositive: true },
    },
    {
      title: "Quizzes Created",
      value: "128",
      icon: PuzzlePieceIcon,
      trend: { value: 8, isPositive: true },
    },
    {
      title: "Completion Rate",
      value: "87%",
      icon: ChartBarIcon,
      trend: { value: 3, isPositive: true },
    },
  ];

  const recentActivity = [
    {
      id: 1,
      type: "student_registered",
      description: "New student registered: Marie Dubois",
      timestamp: "2 hours ago",
    },
    {
      id: 2,
      type: "course_published",
      description: 'Course "French Grammar Basics" published',
      timestamp: "4 hours ago",
    },
    {
      id: 3,
      type: "quiz_completed",
      description: '15 students completed "A1 Vocabulary Quiz"',
      timestamp: "6 hours ago",
    },
    {
      id: 4,
      type: "course_completed",
      description: 'Student completed "Introduction to French"',
      timestamp: "8 hours ago",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Welcome back! Here&apos;s what&apos;s happening with your French
          learning app.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            trend={stat.trend}
          />
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Recent Activity
          </h3>
          <div className="mt-5">
            <div className="flow-root">
              <ul className="-mb-8">
                {recentActivity.map((activity, activityIdx) => (
                  <li key={activity.id}>
                    <div className="relative pb-8">
                      {activityIdx !== recentActivity.length - 1 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-600"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white dark:ring-gray-800">
                            <div className="h-2 w-2 bg-white rounded-full" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white">
                              {activity.description}
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {activity.timestamp}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Quick Actions
          </h3>
          <div className="mt-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button className="relative block w-full border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <BookOpenIcon className="mx-auto h-8 w-8 text-gray-400" />
                <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                  Create Course
                </span>
              </button>

              <button className="relative block w-full border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <PuzzlePieceIcon className="mx-auto h-8 w-8 text-gray-400" />
                <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                  Create Quiz
                </span>
              </button>

              <button className="relative block w-full border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <UsersIcon className="mx-auto h-8 w-8 text-gray-400" />
                <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                  View Students
                </span>
              </button>

              <button className="relative block w-full border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <ChartBarIcon className="mx-auto h-8 w-8 text-gray-400" />
                <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                  View Analytics
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
