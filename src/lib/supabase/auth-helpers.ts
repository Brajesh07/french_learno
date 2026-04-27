import { createAdminClient, createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Verifies the incoming request has a valid Supabase session
 * AND that the authenticated user has the 'admin' role.
 *
 * Returns { userId, error } where error is a NextResponse if auth failed.
 */
export async function requireAdmin(
  _request: NextRequest
): Promise<
  | { userId: string; error: null }
  | { userId: null; error: NextResponse }
> {
  const supabase = await createClient();

  // getUser() validates the session server-side (no trust of client cookies)
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      userId: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  // Check role in profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return {
      userId: null,
      error: NextResponse.json(
        { error: 'Forbidden: admin access required' },
        { status: 403 }
      ),
    };
  }

  return { userId: user.id, error: null };
}

/**
 * Returns a Supabase admin client (service role).
 * Use this for operations that bypass RLS.
 */
export { createAdminClient };
