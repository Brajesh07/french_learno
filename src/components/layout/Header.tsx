"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTheme } from "@/components/ui/ThemeProvider";
import {
  Bars3Icon,
  BellIcon,
  SunIcon,
  MoonIcon,
  ChevronDownIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  UserPlusIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";

// ----------------------------------------------------------------
// Notification types
// ----------------------------------------------------------------
interface NotificationItem {
  id: string;
  type: "login" | "quiz_complete" | "course_complete" | "signup";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function typeIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "login":
      return <UserPlusIcon className="h-4 w-4 text-blue-500" />;
    case "quiz_complete":
      return <AcademicCapIcon className="h-4 w-4 text-amber-500" />;
    case "course_complete":
      return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
    case "signup":
      return <UserPlusIcon className="h-4 w-4 text-purple-500" />;
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ----------------------------------------------------------------
// NotificationBell component
// ----------------------------------------------------------------
function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch count once on mount, then keep in sync via Realtime
  useEffect(() => {
    const supabase = createClient();

    const fetchCount = async () => {
      try {
        const res = await fetch("/api/admin/notifications?count=true");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count ?? 0);
        }
      } catch {
        // silently ignore network errors
      }
    };

    fetchCount();

    const channel = supabase
      .channel("notifications-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          fetchCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleDropdown = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        const fetched: NotificationItem[] = data.notifications ?? [];
        setItems(fetched);

        // Mark all as read if there are unread items
        if (fetched.some((n) => !n.is_read)) {
          await fetch("/api/admin/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ markAllRead: true }),
          });
          setUnreadCount(0);
        }
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        className="relative p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
      >
        <span className="sr-only">View notifications</span>
        <BellIcon className="h-6 w-6" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-800">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden">
          {/* Header row */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Notifications
            </span>
            <a
              href="/dashboard/notifications"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              onClick={() => setIsOpen(false)}
            >
              View all
            </a>
          </div>

          {/* Items */}
          <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {loading && (
              <li className="flex items-center justify-center py-6 text-gray-400">
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              </li>
            )}
            {!loading && items.length === 0 && (
              <li className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                No notifications yet
              </li>
            )}
            {!loading &&
              items.map((n) => (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 ${
                    !n.is_read
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : "bg-white dark:bg-gray-800"
                  }`}
                >
                  <span className="mt-0.5 shrink-0">{typeIcon(n.type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400 whitespace-nowrap">
                    {relativeTime(n.created_at)}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Header
// ----------------------------------------------------------------
interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left side - Menu toggle and logo */}
        <div className="flex items-center">
          <button
            type="button"
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
            onClick={onMenuToggle}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="ml-4 lg:ml-0">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              French Learning Admin
            </h1>
          </div>
        </div>

        {/* Right side - Theme toggle, notifications, and user menu */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <span className="sr-only">Toggle theme</span>
            {theme === "dark" ? (
              <SunIcon className="h-6 w-6" aria-hidden="true" />
            ) : (
              <MoonIcon className="h-6 w-6" aria-hidden="true" />
            )}
          </button>

          {/* Notification Bell */}
          <NotificationBell />

          {/* User Menu */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <span className="sr-only">Open user menu</span>
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user?.name || "Admin User"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </p>
                </div>
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              </div>
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <Menu.Item>
                  {({ active }) => (
                    <a
                      href="#"
                      className={`${
                        active ? "bg-gray-100 dark:bg-gray-700" : ""
                      } block px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                    >
                      Your Profile
                    </a>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <a
                      href="#"
                      className={`${
                        active ? "bg-gray-100 dark:bg-gray-700" : ""
                      } block px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                    >
                      Settings
                    </a>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleLogout}
                      className={`${
                        active ? "bg-gray-100 dark:bg-gray-700" : ""
                      } block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                    >
                      Sign out
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  );
};
