'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export type TeacherRow = { id: string; name: string; email: string; is_active: boolean; status: string; bio: string | null; expertise: string | null };
export function TeacherTable({ rows }: { rows: TeacherRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null), [message, setMessage] = useState('');
  async function review(row: TeacherRow, decision: 'approved' | 'rejected') {
    setBusy(row.id); setMessage('');
    try {
      const res = await fetch(`/api/admin/teachers/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, expected: row.status }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Review failed.');
      setMessage(`${row.name}: ${decision}.`); router.refresh();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Review failed.'); }
    finally { setBusy(null); }
  }
  return <><p role="status" className="my-4 text-sm">{message}</p><div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700"><table className="w-full text-left text-sm">
    <caption className="sr-only">Teacher applications and approval actions</caption>
    <thead className="bg-gray-50 dark:bg-gray-800"><tr>{['Teacher', 'Application', 'Status', 'Actions'].map(h => <th key={h} scope="col" className="p-4">{h}</th>)}</tr></thead>
    <tbody>{rows.map(row => <tr key={row.id} className="border-t border-gray-200 dark:border-gray-700 align-top">
      <td className="p-4"><strong>{row.name}</strong><p className="mt-1 text-gray-500">{row.email}</p>{!row.is_active && <p className="text-red-600">Account inactive</p>}</td>
      <td className="p-4 max-w-md"><p>{row.expertise || 'No expertise supplied'}</p>{row.bio && <details className="mt-2"><summary className="cursor-pointer text-blue-600">Read application</summary><p className="mt-2 whitespace-pre-wrap">{row.bio}</p></details>}</td>
      <td className="p-4"><span className={`inline-block rounded-full px-3 py-1 font-medium ${row.status === 'approved' ? 'bg-green-100 text-green-800' : row.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{row.status}</span></td>
      <td className="p-4"><div className="flex gap-2"><button disabled={!!busy || !row.is_active || row.status === 'approved' || row.status === 'missing profile'} onClick={() => review(row, 'approved')} className="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:opacity-40">Approve</button><button disabled={!!busy || row.status === 'rejected' || row.status === 'missing profile'} onClick={() => review(row, 'rejected')} className="rounded-lg border border-red-300 px-3 py-2 text-red-600 disabled:opacity-40">Reject</button></div></td>
    </tr>)}{!rows.length && <tr><td colSpan={4} className="p-8 text-center text-gray-500">No teacher applications yet.</td></tr>}</tbody>
  </table></div></>;
}
