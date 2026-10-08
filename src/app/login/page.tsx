import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
  if (configured) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect('/home');
  }
  return (
    <main className="auth-page">
      <div className="auth-aside">
        <Link className="brand" href="/">
          <span className="brand-mark">⌂</span> Expense Manager<span className="brand-dot">.</span>
        </Link>
        <div className="auth-aside-content">
          <p>Home feels better<br />when it’s <em>in sync.</em></p>
          <span>Everything shared, a little more simply.</span>
        </div>
        <span />
      </div>
      <section className="auth-panel">
        <div className="auth-heading">
          <span className="card-eyebrow">WELCOME BACK</span>
          <h1>Good to see you.</h1>
          <p>Sign in to pick up where home left off.</p>
        </div>
        {configured ? (
          <AuthForm mode="login" />
        ) : (
          <div className="setup-notice">
            <strong>Connect your Supabase project</strong>
            <p>Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code>, then restart the app.</p>
          </div>
        )}
        <p className="auth-privacy">Your household stays private. Always.</p>
      </section>
    </main>
  );
}
