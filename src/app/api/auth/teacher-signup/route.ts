import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { checkWrite, readBody, reply } from '@/lib/staff/http';
export async function POST(request: NextRequest) {
  const invalid = checkWrite(request); if (invalid) return invalid;
  try {
    const body = await readBody(request, 16384);
    const name = String(body.name ?? '').trim(), username = String(body.username ?? '').trim().toLowerCase();
    const email = String(body.email ?? '').trim().toLowerCase(), password = String(body.password ?? '');
    const bio = String(body.bio ?? '').trim(), expertise = String(body.expertise ?? '').trim();
    if (!name || name.length > 80 || !/^[a-z0-9_]{3,40}$/.test(username)
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254
      || password.length < 10 || password.length > 256 || bio.length > 2000 || expertise.length > 300) {
      return reply({ error: 'Check your details. Use a 3–40 character username (letters, numbers, underscores) and a password of at least 10 characters.' }, 400);
    }
    const admin = await createAdminClient();
    const { data: allowed, error: limitError } = await admin.rpc('reserve_teacher_signup', { p_email_hash: createHash('sha256').update(email).digest('hex') });
    if (limitError) return reply({ error: 'Teacher signup is unavailable. Please try again.' }, 503);
    if (!allowed) return reply({ error: 'Too many signup attempts. Please try again later.' }, 429);
    // MVP: no signup OTP. Teacher approval is a separate administrative decision.
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, username } });
    if (error || !data.user) return reply({ error: 'Unable to create this account. If you already registered, sign in.' }, 400);
    const { error: pe } = await admin.rpc('provision_teacher', { p_user_id: data.user.id, p_name: name, p_username: username, p_bio: bio, p_expertise: expertise });
    if (pe) {
      const cleanup = await admin.auth.admin.deleteUser(data.user.id);
      if (cleanup.error) console.error('Teacher signup cleanup failed for new account', data.user.id);
      return reply({ error: 'Unable to create this profile. Try a different username or contact support.' }, 400);
    }
    const client = await createClient();
    const { error: loginError } = await client.auth.signInWithPassword({ email, password });
    return reply({ destination: loginError ? '/login?registered=teacher' : '/teacher/pending' }, 201);
  } catch { return reply({ error: 'Teacher signup is unavailable. Please try again.' }, 503); }
}
