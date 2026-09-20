import Link from 'next/link';
import { requireStaffPage } from '@/lib/staff/auth';
import { StaffLogout } from '@/components/staff/StaffLogout';
export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaffPage('teacher', false);
  return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white"><header className="border-b bg-white dark:bg-gray-900 p-5 flex flex-wrap items-center justify-between gap-4"><Link href="/teacher" className="font-bold text-xl">FrenchLearno · Teacher</Link><div className="flex items-center gap-4"><span>{session.profile.name}</span><StaffLogout/></div></header><div className="mx-auto max-w-7xl p-5">{session.status === 'approved' && <nav aria-label="Teacher navigation" className="mb-6 flex gap-5"><Link href="/teacher/courses">My courses</Link><Link href="/teacher/quizzes">My quizzes</Link></nav>}{children}</div></div>;
}
