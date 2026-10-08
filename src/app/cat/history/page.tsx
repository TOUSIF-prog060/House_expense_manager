import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock3, PawPrint } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdForUser } from '@/lib/backend/read-models';
import { HouseholdRealtimeListener } from '@/components/household-realtime-listener';

export const metadata: Metadata = { title: 'Feeding history' };

export default async function CatHistoryPage() {
  let auth;
  try {
    auth = await createClient();
  } catch {
    redirect('/login');
  }
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/login');

  const householdData = await getHouseholdForUser(user.id);
  const { supabase, household, profiles } = householdData;
  if (!household) redirect('/onboarding');

  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [feedingsRes, slotsRes, petsRes] = await Promise.all([
    supabase
      .from('cat_feedings')
      .select('*')
      .eq('household_id', household.id)
      .gte('feeding_date', since)
      .order('feeding_date', { ascending: false })
      .order('fed_at', { ascending: false }),
    supabase
      .from('meal_slots')
      .select('*')
      .eq('household_id', household.id),
    supabase
      .from('pets')
      .select('*')
      .eq('household_id', household.id),
  ]);

  const history = feedingsRes.data ?? [];
  const slots = slotsRes.data ?? [];
  const pets = petsRes.data ?? [];

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile.display_name]));
  const slotMap = new Map(slots.map((slot) => [slot.id, slot.name]));
  const petMap = new Map(pets.map((pet) => [pet.id, pet.name]));

  const groups = new Map<string, typeof history>();
  for (const row of history) {
    groups.set(row.feeding_date, [...(groups.get(row.feeding_date) ?? []), row]);
  }

  return (
    <div className="page-wrap cat-history-page">
      <HouseholdRealtimeListener householdId={household.id} />
      <Link className="back-link" href="/cat">
        <ArrowLeft size={16} /> Cat care
      </Link>
      <div className="page-heading">
        <span className="eyebrow">THE LAST 30 DAYS</span>
        <h1>Feeding history</h1>
        <p>Recent meals, so everyone can double-check.</p>
      </div>

      {groups.size ? (
        Array.from(groups.entries()).map(([date, items]) => (
          <section className="history-date-group" key={date}>
            <div className="history-group-header">
              <h2>
                {new Date(`${date}T12:00:00`).toLocaleDateString('en', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h2>
              <Link href={`/cat?date=${date}`} className="text-link history-day-link">
                View day schedule →
              </Link>
            </div>
            {items.map((meal) => {
              const petLabel = meal.pet_id ? petMap.get(meal.pet_id) : null;
              const slotLabel = meal.feeding_type === 'extra'
                ? 'Extra feeding'
                : slotMap.get(meal.meal_slot_id ?? '') ?? 'Meal';
              return (
                <article className="history-row" key={meal.id}>
                  <span className="history-paw">
                    <PawPrint size={15} />
                  </span>
                  <span className="recent-main">
                    <strong>
                      {slotLabel}
                      {petLabel && <span className="history-pet-badge"> · {petLabel}</span>}
                    </strong>
                    <span>
                      {profileMap.get(meal.fed_by) ?? 'A member'}
                      {meal.note ? ` · ${meal.note}` : ''}
                    </span>
                  </span>
                  <span className="history-time">
                    <Clock3 size={13} />
                    {new Date(meal.fed_at).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZone: household.timezone,
                    })}
                  </span>
                </article>
              );
            })}
          </section>
        ))
      ) : (
        <div className="empty-state">
          <PawPrint size={24} />
          <p>No feeding history yet.</p>
        </div>
      )}
    </div>
  );
}
