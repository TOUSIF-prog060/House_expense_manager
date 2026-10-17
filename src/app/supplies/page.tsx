import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdForUser } from '@/lib/backend/read-models';
import { HouseholdRealtimeListener } from '@/components/household-realtime-listener';
import { SuppliesBoard, type SupplyItem } from '@/components/supplies-board';

export const metadata: Metadata = {
  title: 'Supplies Board',
  description: 'Shared household groceries and supplies checklist',
};

export default async function SuppliesPage() {
  let auth;
  try {
    auth = await createClient();
  } catch {
    redirect('/login');
  }

  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/login');

  const householdData = await getHouseholdForUser(user.id);
  const { household, profiles } = householdData;
  if (!household) redirect('/onboarding');

  // Query supplies from database
  const { data: supplyRows } = await auth
    .from('supplies')
    .select('*')
    .eq('household_id', household.id)
    .order('is_purchased', { ascending: true })
    .order('created_at', { ascending: false });

  const initialSupplies: SupplyItem[] = (supplyRows ?? []).map((row) => ({
    id: row.id,
    household_id: row.household_id,
    name: row.name,
    quantity: row.quantity,
    category: row.category,
    notes: row.notes,
    is_purchased: Boolean(row.is_purchased),
    added_by: row.added_by,
    purchased_by: row.purchased_by,
    purchased_at: row.purchased_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  const mappedProfiles = profiles.map((p) => ({
    id: p.id,
    display_name: p.display_name,
  }));

  return (
    <>
      <HouseholdRealtimeListener householdId={household.id} />
      <SuppliesBoard
        householdId={household.id}
        initialSupplies={initialSupplies}
        currentUserId={user.id}
        profiles={mappedProfiles}
      />
    </>
  );
}
