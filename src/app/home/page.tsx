import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CalendarDays, Cat, Check, Plus, ReceiptText, Sparkles } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatRupees } from '@/lib/calculations/money';
import { getHouseholdForUser } from '@/lib/backend/read-models';
import { dateKeyInTimezone, hourInTimezone, monthStartInTimezone } from '@/lib/dates';
import { HouseholdRealtimeListener } from '@/components/household-realtime-listener';

export const metadata: Metadata = { title: 'Home' };

const icons: Record<string, string> = {
  Groceries: '🛒',
  Electricity: '⚡',
  Rent: '⌂',
  'Cat Food': '🐾',
  Maid: '✳',
};

export default async function HomePage() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    redirect('/login');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const householdData = await getHouseholdForUser(user.id);
  const { household, profiles, members } = householdData;

  if (!household) {
    return (
      <div className="page-wrap">
        <div className="page-heading">
          <span className="eyebrow">WELCOME HOME</span>
          <h1>Let’s get everyone<br />under one roof.</h1>
          <p>Create a home or join one with an invite code.</p>
        </div>
        <Link className="button button-primary" href="/onboarding">
          Set up your household <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const now = new Date();
  const monthStart = monthStartInTimezone(now, household.timezone);
  const today = dateKeyInTimezone(now, household.timezone);

  const [mealSlotsRes, feedingsRes, recentExpensesRes, monthExpensesRes, monthSharesRes, petsRes] = await Promise.all([
    supabase
      .from('meal_slots')
      .select('*')
      .eq('household_id', household.id)
      .order('display_order', { ascending: true }),
    supabase
      .from('cat_feedings')
      .select('*')
      .eq('household_id', household.id)
      .eq('feeding_date', today)
      .eq('feeding_type', 'scheduled'),
    supabase
      .from('expenses')
      .select('*, expense_categories(name)')
      .eq('household_id', household.id)
      .order('expense_date', { ascending: false })
      .limit(4),
    supabase
      .from('expenses')
      .select('amount, paid_by')
      .eq('household_id', household.id)
      .gte('expense_date', monthStart),
    supabase
      .from('expense_shares')
      .select('share_amount, expense_id, expenses!inner(household_id, expense_date)')
      .eq('user_id', user.id)
      .eq('expenses.household_id', household.id)
      .gte('expenses.expense_date', monthStart),
    supabase
      .from('pets')
      .select('*')
      .eq('household_id', household.id)
      .order('created_at', { ascending: true }),
  ]);

  const slots = mealSlotsRes.data ?? [];
  const feedings = feedingsRes.data ?? [];
  const recentExpenses = recentExpensesRes.data ?? [];
  const monthExpenses = monthExpensesRes.data ?? [];
  const monthShares = monthSharesRes.data ?? [];
  const pets = petsRes.data ?? [];

  const getFeeding = (slotId: string, petId?: string) => {
    if (petId) {
      return feedings.find((row) => row.meal_slot_id === slotId && row.pet_id === petId);
    }
    return feedings.find((row) => row.meal_slot_id === slotId);
  };
  const currentProfile = profiles.find((p) => p.id === user.id);
  const name = currentProfile?.display_name?.split(' ')[0] || user.email?.split('@')[0] || 'there';

  const localHour = hourInTimezone(now, household.timezone);
  const greeting = localHour < 12 ? 'Good morning' : localHour < 17 ? 'Good afternoon' : 'Good evening';

  const totalPaise = monthExpenses.reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0);
  const paidPaise = monthExpenses
    .filter((row) => row.paid_by === user.id)
    .reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0);
  const sharePaise = monthShares.reduce((sum, row) => sum + Math.round(Number(row.share_amount) * 100), 0);
  const position = paidPaise - sharePaise;

  const profileMap = new Map(profiles.map((p) => [p.id, p.display_name]));

  const latest = recentExpenses.map((expense) => {
    const categoryName = (expense.expense_categories as { name?: string } | null)?.name ?? 'Other';
    const payerName = (expense.paid_by ? profileMap.get(expense.paid_by) : null) ?? 'A member';
    return {
      id: expense.id,
      title: expense.title,
      amount: Math.round(Number(expense.amount) * 100),
      date: expense.expense_date,
      category: categoryName,
      payer: payerName,
    };
  });

  const memberNames = members
    .map((member) => profiles.find((p) => p.id === member.user_id)?.display_name ?? 'Housemate')
    .filter(Boolean);

  return (
    <>
      <HouseholdRealtimeListener householdId={household.id} />
      <div className="page-wrap dashboard-page">
        <div className="dashboard-greeting">
          <div>
            <span className="eyebrow">
              {household.name.toUpperCase()} <i>·</i> {now.toLocaleDateString('en', { month: 'long', year: 'numeric' }).toUpperCase()}
            </span>
            <h1>
              {greeting}, {name}
              <span className="greeting-dot">.</span>
            </h1>
            <p>A little update on things at home.</p>
          </div>
          <span className="date-pill">
            <CalendarDays size={15} />
            {now.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>

        <div className="dashboard-grid">
          <section className="hero-card">
            <div className="hero-card-top">
              <span className="hero-label">
                <Sparkles size={14} /> THIS MONTH
              </span>
              <span className="hero-caption">Shared at home</span>
            </div>
            <strong className="hero-total">{formatRupees(totalPaise)}</strong>
            <div className="hero-divider" />
            <div className="hero-bottom">
              <div>
                <span>Your share</span>
                <strong>{formatRupees(sharePaise)}</strong>
              </div>
              <div className="hero-position">
                <span>Your position</span>
                <strong className={position >= 0 ? 'positive' : 'negative'}>
                  {position >= 0 ? '+' : ''}
                  {formatRupees(position)}
                  <small>{position >= 0 ? ' to receive' : ' you owe'}</small>
                </strong>
              </div>
            </div>
            <div className="hero-sparkle sparkle-one">✳</div>
            <div className="hero-sparkle sparkle-two">✳</div>
          </section>

          <section className="panel-card cat-today-card">
            <div className="section-heading">
              <div className="section-icon cat-icon">
                <Cat size={17} />
              </div>
              <div>
                <h2>Cat, today</h2>
                <p>All meals in the know.</p>
              </div>
              <Link href="/cat" className="text-link">
                See all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="today-meals">
              {slots.map((slot) => {
                if (pets.length > 0) {
                  const fedPets = pets.filter((pet) => Boolean(getFeeding(slot.id, pet.id)));
                  const allFed = fedPets.length === pets.length;
                  const someFed = fedPets.length > 0;
                  return (
                    <div className="today-meal" key={slot.id}>
                      <div className={`meal-dot ${allFed ? 'complete' : someFed ? 'partial' : ''}`}>
                        {allFed ? <Check size={13} /> : <span />}
                      </div>
                      <div className="today-meal-main">
                        <strong>{slot.name}</strong>
                        {allFed ? (
                          <span>All {pets.length} cats fed</span>
                        ) : someFed ? (
                          <span>
                            {fedPets.map((p) => p.name).join(', ')} fed ·{' '}
                            {pets.filter((p) => !fedPets.includes(p)).map((p) => p.name).join(', ')} waiting
                          </span>
                        ) : (
                          <span>Still waiting ({pets.length} cats)</span>
                        )}
                      </div>
                      <span className={`meal-status ${allFed ? 'fed' : someFed ? 'pending' : 'pending'}`}>
                        {allFed ? 'ALL FED' : `${fedPets.length}/${pets.length} FED`}
                      </span>
                    </div>
                  );
                }

                const feeding = getFeeding(slot.id);
                const fedPersonName = feeding?.fed_by ? (profileMap.get(feeding.fed_by) ?? 'A member') : 'A member';
                return (
                  <div className="today-meal" key={slot.id}>
                    <div className={`meal-dot ${feeding ? 'complete' : ''}`}>
                      {feeding ? <Check size={13} /> : <span />}
                    </div>
                    <div className="today-meal-main">
                      <strong>{slot.name}</strong>
                      {feeding ? (
                        <span>
                          {new Date(feeding.fed_at).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                            timeZone: household.timezone,
                          })}{' '}
                          · {fedPersonName}
                        </span>
                      ) : (
                        <span>Still waiting</span>
                      )}
                    </div>
                    <span className={`meal-status ${feeding ? 'fed' : 'pending'}`}>
                      {feeding ? 'FED' : 'PENDING'}
                    </span>
                  </div>
                );
              })}
              {!slots.length && <p className="muted-copy">No meal times set up yet.</p>}
            </div>
            <Link className="cat-card-footer" href="/cat">
              Open cat care <ArrowRight size={15} />
            </Link>
          </section>

          <section className="panel-card expenses-card">
            <div className="section-heading">
              <div className="section-icon expense-icon">
                <ReceiptText size={17} />
              </div>
              <div>
                <h2>Recent expenses</h2>
                <p>Shared things, handled.</p>
              </div>
              <Link href="/expenses" className="text-link">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {latest.length ? (
              <div className="recent-list">
                {latest.map((expense) => (
                  <Link href={`/expenses/${expense.id}`} className="recent-row" key={expense.id}>
                    <span className="expense-emoji">{icons[expense.category] ?? '✳'}</span>
                    <span className="recent-main">
                      <strong>{expense.title}</strong>
                      <span>
                        {expense.payer} <i>·</i>{' '}
                        {new Date(`${expense.date}T12:00:00`).toLocaleDateString('en', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </span>
                    <span className="recent-amount">
                      {formatRupees(expense.amount)}
                      <ArrowUpRight size={13} />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <ReceiptText size={22} />
                <p>No expenses yet. Add your first shared expense.</p>
                <Link className="button button-primary button-small" href="/expenses/new">
                  Add expense <ArrowRight size={14} />
                </Link>
              </div>
            )}
            <Link className="expenses-footer" href="/expenses/new">
              <Plus size={15} /> Add an expense
            </Link>
          </section>

          <aside className="dashboard-side">
            <section className="position-card">
              <span className="side-eyebrow">YOUR SHARE THIS MONTH</span>
              <strong>{formatRupees(sharePaise)}</strong>
              <div className="side-card-rule" />
              <div className="mini-stat">
                <span>You’ve paid</span>
                <b>{formatRupees(paidPaise)}</b>
              </div>
              <div className="mini-stat">
                <span>Household total</span>
                <b>{formatRupees(totalPaise)}</b>
              </div>
              <Link href="/settlement" className="side-card-link">
                View settlement <ArrowRight size={15} />
              </Link>
            </section>

            <section className="quick-actions-card">
              <span className="side-eyebrow">A QUICK HAND</span>
              <Link href="/expenses/new" className="quick-action">
                <span className="quick-action-icon add-icon">
                  <Plus size={17} />
                </span>
                <span>
                  <b>Add an expense</b>
                  <small>Split something shared</small>
                </span>
                <ArrowRight size={15} />
              </Link>
              <Link href="/cat" className="quick-action">
                <span className="quick-action-icon paw-icon">
                  <Cat size={17} />
                </span>
                <span>
                  <b>Check on the cat</b>
                  <small>See meals for today</small>
                </span>
                <ArrowRight size={15} />
              </Link>
              <Link href="/settlement" className="quick-action">
                <span className="quick-action-icon settle-icon">
                  <ArrowUpRight size={17} />
                </span>
                <span>
                  <b>Settle up</b>
                  <small>Make balances even</small>
                </span>
                <ArrowRight size={15} />
              </Link>
            </section>

            <section className="household-note">
              <span className="note-spark">✳</span>
              <span className="side-eyebrow">UNDER ONE ROOF</span>
              <div className="member-stack">
                {memberNames.slice(0, 4).map((personName, index) => (
                  <span className={`stack-avatar stack-${index}`} key={`${personName}-${index}`}>
                    {personName.charAt(0).toUpperCase()}
                  </span>
                ))}
              </div>
              <p>
                Here together<span> counts for a lot.</span>
              </p>
              <small>
                {memberNames.length} {memberNames.length === 1 ? 'member' : 'members'} making it home.
              </small>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
