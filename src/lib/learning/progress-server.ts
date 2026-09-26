import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { emptyProgress, SUPPORTED_LANGUAGE, type ProgressSnapshot } from './progress';
import { parseState } from './model';

export const PROGRESS_TABLE = 'student_learning_progress';
export const PROGRESS_FIELDS = 'state, selected_language, revision, last_mutation_id';

export function snapshotFromRow(row: {
  state: unknown;
  selected_language: unknown;
  revision: unknown;
}): ProgressSnapshot {
  if (row.selected_language !== SUPPORTED_LANGUAGE || !Number.isSafeInteger(row.revision) || Number(row.revision) < 1) {
    throw new Error('Invalid saved learning progress');
  }
  return {
    state: parseState(JSON.stringify(row.state)),
    selectedLanguage: SUPPORTED_LANGUAGE,
    revision: Number(row.revision),
  };
}

/** Uses the existing cookie-authenticated client. RLS remains in force. */
export async function loadLearningProgress(client: SupabaseClient, userId: string): Promise<ProgressSnapshot> {
  const { data, error } = await client.from(PROGRESS_TABLE).select(PROGRESS_FIELDS).eq('user_id', userId).maybeSingle();
  if (error) throw new Error('Your learning progress could not be loaded. Please try again.');
  return data ? snapshotFromRow(data) : emptyProgress();
}
