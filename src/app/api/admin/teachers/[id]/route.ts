import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/supabase/auth-helpers';
import { createClient } from '@/lib/supabase/server';
import { checkWrite, readBody, reply, databaseFailure } from '@/lib/staff/http';
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const invalid = checkWrite(request); if (invalid) return invalid;
  const auth = await requireAdmin(request); if (auth.error) return auth.error;
  try {
    const { id } = await params, body = await readBody(request, 4096);
    if (!['approved', 'rejected'].includes(String(body.decision)) || typeof body.expected !== 'string') return reply({ error: 'Invalid decision.' }, 400);
    const client = await createClient();
    const { error } = await client.rpc('review_teacher', { p_teacher_id: id, p_expected: body.expected, p_decision: body.decision });
    if (error) return databaseFailure(error);
    return reply({ status: body.decision });
  } catch { return reply({ error: 'Unable to review this teacher.' }, 400); }
}
