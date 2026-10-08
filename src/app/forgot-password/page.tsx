import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/password-recovery-forms';

export const metadata: Metadata = { title: 'Reset password' };

export default function ForgotPasswordPage() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
  return <main className="auth-page"><div className="auth-aside"><Link className="brand" href="/"><span className="brand-mark">⌂</span> Expense Manager<span className="brand-dot">.</span></Link><div className="auth-aside-content"><p>Home feels better<br/>when it’s <em>in sync.</em></p><span>Everything shared, a little more simply.</span></div><span /></div><section className="auth-panel"><div className="auth-heading"><span className="card-eyebrow">ACCOUNT RECOVERY</span><h1>Reset your password.</h1><p>We’ll email you a secure link to choose a new one.</p></div>{configured ? <ForgotPasswordForm/> : <div className="setup-notice"><strong>Connect your Supabase project</strong><p>Add your Supabase URL and publishable key to <code>.env.local</code>.</p></div>}<p className="auth-switch"><Link href="/login">Back to sign in</Link></p></section></main>;
}
