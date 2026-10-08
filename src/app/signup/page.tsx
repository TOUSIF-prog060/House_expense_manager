import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Create account' };

export default async function SignupPage() {
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
          <p>A softer place for<br />the <em>shared stuff.</em></p>
          <span>Fair splits. Fed cats. Fewer reminders.</span>
        </div>
        <span />
      </div>
      <section className="auth-panel">
        <div className="auth-heading">
          <span className="card-eyebrow">MAKE YOURSELF AT HOME</span>
          <h1>Create an account.</h1>
          <p>A household that runs a little more smoothly starts here.</p>
        </div>
        {configured ? (
          <AuthForm mode="signup" />
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
