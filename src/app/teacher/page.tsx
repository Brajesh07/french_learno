import { redirect } from 'next/navigation';
import { requireStaffPage } from '@/lib/staff/auth';
export default async function TeacherPage() { await requireStaffPage('teacher'); redirect('/teacher/courses'); }
