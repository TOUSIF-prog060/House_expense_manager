import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Cat, Clock3, History, PawPrint } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdForUser } from '@/lib/backend/read-models';
import { dateKeyInTimezone } from '@/lib/dates';
import { FeedButton } from '@/components/feed-button';
import { ExtraFeedingButton } from '@/components/extra-feeding-button';
import { PetManager } from '@/components/pet-manager';
import { DateNavigator } from '@/components/date-navigator';
import { HouseholdRealtimeListener } from '@/components/household-realtime-listener';

export const metadata: Metadata = { title: 'Cat care' };

export default async function CatPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: paramDate } = await searchParams;

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

  const todayKey = dateKeyInTimezone(new Date(), household.timezone);
  const selectedDay = paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) ? paramDate : todayKey;
  const isToday = selectedDay === todayKey;

  const [slotsRes, feedingsRes, historyRes, petsRes] = await Promise.all([
    supabase
      .from('meal_slots')
      .select('*')
      .eq('household_id', household.id)
      .order('display_order', { ascending: true }),
    supabase
      .from('cat_feedings')
      .select('*')
      .eq('household_id', household.id)
      .eq('feeding_date', selectedDay)
      .eq('feeding_type', 'scheduled'),
    supabase
      .from('cat_feedings')
      .select('*')
      .eq('household_id', household.id)
      .order('fed_at', { ascending: false })
      .limit(10),
    supabase
      .from('pets')
      .select('*')
      .eq('household_id', household.id)
      .order('created_at', { ascending: true }),
  ]);

  const slots = slotsRes.data ?? [];
  const feedings = feedingsRes.data ?? [];
  const history = historyRes.data ?? [];
  const pets = petsRes.data ?? [];

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile.display_name]));
  const slotMap = new Map(slots.map((slot) => [slot.id, slot.name]));
  const petMap = new Map(pets.map((pet) => [pet.id, pet.name]));

  const getFeeding = (slotId: string, petId?: string) => {
    if (petId) {
      return feedings.find((row) => row.meal_slot_id === slotId && row.pet_id === petId);
    }
    return feedings.find((row) => row.meal_slot_id === slotId);
  };

  const totalExpectedMeals = pets.length > 0 ? slots.length * pets.length : slots.length;

  return (
    <div className="page-wrap cat-page">
      <HouseholdRealtimeListener householdId={household.id} />
      <div className="cat-page-heading">
        <span className="cat-heading-icon"><Cat size={22} /></span>
        <span className="eyebrow">{household.name.toUpperCase()} <i>·</i> DAILY CARE</span>
        <h1>Cat care</h1>
        <p>A little check-in keeps everyone in the know.</p>
      </div>

      <section className="cat-today-panel">
        <div className="cat-date-heading">
          <div>
            <span className="eyebrow">{isToday ? 'TODAY' : 'DATE ARCHIVE'}</span>
            <h2>
              {new Date(`${selectedDay}T12:00:00`).toLocaleDateString('en', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h2>
          </div>
          <span className="day-progress">
            {feedings.length} of {totalExpectedMeals} meals done
          </span>
        </div>

        <DateNavigator currentDate={selectedDay} todayDate={todayKey} baseUrl="/cat" />

        <div className="cat-slot-list">
          {slots.map((slot, index) => {
            if (pets.length > 0) {
              const allSlotFed = pets.every((pet) => Boolean(getFeeding(slot.id, pet.id)));
              const slotFedCount = pets.filter((pet) => Boolean(getFeeding(slot.id, pet.id))).length;

              return (
                <article
                  className={`cat-slot-card cat-multi-slot ${allSlotFed ? 'slot-complete' : ''}`}
                  key={slot.id}
                >
                  <div className="slot-header-bar">
                    <div className="slot-header-left">
                      <div className={`slot-number ${allSlotFed ? 'done' : ''}`}>
                        {allSlotFed ? <span>✓</span> : `0${index + 1}`}
                      </div>
                      <div>
                        <h3>{slot.name}</h3>
                        <small className="slot-subheading">
                          {slotFedCount} of {pets.length} cats fed
                        </small>
                      </div>
                    </div>
                    {allSlotFed ? (
                      <span className="meal-status fed">ALL FED</span>
                    ) : (
                      <span className="meal-status pending">PENDING</span>
                    )}
                  </div>

                  <div className="slot-pets-list">
                    {pets.map((pet) => {
                      const feeding = getFeeding(slot.id, pet.id);
                      return (
                        <div
                          className={`pet-meal-row ${feeding ? 'row-fed' : 'row-pending'}`}
                          key={`${slot.id}-${pet.id}`}
                        >
                          <div className="pet-meal-info">
                            <span className="pet-avatar-icon">🐾</span>
                            <div>
                              <strong>{pet.name}</strong>
                              {feeding ? (
                                <p>
                                  Fed{' '}
                                  {new Date(feeding.fed_at).toLocaleTimeString([], {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    timeZone: household.timezone,
                                  })}
                                  <span> · by {profileMap.get(feeding.fed_by) ?? 'a member'}</span>
                                </p>
                              ) : (
                                <p className="not-fed-copy">Not fed yet</p>
                              )}
                            </div>
                          </div>
                          <div className="pet-meal-action">
                            <FeedButton
                              householdId={household.id}
                              slotId={slot.id}
                              slotName={slot.name}
                              feedingDate={selectedDay}
                              petId={pet.id}
                              petName={pet.name}
                              alreadyFed={Boolean(feeding)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            }

            // Single cat / legacy mode when no pets are named yet
            const feeding = getFeeding(slot.id);
            return (
              <article className={`cat-slot-card ${feeding ? 'slot-complete' : ''}`} key={slot.id}>
                <div className={`slot-number ${feeding ? 'done' : ''}`}>
                  {feeding ? <span>✓</span> : `0${index + 1}`}
                </div>
                <div className="slot-details">
                  <h3>{slot.name}</h3>
                  {feeding ? (
                    <p>
                      Fed{' '}
                      {new Date(feeding.fed_at).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZone: household.timezone,
                      })}
                      <span> · by {profileMap.get(feeding.fed_by) ?? 'a member'}</span>
                    </p>
                  ) : (
                    <p>Not fed yet <span>· let the household know</span></p>
                  )}
                </div>
                <div className="slot-action">
                  <FeedButton
                    householdId={household.id}
                    slotId={slot.id}
                    slotName={slot.name}
                    feedingDate={selectedDay}
                    alreadyFed={Boolean(feeding)}
                  />
                </div>
              </article>
            );
          })}

          {!slots.length && (
            <div className="empty-state">
              <PawPrint size={24} />
              <p>No meal slots are set up yet. Ask a household admin to add feeding times.</p>
            </div>
          )}
        </div>

        {/* Pet Manager directly below the morning, afternoon, evening meal slots */}
        <PetManager householdId={household.id} initialPets={pets} />

        <div className="cat-extra-note">
          <PawPrint size={16} />
          <span>Extra bites happen.</span>
          <ExtraFeedingButton householdId={household.id} />
        </div>
      </section>

      <section className="cat-history-section">
        <div className="section-heading">
          <div className="section-icon cat-icon"><History size={17} /></div>
          <div>
            <h2>Recent feedings</h2>
            <p>A little history for peace of mind.</p>
          </div>
          <Link href="/cat/history" className="text-link">Full history <span>→</span></Link>
        </div>
        {history.length ? (
          <div className="recent-feedings">
            {history.map((meal) => {
              const catLabel = meal.pet_id ? petMap.get(meal.pet_id) : null;
              const slotTitle = meal.feeding_type === 'extra'
                ? 'Extra feeding'
                : slotMap.get(meal.meal_slot_id ?? '') ?? 'Meal';

              return (
                <div className="history-row" key={meal.id}>
                  <span className="history-paw"><PawPrint size={15} /></span>
                  <span className="recent-main">
                    <strong>
                      {slotTitle}
                      {catLabel && <span className="history-pet-badge"> · {catLabel}</span>}
                    </strong>
                    <span>
                      {new Date(`${meal.feeding_date}T12:00:00`).toLocaleDateString('en', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      <i>·</i> {profileMap.get(meal.fed_by) ?? 'A member'}
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
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <PawPrint size={23} />
            <p>No feeding history yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
