import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseProgressWrite } from '@/lib/learning/progress';
import { loadLearningProgress, PROGRESS_FIELDS, PROGRESS_TABLE, snapshotFromRow } from '@/lib/learning/progress-server';

export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status,
  headers: { 'Cache-Control': 'private, no-store' },
});

// The admin AuthProvider deliberately excludes students. Use the existing
// Supabase cookie session directly, and check the role on every request.
async function authenticatedStudent() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { response: json({ error: 'Please sign in again.' }, 401) };
  const { data: profile, error: profileError } = await client.from('profiles')
    .select('role, is_active').eq('id', user.id).maybeSingle();
  if (profileError) return { response: json({ error: 'Your account could not be verified.' }, 503) };
  if (!profile || profile.role !== 'student' || !profile.is_active) {
    return { response: json({ error: 'An active student account is required.' }, 403) };
  }
  return { client, user };
}

export async function GET() {
  try {
    const auth = await authenticatedStudent();
    if (auth.response) return auth.response;
    return json({ progress: await loadLearningProgress(auth.client, auth.user.id) });
  } catch {
    return json({ error: 'Your learning progress could not be loaded. Please try again.' }, 503);
  }
}

export async function PUT(request: NextRequest) {
  // Only same-origin JSON writes; no user identity or Supabase secret is accepted
  // from the browser. Authentication/role rules elsewhere remain unchanged.
  const origin = request.headers.get('origin');
  if ((origin && origin !== request.nextUrl.origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({ error: 'Cross-origin writes are not allowed.' }, 403);
  }
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return json({ error: 'Expected JSON.' }, 415);
  }
  try {
    const auth = await authenticatedStudent();
    if (auth.response) return auth.response;
    if (request.headers.get('x-learning-user') !== auth.user.id) {
      return json({ error: 'Your signed-in account changed. Reload before continuing.' }, 401);
    }
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 131072) return json({ error: 'Progress is too large.' }, 413);
    let write;
    try { write = parseProgressWrite(JSON.parse(raw)); }
    catch { return json({ error: 'Invalid learning progress.' }, 400); }

    const { data: existing, error: readError } = await auth.client.from(PROGRESS_TABLE)
      .select(PROGRESS_FIELDS).eq('user_id', auth.user.id).maybeSingle();
    if (readError) return json({ error: 'Progress storage is unavailable. Please try again.' }, 503);
    // A retry after a lost network response must not count as another write.
    if (existing?.last_mutation_id === write.mutationId) {
      return json({ progress: snapshotFromRow(existing) });
    }
    if ((existing?.revision ?? 0) !== write.revision) {
      return json({ error: 'Progress changed in another tab or device. Reload the saved version.', code: 'REVISION_CONFLICT' }, 409);
    }
    const values = {
      selected_language: write.selectedLanguage,
      state: write.state,
      revision: write.revision + 1,
      last_mutation_id: write.mutationId,
      updated_at: new Date().toISOString(),
    };
    const query = existing
      ? auth.client.from(PROGRESS_TABLE).update(values).eq('user_id', auth.user.id).eq('revision', write.revision)
      : auth.client.from(PROGRESS_TABLE).insert({ ...values, user_id: auth.user.id });
    const { data, error } = await query.select(PROGRESS_FIELDS).maybeSingle();
    if (error?.code === '23505' || (!error && !data)) {
      return json({ error: 'Progress changed in another tab or device. Reload the saved version.', code: 'REVISION_CONFLICT' }, 409);
    }
    if (error) return json({ error: 'Your progress was not saved. Please retry.' }, 503);
    return json({ progress: snapshotFromRow(data!) });
  } catch {
    return json({ error: 'Your progress was not saved. Please retry.' }, 503);
  }
}
