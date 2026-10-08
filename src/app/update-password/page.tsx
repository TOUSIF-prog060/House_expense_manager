import type { Metadata } from 'next';
import Link from 'next/link';
import { UpdatePasswordForm } from '@/components/password-recovery-forms';

export const metadata: Metadata = { title: 'Choose a new password' };

export default function UpdatePasswordPage() {
  return <main className="auth-page"><div className="auth-aside"><Link className="brand" href="/"><span className="brand-mark">⌂</span> Expense Manager<span className="brand-dot">.</span></Link><div className="auth-aside-content"><p>A softer place for<br/>the <em>shared stuff.</em></p><span>Fair splits. Fed cats. Fewer reminders.</span></div><span /></div><section className="auth-panel"><div className="auth-heading"><span className="card-eyebrow">ACCOUNT RECOVERY</span><h1>Choose a new password.</h1><p>Use at least 8 characters.</p></div><UpdatePasswordForm/></section></main>;
}
