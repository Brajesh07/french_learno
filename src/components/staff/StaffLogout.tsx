'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
export function StaffLogout() {
  const [error, setError] = useState('');
  return <><button className="rounded-lg border px-4 py-2 text-sm" onClick={async () => {
    const { error } = await createClient().auth.signOut({ scope: 'local' });
    if (error) setError('Sign out failed. Please retry.'); else window.location.assign('/login');
  }}>Sign out</button>{error && <p role="alert">{error}</p>}</>;
}
