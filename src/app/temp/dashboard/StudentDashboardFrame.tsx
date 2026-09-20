'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from './BottomNav';

export function StudentDashboardFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The gamified home owns its desktop/mobile navigation. Retain the existing
  // shell unchanged for courses, quizzes and account pages.
  if (pathname === '/temp/dashboard' || pathname === '/temp/dashboard/') return <>{children}</>;
  return (
    <div className="min-h-[100svh] bg-[#F5F5F7] relative pb-16">
      <main className="pb-8">{children}</main>
      <BottomNav />
    </div>
  );
}
