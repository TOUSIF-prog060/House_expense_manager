'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const supabase = createClient();
      if (mode === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Failed to create account.');
        }
        // Immediately sign in with the new/confirmed credentials
        const loginRes = await supabase.auth.signInWithPassword({ email, password });
        if (loginRes.error) throw loginRes.error;
        router.replace('/home'); router.refresh();
        return;
      }

      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      router.replace('/home'); router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not complete authentication.');
    } finally { setBusy(false); }
  }

  return <form className="auth-form" onSubmit={submit}>
    {message && <div role="status" className="form-error">{message}</div>}
    {mode === 'signup' && <label className="field"><span>Your name</span><input required maxLength={80} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)}/></label>}
    <label className="field"><span>Email</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)}/></label>
    <label className="field"><span>Password</span><input required type="password" minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)}/></label>
    <button className="button button-primary button-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
    {mode === 'login' && <p className="auth-switch"><Link href="/forgot-password">Forgot your password?</Link></p>}
    <p className="auth-switch">{mode === 'login' ? <>New to Expense Manager? <Link href="/signup">Create an account</Link></> : <>Already have an account? <Link href="/login">Sign in</Link></>}</p>
  </form>;
}
