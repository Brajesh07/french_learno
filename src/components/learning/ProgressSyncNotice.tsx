'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/learning/dialog';
import type { SyncStatus } from '@/lib/learning/progress-sync';

export function ProgressSyncNotice({ status, error, retry }: {
  status: SyncStatus; error: string | null; retry: () => Promise<void>;
}) {
  const [retrying, setRetrying] = useState(false);
  const blocked = status === 'error' || status === 'conflict' || status === 'session-changed';
  // Keep the dialog mounted during retry so the in-progress lesson stays intact.
  return (
    <Dialog open={blocked || retrying}>
      <DialogContent className="flow-dialog sync-dialog" showCloseButton={false}
        onEscapeKeyDown={event => event.preventDefault()}
        onInteractOutside={event => event.preventDefault()}>
        <DialogTitle>{status === 'session-changed' ? 'Your session needs attention' : 'Let’s keep your progress safe'}</DialogTitle>
        <DialogDescription>{retrying ? 'Saving your progress…' : error}</DialogDescription>
        {status === 'error' && <button className="primary" disabled={retrying} onClick={async () => {
          setRetrying(true);
          try { await retry(); } catch { /* Show the updated sync error. */ }
          finally { setRetrying(false); }
        }}>Retry saving</button>}
        <button className="plain-button" disabled={retrying} onClick={() => window.location.reload()}>
          {status === 'session-changed' ? 'Reload your session' : 'Discard unsaved changes and reload'}
        </button>
      </DialogContent>
    </Dialog>
  );
}
