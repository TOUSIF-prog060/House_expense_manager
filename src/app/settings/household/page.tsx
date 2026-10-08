import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdForUser } from '@/lib/backend/read-models';
import { HouseholdSettingsForm } from '@/components/household-settings-form';
import { HouseholdRealtimeListener } from '@/components/household-realtime-listener';

export const metadata: Metadata = { title: 'Household settings' };

export default async function HouseholdSettingsPage() {
  let auth;
  try {
    auth = await createClient();
  } catch {
    redirect('/login');
  }
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/login');

  const householdData = await getHouseholdForUser(user.id);
  const { supabase, membership, household, members, profiles } = householdData;
  if (!membership || !household) redirect('/onboarding');

  const { data: mealSlotsData } = await supabase
    .from('meal_slots')
    .select('*')
    .eq('household_id', household.id)
    .order('display_order', { ascending: true });

  const slots = (mealSlotsData ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    display_order: Number(row.display_order),
    reminder_enabled: Boolean(row.reminder_enabled),
    reminder_time: row.reminder_time ?? null,
  }));

  const profileMap = new Map(profiles.map((p) => [p.id, p.display_name]));
  const memberCards = members.map((row) => ({
    user_id: row.user_id,
    role: row.role,
    profiles: {
      display_name: profileMap.get(row.user_id) ?? 'Housemate',
    },
  }));

  return (
    <div className="page-wrap settings-page">
      <HouseholdRealtimeListener householdId={household.id} />
      <Link className="back-link" href="/profile">
        <ArrowLeft size={16} /> Profile
      </Link>
      <div className="page-heading">
        <span className="eyebrow">A GOOD HOME, TOGETHER</span>
        <h1>Household settings</h1>
        <p>Manage the small details everyone shares.</p>
      </div>
      <HouseholdSettingsForm
        householdId={household.id}
        initialName={household.name}
        members={memberCards}
        mealSlots={slots}
        isAdmin={membership.role === 'admin'}
        currentUserId={user.id}
      />
    </div>
  );
}
