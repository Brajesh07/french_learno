import Link from 'next/link';
import { requireStaffPage } from '@/lib/staff/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { TeacherTable } from '@/components/staff/TeacherTable';
export default async function TeachersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireStaffPage('admin');
  const query = await searchParams, page = Math.max(1, Math.min(10000, Math.floor(Number(query.page)) || 1));
  const admin = await createAdminClient();
  const { data: profiles, count, error } = await admin.from('profiles').select('id, name, email, is_active', { count: 'exact' }).eq('role', 'teacher').order('created_at', { ascending: false }).range((page - 1) * 25, page * 25 - 1);
  if (error) throw new Error('Unable to load teachers.');
  const ids = (profiles ?? []).map(p => p.id);
  const { data: applications, error: ae } = ids.length ? await admin.from('teacher_profiles').select('id, bio, expertise, verification_status').in('id', ids) : { data: [], error: null };
  if (ae) throw new Error('Unable to load applications.');
  const rows = (profiles ?? []).map(p => { const a = applications?.find(a => a.id === p.id); return { ...p, status: a?.verification_status ?? 'missing profile', bio: a?.bio ?? null, expertise: a?.expertise ?? null }; });
  return <section className="p-6 text-gray-900 dark:text-white"><h1 className="text-3xl font-bold">Teachers</h1><p className="mt-2 text-gray-500">Review applications and manage access to the teacher workspace. Rejecting an approved teacher also unpublishes their content.</p><TeacherTable rows={rows}/><nav aria-label="Teacher pages" className="mt-6 flex gap-6">{page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}<span>Page {page}</span>{page * 25 < (count ?? 0) && <Link href={`?page=${page + 1}`}>Next</Link>}</nav></section>;
}
