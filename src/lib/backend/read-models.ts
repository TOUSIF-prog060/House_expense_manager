import { createClient } from '@/lib/supabase/server';

export async function getHouseholdForUser(userId: string) {
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from('household_members')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    return {
      supabase,
      membership: null,
      household: null,
      profiles: [],
      members: [],
    };
  }

  const [householdRes, membersRes] = await Promise.all([
    supabase
      .from('households')
      .select('*')
      .eq('id', membership.household_id)
      .maybeSingle(),
    supabase
      .from('household_members')
      .select('*')
      .eq('household_id', membership.household_id)
      .eq('status', 'active'),
  ]);

  const household = householdRes.data ?? null;
  const activeMembers = membersRes.data ?? [];
  const memberUserIds = activeMembers.map((m) => m.user_id);

  const { data: profiles } = memberUserIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', memberUserIds)
    : { data: [] };

  return {
    supabase,
    membership,
    household,
    profiles: profiles ?? [],
    members: activeMembers,
  };
}
