import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { modelUrl, progressUrl, syncUrl, cleanup } from './compile.mjs';
const { initialState, parseState, recordAnswer, completeSession, isCorrect, streak } = await import(modelUrl);
const { emptyProgress, parseProgressWrite } = await import(progressUrl);
const { ProgressSyncQueue, ProgressSyncError } = await import(syncUrl);
after(cleanup);
const day = new Date(2026, 8, 20, 12);
const fresh = () => structuredClone(initialState);
const selected = () => ({ ...emptyProgress(), selectedLanguage: 'fr-FR', revision: 1 });
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('French normalization preserves accents and accepts apostrophe variants', () => {
  assert.ok(isCorrect("JE M'APPELLE PAUL!", 'Je m’appelle Paul'));
  assert.ok(isCorrect('cafe\u0301', 'café'));
  assert.equal(isCorrect('cafe', 'café'), false);
});
test('mistakes, review intervals and hearts survive JSON/database round trips', () => {
  let state = recordAnswer(fresh(), 'fr-001', false, 10, false, day);
  assert.equal(state.hearts, 4);
  state = parseState(JSON.stringify(state));
  for (const due of ['2026-09-21', '2026-09-23', '2026-09-27', '2026-10-11']) {
    state = recordAnswer(state, 'fr-001', true, 10, true, day);
    assert.equal(state.mistakes[0].due, due);
    assert.equal(state.hearts, 5);
  }
});
test('unlock threshold and one-time completion/daily rewards remain intact', () => {
  assert.deepEqual(completeSession(fresh(), 1, 'lesson', 3, 5, 60, day).completed, []);
  let state = completeSession(fresh(), 1, 'lesson', 5, 5, 60, day);
  state = completeSession(state, 1, 'lesson', 5, 5, 60, day);
  assert.equal(state.xp, 50); assert.equal(state.coins, 10);
  state = completeSession(state, 0, 'daily', 5, 5, 60, day);
  state = completeSession(state, 0, 'daily', 5, 5, 60, day);
  assert.equal(state.xp, 100); assert.equal(state.coins, 20);
  assert.equal(streak(['2026-09-19', '2026-09-20'], day), 2);
});
test('invalid snapshots and client identity fields are rejected', () => {
  const write = { ...selected(), mutationId: crypto.randomUUID() };
  assert.deepEqual(parseProgressWrite(write), write);
  for (const bad of [
    { ...write, user_id: 'another-student' },
    { ...write, revision: -1 },
    { ...write, selectedLanguage: 'de-DE' },
    { ...write, state: { ...fresh(), hearts: 6 } },
    { ...write, state: { ...fresh(), completed: [3] } },
    { ...write, state: { ...fresh(), days: ['2026-02-31'] } },
    { ...write, state: { ...fresh(), profile: { name: {} } } },
    { ...write, state: null },
  ]) assert.throws(() => parseProgressWrite(bad));
});
test('loading initial progress performs no write, and accounts have separate queues', async () => {
  let calls = 0;
  const send = async w => { calls++; return { ...w, revision: w.revision + 1 }; };
  const a = new ProgressSyncQueue(selected(), send);
  const b = new ProgressSyncQueue(selected(), send);
  assert.equal(calls, 0);
  a.update({ ...fresh(), xp: 10 }); await a.flush();
  assert.equal(calls, 1); assert.equal(b.getSnapshot().progress.state.xp, 0);
});
test('rapid answers serialize and never revert newer local progress', async () => {
  const pending = deferred(); const writes = [];
  const queue = new ProgressSyncQueue(selected(), async w => {
    writes.push(w); if (writes.length === 1) await pending.promise;
    return { ...w, revision: w.revision + 1 };
  });
  queue.update({ ...fresh(), xp: 10 });
  queue.update({ ...fresh(), xp: 20 });
  assert.equal(writes.length, 1);
  pending.resolve(); await queue.flush();
  assert.deepEqual(writes.map(w => [w.state.xp, w.revision]), [[10, 1], [20, 2]]);
  assert.equal(queue.getSnapshot().progress.state.xp, 20);
  assert.equal(queue.getSnapshot().status, 'saved');
});
test('a lost response retries the same mutation before newer queued work', async () => {
  const pending = deferred(); const writes = []; let fail = true;
  const queue = new ProgressSyncQueue(selected(), async w => {
    writes.push(w);
    if (fail) { await pending.promise; fail = false; throw new Error('connection lost'); }
    return { ...w, revision: w.revision + 1 };
  });
  queue.update({ ...fresh(), xp: 10 }); queue.update({ ...fresh(), xp: 20 });
  pending.resolve(); await tick(); await tick();
  assert.equal(queue.getSnapshot().status, 'error');
  assert.equal(queue.getSnapshot().progress.state.xp, 20);
  await queue.flush();
  assert.equal(writes[0].mutationId, writes[1].mutationId);
  assert.notEqual(writes[1].mutationId, writes[2].mutationId);
  assert.deepEqual(writes.map(w => w.revision), [1, 1, 2]);
  assert.equal(queue.getSnapshot().status, 'saved');
});
test('revision conflict pauses saves and cannot silently overwrite another device', async () => {
  let calls = 0;
  const queue = new ProgressSyncQueue(selected(), async () => {
    calls++; throw new ProgressSyncError('Another device saved progress.', 'conflict');
  });
  queue.update({ ...fresh(), xp: 10 }); await tick();
  await assert.rejects(queue.flush());
  queue.update({ ...fresh(), xp: 20 });
  assert.equal(calls, 1); assert.equal(queue.getSnapshot().status, 'conflict');
  assert.equal(queue.getSnapshot().progress.state.xp, 10);
});
test('account changes stop queued writes even when a request is in flight', async () => {
  const pending = deferred(); let calls = 0;
  const queue = new ProgressSyncQueue(selected(), async w => {
    calls++; await pending.promise; return { ...w, revision: w.revision + 1 };
  });
  queue.update({ ...fresh(), xp: 10 }); queue.update({ ...fresh(), xp: 20 });
  queue.suspend(); pending.resolve(); await tick(); await tick();
  assert.equal(queue.getSnapshot().status, 'session-changed');
  assert.equal(calls, 1); await assert.rejects(queue.flush());
});
