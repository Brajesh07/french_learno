"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  loading,
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
                {loading ? (
                  <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : (
                  value
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ActivityItem {
  id: string;
  description: string;
  timestamp: string;
}

interface DashboardStats {
  totalStudents: number;
  totalCourses: number;
  publishedCourses: number;
  totalQuizzes: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

export default function DashboardPage() {
  const [statsLoading, setStatsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalCourses: 0,
    publishedCourses: 0,
    totalQuizzes: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [studentsRes, coursesRes, publishedRes, quizzesRes] =
          await Promise.all([
            fetch("/api/admin/list-students?limit=1", {
              credentials: "include",
            }),
            fetch("/api/admin/courses?limit=1", { credentials: "include" }),
            fetch("/api/admin/courses?isPublished=true&limit=1", {
              credentials: "include",
            }),
            fetch("/api/admin/quizzes?limit=1", { credentials: "include" }),
          ]);

        const [studentsData, coursesData, publishedData, quizzesData] =
          await Promise.all([
            studentsRes.ok ? studentsRes.json() : { total: 0 },
            coursesRes.ok ? coursesRes.json() : { total: 0 },
            publishedRes.ok ? publishedRes.json() : { total: 0 },
            quizzesRes.ok ? quizzesRes.json() : { total: 0 },
          ]);

        setStats({
          totalStudents: studentsData.total ?? 0,
          totalCourses: coursesData.total ?? 0,
          publishedCourses: publishedData.total ?? 0,
          totalQuizzes: quizzesData.total ?? 0,
        });
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
      } finally {
        setStatsLoading(false);
      }
    }

    async function fetchActivity() {
      try {
        const [studentsRes, coursesRes, quizzesRes] = await Promise.all([
          fetch("/api/admin/list-students?limit=4", { credentials: "include" }),
          fetch("/api/admin/courses?limit=4", { credentials: "include" }),
          fetch("/api/admin/quizzes?limit=4", { credentials: "include" }),
        ]);

        const [studentsData, coursesData, quizzesData] = await Promise.all([
          studentsRes.ok ? studentsRes.json() : { students: [] },
          coursesRes.ok ? coursesRes.json() : { data: [] },
          quizzesRes.ok ? quizzesRes.json() : { data: [] },
        ]);

        const activities: (ActivityItem & { rawDate: string })[] = [];

        for (const s of studentsData.students ?? []) {
          activities.push({
            id: `student-${s.id}`,
            description: `New student registered: ${s.name || s.email}`,
            timestamp: "",
            rawDate: s.created_at,
          });
        }
        for (const c of coursesData.data ?? []) {
          activities.push({
            id: `course-${c.id}`,
            description: c.is_published
              ? `Course "${c.title}" published`
              : `Course "${c.title}" created`,
            timestamp: "",
            rawDate: c.created_at,
          });
        }
        for (const q of quizzesData.data ?? []) {
          activities.push({
            id: `quiz-${q.id}`,
            description: `Quiz "${q.title}" created`,
            timestamp: "",
            rawDate: q.created_at,
          });
        }

        activities.sort(
          (a, b) =>
            new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime(),
        );

        setRecentActivity(
          activities.slice(0, 6).map(({ rawDate, ...a }) => ({
            ...a,
            timestamp: timeAgo(rawDate),
          })),
        );
      } catch (err) {
        console.error("Failed to fetch recent activity:", err);
      } finally {
        setActivityLoading(false);
      }
    }

    fetchStats();
    fetchActivity();
  }, []);

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
        <StatCard
          title="Total Students"
          value={stats.totalStudents.toLocaleString()}
          icon={UsersIcon}
          loading={statsLoading}
        />
        <StatCard
          title="Total Courses"
          value={stats.totalCourses}
          icon={BookOpenIcon}
          loading={statsLoading}
        />
        <StatCard
          title="Quizzes Created"
          value={stats.totalQuizzes}
          icon={PuzzlePieceIcon}
          loading={statsLoading}
        />
        <StatCard
          title="Published Courses"
          value={stats.publishedCourses}
          icon={ChartBarIcon}
          loading={statsLoading}
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Recent Activity
          </h3>
          <div className="mt-5">
            {activityLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 animate-pulse"
                  >
                    <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                    <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No recent activity yet.
              </p>
            ) : (
              <div className="flow-root">
                <ul className="-mb-8">
                  {recentActivity.map((activity, idx) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {idx !== recentActivity.length - 1 ? (
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
                            <p className="text-sm text-gray-900 dark:text-white">
                              {activity.description}
                            </p>
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
            )}
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
              <Link
                href="/dashboard/courses/create"
                className="relative block w-full border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <BookOpenIcon className="mx-auto h-8 w-8 text-gray-400" />
                <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                  Create Course
                </span>
              </Link>

              <Link
                href="/dashboard/quizzes/create"
                className="relative block w-full border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PuzzlePieceIcon className="mx-auto h-8 w-8 text-gray-400" />
                <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                  Create Quiz
                </span>
              </Link>

              <Link
                href="/dashboard/students"
                className="relative block w-full border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <UsersIcon className="mx-auto h-8 w-8 text-gray-400" />
                <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                  View Students
                </span>
              </Link>

              <Link
                href="/dashboard/courses"
                className="relative block w-full border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ChartBarIcon className="mx-auto h-8 w-8 text-gray-400" />
                <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                  All Courses
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
