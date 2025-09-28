"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Transition } from "@headlessui/react";
import {
  HomeIcon,
  UsersIcon,
  BookOpenIcon,
  PuzzlePieceIcon,
  BellIcon,
  ChartBarIcon,
  XMarkIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: number;
}

const navigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: HomeIcon,
  },
  {
    name: "Students",
    href: "/dashboard/students",
    icon: UsersIcon,
  },
  {
    name: "Courses",
    href: "/dashboard/courses",
    icon: BookOpenIcon,
  },
  {
    name: "Quizzes",
    href: "/dashboard/quizzes",
    icon: PuzzlePieceIcon,
  },
  {
    name: "Upload Test",
    href: "/dashboard/upload-test",
    icon: CloudArrowUpIcon,
  },
  {
    name: "Notifications",
    href: "/dashboard/notifications",
    icon: BellIcon,
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: ChartBarIcon,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();

  const isActiveRoute = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile backdrop */}
      <Transition
        show={isOpen}
        enter="transition-opacity ease-linear duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity ease-linear duration-300"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={onClose}
        />
      </Transition>

      {/* Sidebar */}
      <Transition
        show={isOpen}
        enter="transition ease-in-out duration-300 transform"
        enterFrom="-translate-x-full"
        enterTo="translate-x-0"
        leave="transition ease-in-out duration-300 transform"
        leaveFrom="translate-x-0"
        leaveTo="-translate-x-full"
      >
        <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg lg:translate-x-0 lg:static lg:inset-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">FL</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    French Learn
                  </h2>
                </div>
              </div>

              {/* Close button for mobile */}
              <button
                type="button"
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                onClick={onClose}
              >
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = isActiveRoute(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      // Close mobile sidebar when navigating
                      if (window.innerWidth < 1024) {
                        onClose();
                      }
                    }}
                    className={cn(
                      "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200",
                      isActive
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    <Icon
                      className={cn(
                        "mr-3 flex-shrink-0 h-5 w-5",
                        isActive
                          ? "text-blue-500 dark:text-blue-400"
                          : "text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300"
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="ml-3 inline-block py-0.5 px-2 text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                <p>Version 1.0.0:28082025</p>
                <p>© {new Date().getFullYear()} French Learning App</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </>
  );
};
