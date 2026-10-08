import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, CalendarDays, ExternalLink, Pencil, ReceiptText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdForUser } from '@/lib/backend/read-models';
import { formatRupees } from '@/lib/calculations/money';
import { HouseholdRealtimeListener } from '@/components/household-realtime-listener';

export const metadata: Metadata = { title: 'Expense details' };

export default async function ExpenseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  let auth;
  try {
    auth = await createClient();
  } catch {
    redirect('/login');
  }
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const householdData = await getHouseholdForUser(user.id);
  const { supabase, household, profiles } = householdData;
  if (!household) redirect('/onboarding');

  const { data: expense } = await supabase
    .from('expenses')
    .select('*, expense_categories(name), expense_shares(*), expense_attachments(*)')
    .eq('id', id)
    .eq('household_id', household.id)
    .maybeSingle();

  if (!expense) notFound();

  const profileMap = new Map(profiles.map((p) => [p.id, p.display_name]));
  const category = (expense.expense_categories as { name?: string } | null)?.name ?? 'Shared expense';

  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', household.id)
    .eq('user_id', user.id)
    .maybeSingle();

  const canEdit = expense.created_by === user.id || membership?.role === 'admin';

  const attachments = (expense.expense_attachments as Array<{ id: string; object_path: string; mime_type: string }> | null) ?? [];
  let signedReceiptUrl: string | null = null;
  if (attachments.length > 0 && attachments[0]?.object_path) {
    const { data: signed } = await supabase.storage
      .from('receipts')
      .createSignedUrl(attachments[0].object_path, 3600);
    signedReceiptUrl = signed?.signedUrl ?? null;
  }

  const shares = (expense.expense_shares as Array<{ id: string; user_id: string; share_amount: number }> | null) ?? [];
  const amountPaise = Math.round(Number(expense.amount) * 100);

  return (
    <div className="page-wrap detail-page">
      <HouseholdRealtimeListener householdId={household.id} />
      <Link className="back-link" href="/expenses">
        <ArrowLeft size={16} /> All expenses
      </Link>
      <div className="detail-top">
        <div>
          <span className="eyebrow">{category}</span>
          <h1>{expense.title}</h1>
          <p>
            <CalendarDays size={15} />
            {new Date(`${expense.expense_date}T12:00:00`).toLocaleDateString('en', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        {canEdit && (
          <Link className="button button-secondary" href={`/expenses/${id}/edit`}>
            <Pencil size={15} /> Edit
          </Link>
        )}
      </div>

      <div className="detail-total-card">
        <span>Total expense</span>
        <strong>{formatRupees(amountPaise)}</strong>
        <div>
          <span>Paid by</span>
          <b>{profileMap.get(expense.paid_by) ?? 'A household member'}</b>
        </div>
      </div>

      <section className="detail-section">
        <div className="list-heading">
          <div>
            <h2>Split between</h2>
            <p>Each person’s share</p>
          </div>
          <span className="member-count">{shares.length} people</span>
        </div>
        <div className="detail-share-list">
          {shares.map((share) => (
            <div className="detail-share-row" key={share.id}>
              <span className="member-avatar">
                {profileMap.get(share.user_id)?.charAt(0).toUpperCase() ?? 'H'}
              </span>
              <span>{profileMap.get(share.user_id) ?? 'Housemate'}</span>
              <strong>{formatRupees(Math.round(Number(share.share_amount) * 100))}</strong>
            </div>
          ))}
        </div>
      </section>

      {signedReceiptUrl && (
        <section className="detail-section">
          <h2>Receipt</h2>
          <a
            href={signedReceiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="receipt-link"
          >
            <ReceiptText size={17} />
            <span>View uploaded receipt</span>
            <ExternalLink size={15} />
          </a>
        </section>
      )}

      {expense.notes && (
        <section className="detail-section">
          <h2>A note</h2>
          <p className="notes-copy">{expense.notes}</p>
        </section>
      )}

      <div className="detail-meta">
        <span>Added by {profileMap.get(expense.created_by) ?? 'a member'}</span>
        <span>Updated {new Date(expense.updated_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
