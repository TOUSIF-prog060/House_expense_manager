import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HouseholdOnboarding } from '@/components/household-onboarding';
import { getHouseholdForUser } from '@/lib/backend/read-models';

export const metadata: Metadata = { title: 'Set up your household' };

export default async function OnboardingPage() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    redirect('/login');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getHouseholdForUser(user.id);
  if (result.membership && result.household) {
    redirect('/home');
  }

  return (
    <div className="page-wrap onboarding-page">
      <div className="page-heading">
        <span className="eyebrow">FIRST, YOUR HOME</span>
        <h1>Bring your household<br />together.</h1>
        <p>Create a home for everyone—or join with a code.</p>
      </div>
      <HouseholdOnboarding />
    </div>
  );
}
