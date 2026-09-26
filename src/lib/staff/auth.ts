import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export async function staffSession() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: pe } = await client.from('profiles').select('id, name, email, role, is_active, must_change_password').eq('id', user.id).maybeSingle();
  if (pe) throw new Error('Account verification unavailable.');
  if (!profile) return null;
  const { data: teacher, error: te } = profile.role === 'teacher'
    ? await client.from('teacher_profiles').select('verification_status').eq('id', user.id).maybeSingle()
    : { data: null, error: null };
  if (te) throw new Error('Teacher verification unavailable.');
  return { client, user, profile, status: teacher?.verification_status ?? 'pending' };
}
export async function requireStaffPage(role: 'admin' | 'teacher', approved = true) {
  const session = await staffSession();
  if (!session) redirect('/login');
  if (!session.profile.is_active || session.profile.must_change_password || session.profile.role !== role) redirect('/staff/access');
  if (role === 'teacher' && approved && session.status !== 'approved') redirect('/teacher/pending');
  return session;
}
