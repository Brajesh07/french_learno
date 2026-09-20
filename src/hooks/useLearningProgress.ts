'use client';

import { useEffect, useState, useSyncExternalStore, type SetStateAction } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { State } from '@/lib/learning/model';
import { SUPPORTED_LANGUAGE, type ProgressSnapshot } from '@/lib/learning/progress';
import { ProgressSyncError, ProgressSyncQueue } from '@/lib/learning/progress-sync';

/** Bound to the server-verified student ID, never the admin-only AuthProvider. */
export function useLearningProgress(userId: string, initialProgress: ProgressSnapshot) {
  const [queue] = useState(() => new ProgressSyncQueue(initialProgress, async write => {
    const response = await fetch('/api/student/learning-progress', {
      method: 'PUT', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Learning-User': userId },
      body: JSON.stringify(write),
    });
    const body = await response.json();
    if (!response.ok) {
      const status = response.status === 401 || response.status === 403 ? 'session-changed' : response.status === 409 ? 'conflict' : 'error';
      throw new ProgressSyncError(body.error || 'Your progress was not saved.', status);
    }
    return body.progress as ProgressSnapshot;
  }));
  const view = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);

  useEffect(() => {
    const client = createClient();
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!session || session.user.id !== userId) queue.suspend();
    });
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (queue.dirty) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { subscription.unsubscribe(); window.removeEventListener('beforeunload', beforeUnload); };
  }, [queue, userId]);

  const setState = (update: SetStateAction<State>) => {
    const current = queue.getSnapshot().progress.state;
    queue.update(typeof update === 'function' ? update(current) : update);
  };
  const selectFrench = async () => {
    queue.update(queue.getSnapshot().progress.state, SUPPORTED_LANGUAGE);
    await queue.flush();
  };
  return { ...view, state: view.progress.state, setState, selectFrench, flush: () => queue.flush() };
}
