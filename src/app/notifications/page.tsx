import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bell, Check, ReceiptText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdForUser } from '@/lib/backend/read-models';
import { HouseholdRealtimeListener } from '@/components/household-realtime-listener';

export const metadata: Metadata = { title: 'Activity' };

export default async function NotificationsPage() {
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

  const { data: rows } = await supabase
    .from('activity_events')
    .select('*')
    .eq('household_id', household.id)
    .order('created_at', { ascending: false })
    .limit(60);

  const events = rows ?? [];
  const profileMap = new Map(profiles.map((p) => [p.id, p.display_name]));

  const items = events.map((row) => {
    const meta = (row.metadata as Record<string, unknown>) ?? {};
    const title =
      row.event_type === 'expense.created'
        ? 'Expense added'
        : row.event_type === 'expense.deleted'
        ? 'Expense removed'
        : row.event_type === 'expense.updated'
        ? 'Expense updated'
        : row.event_type === 'cat.fed'
        ? 'Cat feeding recorded'
        : row.event_type === 'payment.recorded'
        ? 'Payment recorded'
        : row.event_type === 'member.joined'
        ? 'New housemate joined'
        : 'Household update';

    const subject =
      typeof meta.title === 'string'
        ? meta.title
        : row.event_type === 'cat.fed'
        ? 'A meal was marked as fed.'
        : row.event_type === 'payment.recorded'
        ? `Payment of ₹${meta.amount ?? ''} was recorded.`
        : row.event_type === 'member.joined'
        ? 'Joined the household.'
        : 'A household record changed.';

    return {
      ...row,
      title,
      body: `${profileMap.get(row.actor) ?? 'A housemate'} · ${subject}`,
    };
  });

  return (
    <div className="page-wrap notifications-page">
      <HouseholdRealtimeListener householdId={household.id} />
      <Link className="back-link" href="/home">
        <ArrowLeft size={16} /> Home
      </Link>
      <div className="page-heading">
        <span className="eyebrow">YOUR HOME, IN THE LOOP</span>
        <h1>Activity</h1>
        <p>Recent shared moments and changes.</p>
      </div>
      {items.length ? (
        <div className="notification-list">
          {items.map((item) => (
            <article className="notification-row" key={item.id}>
              <span className="notification-icon">
                {item.event_type.startsWith('cat') ? <Check size={17} /> : <ReceiptText size={17} />}
              </span>
              <div>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
                <time>{new Date(item.created_at).toLocaleString()}</time>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state notifications-empty">
          <Bell size={24} />
          <h2>You’re all caught up.</h2>
          <p>New household updates will show up here.</p>
        </div>
      )}
    </div>
  );
}
