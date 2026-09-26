import { requireStaffPage } from '@/lib/staff/auth';
export default async function ApprovedTeacherLayout({ children }: { children: React.ReactNode }) {
  await requireStaffPage('teacher'); return <>{children}</>;
}
