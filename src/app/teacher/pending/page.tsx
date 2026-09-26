import { redirect } from 'next/navigation';
import { requireStaffPage } from '@/lib/staff/auth';
import { RefreshStatus } from '@/components/staff/RefreshStatus';
export default async function PendingTeacherPage() {
  const session = await requireStaffPage('teacher', false);
  if (session.status === 'approved') redirect('/teacher/courses');
  return <section className="mx-auto my-12 max-w-xl rounded-2xl border bg-white dark:bg-gray-900 p-8"><p className="text-sm font-semibold uppercase text-blue-600">Application · {session.status}</p><h1 className="mt-3 text-3xl font-bold">{session.status === 'rejected' ? 'Your application was not approved' : session.status === 'suspended' ? 'Your teacher access is suspended' : 'Your application is under review'}</h1><p className="mt-4 text-gray-500">{['rejected', 'suspended'].includes(session.status) ? 'Contact your administrator to discuss your application. Content management is unavailable.' : 'An administrator will review your application. Once approved, you can create courses and quizzes in your workspace.'}</p><RefreshStatus/></section>;
}
