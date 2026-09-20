import type { State } from './model';
import type { LearningLanguage, ProgressSnapshot, ProgressWrite } from './progress';

export type SyncStatus = 'saved' | 'saving' | 'error' | 'conflict' | 'session-changed';
export class ProgressSyncError extends Error {
  constructor(message: string, public readonly status: Exclude<SyncStatus, 'saved' | 'saving'> = 'error') {
    super(message);
  }
}
export type SyncView = { progress: ProgressSnapshot; status: SyncStatus; error: string | null };
type Attempt = { write: ProgressWrite; generation: number };

/** Serializes snapshots; keeps an uncertain request's ID stable across retries. */
export class ProgressSyncQueue {
  private view: SyncView;
  private generation = 0;
  private savedGeneration = 0;
  private attempt: Attempt | null = null;
  private running: Promise<void> | null = null;
  private listeners = new Set<() => void>();

  constructor(
    initial: ProgressSnapshot,
    private readonly send: (write: ProgressWrite) => Promise<ProgressSnapshot>,
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {
    this.view = { progress: initial, status: 'saved', error: null };
  }
  getSnapshot = () => this.view;
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => { this.listeners.delete(callback); };
  };
  private publish(next: SyncView) {
    this.view = next;
    this.listeners.forEach(callback => callback());
  }
  get dirty() { return this.generation > this.savedGeneration; }

  update(state: State, selectedLanguage: LearningLanguage | null = this.view.progress.selectedLanguage) {
    if (!selectedLanguage || ['error', 'conflict', 'session-changed'].includes(this.view.status)) return;
    this.generation++;
    this.publish({ progress: { ...this.view.progress, state, selectedLanguage }, status: 'saving', error: null });
    void this.flush().catch(() => { /* The observable error keeps work on screen. */ });
  }
  suspend() {
    this.publish({ ...this.view, status: 'session-changed', error: 'Your signed-in account changed. Reload before continuing.' });
  }
  flush(): Promise<void> {
    if (this.running) return this.running;
    if (this.view.status === 'conflict' || this.view.status === 'session-changed') {
      return Promise.reject(new ProgressSyncError(this.view.error || 'Reload saved progress.', this.view.status));
    }
    this.running = this.drain().finally(() => { this.running = null; });
    return this.running;
  }
  private async drain() {
    while (this.dirty) {
      if (this.view.status === 'session-changed') throw new ProgressSyncError(this.view.error!, 'session-changed');
      this.publish({ ...this.view, status: 'saving', error: null });
      this.attempt ??= {
        write: { ...this.view.progress, mutationId: this.newId() },
        generation: this.generation,
      };
      try {
        const saved = await this.send(this.attempt.write);
        this.savedGeneration = this.attempt.generation;
        this.attempt = null;
        if (this.getSnapshot().status === 'session-changed') return;
        // Never replace newer local answers with an older in-flight snapshot.
        this.publish({ ...this.view, progress: { ...this.view.progress, revision: saved.revision }, status: this.dirty ? 'saving' : 'saved', error: null });
      } catch (error) {
        if (this.getSnapshot().status === 'session-changed') return;
        const failure = error instanceof ProgressSyncError ? error : new ProgressSyncError('Your progress was not saved. Check your connection and retry.');
        this.publish({ ...this.view, status: failure.status, error: failure.message });
        throw failure;
      }
    }
  }
}
