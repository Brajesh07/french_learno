"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BellIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  UserPlusIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface Notification {
  id: string;
  type: "login" | "quiz_complete" | "course_complete" | "signup";
  title: string;
  message: string;
  user_id: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

function typeIcon(type: Notification["type"]) {
  const cls = "h-5 w-5";
  switch (type) {
    case "login":
      return <UserPlusIcon className={`${cls} text-blue-500`} />;
    case "quiz_complete":
      return <AcademicCapIcon className={`${cls} text-amber-500`} />;
    case "course_complete":
      return <CheckCircleIcon className={`${cls} text-green-500`} />;
    case "signup":
      return <UserPlusIcon className={`${cls} text-purple-500`} />;
  }
}

function typeBadge(type: Notification["type"]) {
  switch (type) {
    case "login":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          Login
        </span>
      );
    case "quiz_complete":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
          Quiz
        </span>
      );
    case "course_complete":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Course
        </span>
      );
    case "signup":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          Signup
        </span>
      );
  }
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notifications?limit=50");
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to fetch notifications");
      setNotifications(data.notifications ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    setMarkingRead(true);
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      setError("Failed to mark notifications as read.");
    } finally {
      setMarkingRead(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BellIcon className="h-7 w-7 text-gray-700 dark:text-gray-300" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Notifications
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Student activity &amp; system events
            </p>
          </div>
          {unreadCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {markingRead ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircleIcon className="h-4 w-4" />
              )}
              Mark all as read
            </button>
          )}
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-4 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-64 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && notifications.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <BellIcon className="h-12 w-12 mb-3" />
          <p className="text-lg font-medium">No notifications yet</p>
          <p className="text-sm mt-1">
            Notifications will appear here when students log in or complete
            quizzes and courses.
          </p>
        </div>
      )}

      {/* Notification list */}
      {!loading && notifications.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                  !n.is_read
                    ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500"
                    : "border-l-4 border-transparent"
                }`}
              >
                {/* Type icon */}
                <div className="mt-0.5 shrink-0 h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  {typeIcon(n.type)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {n.title}
                    </span>
                    {typeBadge(n.type)}
                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
                    {n.message}
                  </p>
                  {typeof n.metadata?.userEmail === "string" && (
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                      {n.metadata.userEmail}
                    </p>
                  )}
                </div>

                {/* Timestamp */}
                <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap pt-1">
                  {formatTime(n.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
