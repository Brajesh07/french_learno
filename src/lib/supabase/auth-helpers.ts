import { createAdminClient, createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function requireAdmin(_request?: NextRequest): Promise<
  { userId: string; error: null } | { userId: null; error: NextResponse }
> {
  void _request;
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { userId: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await client.from('profiles').select('role, is_active, must_change_password').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin' || !profile.is_active || profile.must_change_password) {
    return { userId: null, error: NextResponse.json({ error: 'Active admin access required' }, { status: 403 }) };
  }
  return { userId: user.id, error: null };
}
export async function requireApprovedTeacher() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  const { data: allowed, error: roleError } = await client.rpc('is_approved_teacher');
  if (roleError || !allowed) return { error: NextResponse.json({ error: 'Approved teacher access required' }, { status: 403 }) } as const;
  return { error: null, client, userId: user.id } as const;
}
export { createAdminClient };
