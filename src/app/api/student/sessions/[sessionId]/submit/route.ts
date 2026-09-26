import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isUuid, readSubmission, submissionFailure, SubmissionInputError } from '@/lib/gamification/submission';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const origin = request.headers.get('origin');
  if ((origin && origin !== request.nextUrl.origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({ error: 'Cross-origin submissions are not allowed.' }, 403);
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: 'Expected JSON.' }, 415);
  }
  try {
    const { sessionId } = await params;
    if (!isUuid(sessionId)) return json({ error: 'Invalid session identifier.' }, 400);
    const client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return json({ error: 'Please sign in again.' }, 401);
    if (request.headers.get('x-learning-user') && request.headers.get('x-learning-user') !== user.id) return json({ error: 'Your signed-in account changed. Reload to continue.' }, 403);
    const { data: profile, error: profileError } = await client.from('profiles')
      .select('role,is_active,must_change_password').eq('id', user.id).maybeSingle();
    if (profileError) return json({ error: 'Account verification is unavailable.' }, 503);
    if (profile?.role !== 'student' || !profile.is_active || profile.must_change_password) {
      return json({ error: 'An active student account is required.' }, 403);
    }
    const submission = await readSubmission(request, sessionId);
    // One cookie-authenticated RPC: auth.uid() is the identity. The database
    // rechecks access, reads the private key, grades, locks totals, and commits
    // response + rewards + review + receipt together. No service key is needed.
    const { data, error } = await client.rpc('submit_learning_answer', {
      p_session_id: sessionId, p_submission: submission,
    });
    if (error) { const failure = submissionFailure(error); return json({ error: failure.error, code: failure.code }, failure.status); }
    if (!data) return json({ error: 'Submission receipt is unavailable.' }, 503);
    return json(data);
  } catch (error) {
    if (error instanceof SubmissionInputError) return json({ error: error.message }, error.status);
    return json({ error: 'Your answer could not be saved. Retry with the same idempotency key.', code: 'SUBMISSION_UNAVAILABLE' }, 503);
  }
}
