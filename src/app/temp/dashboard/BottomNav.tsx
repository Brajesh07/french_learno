"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-6 left-5 right-5 h-16 bg-[#1A1A1A] rounded-[40px] flex items-center justify-around px-2 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] z-50">
      <NavItem
        href="/temp/dashboard"
        active={pathname === "/temp/dashboard"}
        icon={<IconHome />}
        label="Home"
      />
      <NavItem
        href="/temp/dashboard/courses"
        active={pathname.includes("/courses")}
        icon={<IconBook />}
        label="Courses"
      />
      <NavItem
        href="/temp/dashboard/quizzes"
        active={pathname.includes("/quizzes")}
        icon={<IconQuiz />}
        label="Quizzes"
      />
      <NavItem
        href="/temp/dashboard/profile"
        active={pathname === "/temp/dashboard/profile"}
        icon={<IconProfile />}
        label="Profile"
      />
    </nav>
  );
}

function NavItem({
  href,
  icon,
  active = false,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  active?: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 no-underline transition-colors duration-200 ${
        active ? "bg-white text-[#111111]" : "bg-transparent text-[#888888]"
      }`}
    >
      {icon}
    </Link>
  );
}

function IconHome() {
  return (
    <svg
      width="20"
      height="20"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

function IconBook() {
  return (
    <svg
      width="20"
      height="20"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}

function IconQuiz() {
  return (
    <svg
      width="20"
      height="20"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg
      width="20"
      height="20"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}
