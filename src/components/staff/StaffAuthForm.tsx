'use client';
import { useState, type FormEvent } from 'react';
export function StaffAuthForm() {
  const [signup, setSignup] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const res = await fetch(signup ? '/api/auth/teacher-signup' : '/api/auth/staff/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Please try again.');
      // Full navigation restores the existing admin context from the new cookie.
      window.location.assign(body.destination);
    } catch (err) { setError(err instanceof Error ? err.message : 'Please try again.'); setBusy(false); }
  }
  const field = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white';
  return <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6"><section className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 shadow-sm text-gray-900 dark:text-white">
    <p className="text-sm font-semibold text-blue-600">FrenchLearno · Staff</p>
    <h1 className="mt-2 text-3xl font-bold">{signup ? 'Become a teacher' : 'Welcome back'}</h1>
    <p className="mt-3 text-sm text-gray-500">{signup ? 'Create your account. An administrator will review your application before you can publish lessons.' : 'Sign in to your admin or teacher workspace.'}</p>
    <div className="my-6 flex gap-2" role="group" aria-label="Staff account options">
      <button type="button" disabled={busy} onClick={() => { setSignup(false); setError(''); }} aria-pressed={!signup} className={`rounded-lg px-3 py-2 ${!signup ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>Sign in</button>
      <button type="button" disabled={busy} onClick={() => { setSignup(true); setError(''); }} aria-pressed={signup} className={`rounded-lg px-3 py-2 ${signup ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>Sign Up as Teacher</button>
    </div>
    <form key={String(signup)} onSubmit={submit} className="space-y-4">
      {signup ? <>
        <label className="block text-sm">Full name<input name="name" autoComplete="name" required maxLength={80} className={field}/></label>
        <label className="block text-sm">Username<input name="username" autoComplete="username" required pattern="[a-zA-Z0-9_]{3,40}" maxLength={40} className={field}/></label>
        <label className="block text-sm">Email<input name="email" type="email" autoComplete="email" required maxLength={254} className={field}/></label>
      </> : <label className="block text-sm">Email or username<input name="identifier" autoComplete="username" required maxLength={254} className={field}/></label>}
      <label className="block text-sm">Password<input name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 10 : 1} maxLength={256} className={field}/></label>
      {signup && <><label className="block text-sm">Expertise<input name="expertise" maxLength={300} placeholder="French A1–B2, conversation…" className={field}/></label>
        <label className="block text-sm">About you<textarea name="bio" maxLength={2000} rows={3} className={field}/></label></>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Please wait…' : signup ? 'Submit teacher application' : 'Sign in'}</button>
    </form>
  </section></main>;
}
