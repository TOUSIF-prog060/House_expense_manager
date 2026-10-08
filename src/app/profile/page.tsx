import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell, ChevronRight, Download, House, Settings, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdForUser } from '@/lib/backend/read-models';
import { SignOutButton } from '@/components/sign-out-button';

export const metadata: Metadata = { title: 'Profile' };

export default async function ProfilePage() {
  let auth;
  try {
    auth = await createClient();
  } catch {
    redirect('/login');
  }
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/login');

  const { supabase, membership, household, profiles } = await getHouseholdForUser(user.id);

  let profileName = profiles.find((p) => p.id === user.id)?.display_name;
  if (!profileName) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();
    profileName = profile?.display_name;
  }

  const name = profileName || user.email?.split('@')[0] || 'Expense Manager member';
  const role = membership?.role ?? 'member';

  return (
    <div className="page-wrap profile-page">
      <div className="page-heading">
        <span className="eyebrow">A LITTLE ABOUT YOU</span>
        <h1>Profile</h1>
        <p>Your household, just the way you like it.</p>
      </div>

      <section className="profile-card">
        <span className="profile-avatar">{name.charAt(0).toUpperCase()}</span>
        <div>
          <h2>{name}</h2>
          <p>{user.email}</p>
        </div>
        <span className="profile-member-label">{role === 'admin' ? 'ADMIN' : 'MEMBER'}</span>
      </section>

      <section className="profile-section">
        <span className="side-eyebrow">YOUR HOME</span>
        {household ? (
          <div className="profile-household">
            <span className="profile-item-icon">
              <House size={18} />
            </span>
            <span>
              <b>{household.name}</b>
              <small>Your shared household</small>
            </span>
            <Link href="/settings/household" aria-label="Household settings">
              <ChevronRight size={17} />
            </Link>
          </div>
        ) : (
          <Link className="profile-household" href="/onboarding">
            <span className="profile-item-icon">
              <House size={18} />
            </span>
            <span>
              <b>Set up household</b>
              <small>Create one or join with a code</small>
            </span>
            <ChevronRight size={17} />
          </Link>
        )}
      </section>

      <section className="profile-section">
        <span className="side-eyebrow">APP & PREFERENCES</span>
        <Link className="profile-item" href="/settings/notifications">
          <span className="profile-item-icon">
            <Bell size={18} />
          </span>
          <span>
            <b>Notifications</b>
            <small>Choose what you hear about</small>
          </span>
          <ChevronRight size={17} />
        </Link>
        <Link className="profile-item" href="/install">
          <span className="profile-item-icon">
            <Download size={18} />
          </span>
          <span>
            <b>Install Expense Manager</b>
            <small>Take home along with you</small>
          </span>
          <ChevronRight size={17} />
        </Link>
        <Link className="profile-item" href="/settings/household">
          <span className="profile-item-icon">
            <Settings size={18} />
          </span>
          <span>
            <b>Household settings</b>
            <small>Members, invites and meal times</small>
          </span>
          <ChevronRight size={17} />
        </Link>
      </section>

      <section className="profile-security">
        <ShieldCheck size={17} />
        <span>Authenticated session protected by Supabase Auth and Row Level Security.</span>
      </section>

      <div style={{ marginTop: '20px' }}>
        <SignOutButton />
      </div>
    </div>
  );
}
