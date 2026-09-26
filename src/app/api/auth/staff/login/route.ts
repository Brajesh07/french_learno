import { NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { checkWrite, readBody, reply } from '@/lib/staff/http';
export async function POST(request: NextRequest) {
  const invalid = checkWrite(request); if (invalid) return invalid;
  try {
    const body = await readBody(request, 8192);
    let email = String(body.identifier ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    if (!email || email.length > 254 || password.length > 256 || !password) return reply({ error: 'Enter your credentials.' }, 400);
    if (!email.includes('@')) {
      const admin = await createAdminClient();
      const { data } = await admin.from('profiles').select('email').eq('username', email).maybeSingle();
      email = data?.email ?? 'unknown-staff@example.invalid';
    }
    const client = await createClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.user) return reply({ error: 'Unable to sign in with these credentials.' }, 401);
    const { data: profile } = await client.from('profiles').select('role, is_active, must_change_password').eq('id', data.user.id).maybeSingle();
    if (!profile || !['admin', 'teacher'].includes(profile.role) || !profile.is_active || profile.must_change_password) {
      await client.auth.signOut({ scope: 'local' });
      return reply({ error: 'This account cannot sign in here. Contact your administrator if access is restricted.' }, 403);
    }
    let destination = '/dashboard';
    if (profile.role === 'teacher') {
      const { data: teacher } = await client.from('teacher_profiles').select('verification_status').eq('id', data.user.id).maybeSingle();
      destination = teacher?.verification_status === 'approved' ? '/teacher/courses' : '/teacher/pending';
    }
    return reply({ destination });
  } catch { return reply({ error: 'Sign in is unavailable. Please try again.' }, 503); }
}
