'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function HouseholdRealtimeListener({ householdId }: { householdId?: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (!householdId) return;

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const channelName = `household-changes-${householdId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `household_id=eq.${householdId}` },
        () => { router.refresh(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expense_shares' },
        () => { router.refresh(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cat_feedings', filter: `household_id=eq.${householdId}` },
        () => { router.refresh(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `household_id=eq.${householdId}` },
        () => { router.refresh(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_events', filter: `household_id=eq.${householdId}` },
        () => { router.refresh(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => { router.refresh(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, router]);

  return null;
}
