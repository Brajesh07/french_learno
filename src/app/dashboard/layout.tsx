import { requireStaffPage } from '@/lib/staff/auth';
import AdminShell from '@/components/staff/AdminShell';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireStaffPage('admin');
  return <AdminShell>{children}</AdminShell>;
}
