'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
export function RefreshStatus() {
  const router = useRouter(), [busy, start] = useTransition();
  return <button disabled={busy} onClick={() => start(() => router.refresh())} className="mt-6 rounded-lg bg-blue-600 px-5 py-3 text-white">{busy ? 'Checking…' : 'Check approval status'}</button>;
}
