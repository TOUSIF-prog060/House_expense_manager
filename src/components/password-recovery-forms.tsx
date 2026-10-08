'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/update-password` });
      if (error) throw error;
      setMessage('If an account exists for that email, a password reset link is on its way.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not request a reset link.'); }
    finally { setBusy(false); }
  }
  return <form className="auth-form" onSubmit={submit}>{message && <div role="status" className="form-error">{message}</div>}<label className="field"><span>Email</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)}/></label><button className="button button-primary button-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button></form>;
}

export function UpdatePasswordForm() {
  const router = useRouter(); const [password, setPassword] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const supabase = createClient(); const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.replace('/home'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update your password.'); }
    finally { setBusy(false); }
  }
  return <form className="auth-form" onSubmit={submit}>{message && <div role="alert" className="form-error">{message}</div>}<label className="field"><span>New password</span><input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)}/></label><button className="button button-primary button-full" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button></form>;
}
