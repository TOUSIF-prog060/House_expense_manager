import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

type HouseholdRow = Database['public']['Tables']['households']['Row'];

export const getHouseholdForUser = cache(async (userId: string) => {
  const supabase = await createClient();

  // One parallel round trip. RLS already limits household_members and
  // profiles to the caller's household, so we fetch them alongside the
  // membership instead of waiting on its household_id; the JS filters below
  // keep the result correct regardless of what RLS returns.
  const [membershipRes, membersRes, profilesRes] = await Promise.all([
    supabase
      .from('household_members')
      .select('*, households(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('household_members')
      .select('*')
      .eq('status', 'active'),
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url, upi_id'),
  ]);

  const membershipRow = membershipRes.data;
  if (!membershipRow) {
    return {
      supabase,
      membership: null,
      household: null,
      profiles: [],
      members: [],
    };
  }

  const { households: household, ...membership } = membershipRow;
  const activeMembers = (membersRes.data ?? []).filter((m) => m.household_id === membership.household_id);
  const memberUserIds = new Set(activeMembers.map((m) => m.user_id));

  return {
    supabase,
    membership,
    household: (household as HouseholdRow | null) ?? null,
    profiles: (profilesRes.data ?? []).filter((p) => memberUserIds.has(p.id)),
    members: activeMembers,
  };
});
