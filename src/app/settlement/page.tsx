import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Scale, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdForUser } from '@/lib/backend/read-models';
import { formatRupees, simplifySettlements, type Balance } from '@/lib/calculations/money';
import { PaymentForm } from '@/components/payment-form';
import { monthStartInTimezone } from '@/lib/dates';
import { HouseholdRealtimeListener } from '@/components/household-realtime-listener';

export const metadata: Metadata = { title: 'Settlement' };

export default async function SettlementPage() {
  let auth;
  try {
    auth = await createClient();
  } catch {
    redirect('/login');
  }
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/login');

  const householdData = await getHouseholdForUser(user.id);
  const { supabase, household, members, profiles } = householdData;
  if (!household) redirect('/onboarding');

  const monthStart = monthStartInTimezone(new Date(), household.timezone);

  const [expensesRes, sharesRes, paymentsRes] = await Promise.all([
    supabase
      .from('expenses')
      .select('*')
      .eq('household_id', household.id)
      .gte('expense_date', monthStart),
    supabase
      .from('expense_shares')
      .select('*'),
    supabase
      .from('payments')
      .select('*')
      .eq('household_id', household.id)
      .gte('payment_date', monthStart),
  ]);

  const expenses = expensesRes.data ?? [];
  const allShares = sharesRes.data ?? [];
  const payments = paymentsRes.data ?? [];

  const expenseIds = new Set(expenses.map((e) => e.id));
  const shares = allShares.filter((s) => expenseIds.has(s.expense_id));
  const profileMap = new Map(profiles.map((p) => [p.id, p.display_name]));

  const balances: Balance[] = members.map((member) => {
    const paid = expenses
      .filter((row) => row.paid_by === member.user_id)
      .reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0);
    const personal = shares
      .filter((row) => row.user_id === member.user_id)
      .reduce((sum, row) => sum + Math.round(Number(row.share_amount) * 100), 0);
    const adjustments = payments
      .filter((row) => row.status === 'confirmed' || row.status === 'recorded')
      .reduce(
        (sum, row) =>
          sum +
          (row.from_user === member.user_id
            ? Math.round(Number(row.amount) * 100)
            : row.to_user === member.user_id
            ? -Math.round(Number(row.amount) * 100)
            : 0),
        0
      );
    return {
      userId: member.user_id,
      name: profileMap.get(member.user_id) ?? 'Housemate',
      balancePaise: paid - personal + adjustments,
    };
  });

  const total = expenses.reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0);
  const paidTotal = expenses
    .filter((row) => row.paid_by === user.id)
    .reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0);
  const shareTotal = shares
    .filter((row) => row.user_id === user.id)
    .reduce((sum, row) => sum + Math.round(Number(row.share_amount) * 100), 0);
  const position = balances.find((row) => row.userId === user.id)?.balancePaise ?? 0;
  const transfers = simplifySettlements(balances);

  return (
    <div className="page-wrap settlement-page">
      <HouseholdRealtimeListener householdId={household.id} />
      <div className="page-title-row">
        <div>
          <span className="eyebrow">
            {household.name.toUpperCase()} <i>·</i> FAIR AND SQUARE
          </span>
          <h1>Settlement</h1>
          <p>Clear balances, keep home easy.</p>
        </div>
        <span className="settlement-mark">
          <Scale size={21} />
        </span>
      </div>

      <div className="settlement-summary">
        <div className="summary-main">
          <span className="eyebrow">THIS MONTH</span>
          <strong>{formatRupees(total)}</strong>
          <small>Total household expenses</small>
        </div>
        <div className="summary-pair">
          <div>
            <span>Your share</span>
            <b>{formatRupees(shareTotal)}</b>
          </div>
          <div>
            <span>You paid</span>
            <b>{formatRupees(paidTotal)}</b>
          </div>
          <div>
            <span>Your balance</span>
            <b className={position >= 0 ? 'positive' : 'negative'}>
              {position >= 0 ? '+' : ''}
              {formatRupees(position)}
            </b>
          </div>
        </div>
      </div>

      <div className="settlement-layout">
        <section className="panel-card settle-list-card">
          <div className="section-heading">
            <div className="section-icon settle-icon">
              <Wallet size={17} />
            </div>
            <div>
              <h2>Who pays whom</h2>
              <p>The fewest transfers to square things up.</p>
            </div>
          </div>
          {transfers.length ? (
            <div className="transfer-list">
              {transfers.map((transfer, index) => (
                <div className="transfer-row" key={`${transfer.fromUserId}-${transfer.toUserId}`}>
                  <div className="transfer-people">
                    <span className="transfer-avatar payer-avatar">
                      {transfer.fromName[0]?.toUpperCase() ?? 'U'}
                    </span>
                    <span className="transfer-names">
                      <b>{transfer.fromName}</b>
                      <ArrowRight size={14} />
                      <b>{transfer.toName}</b>
                    </span>
                    <span className="transfer-avatar receiver-avatar">
                      {transfer.toName[0]?.toUpperCase() ?? 'U'}
                    </span>
                  </div>
                  <strong>{formatRupees(transfer.amountPaise)}</strong>
                  <span className="transfer-index">0{index + 1}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Scale size={25} />
              <p>Everyone’s settled up. Nice work, household.</p>
            </div>
          )}
          <div className="member-balance-list">
            <h3>Household balances</h3>
            {balances.map((balance) => (
              <div className="member-balance-row" key={balance.userId}>
                <span className="member-avatar">
                  {balance.name[0]?.toUpperCase() ?? 'H'}
                </span>
                <span>
                  {balance.name}
                  {balance.userId === user.id ? ' (you)' : ''}
                </span>
                <b className={balance.balancePaise >= 0 ? 'positive' : 'negative'}>
                  {balance.balancePaise >= 0 ? '+' : ''}
                  {formatRupees(balance.balancePaise)}
                </b>
              </div>
            ))}
          </div>
        </section>

        <aside className="payment-side">
          <PaymentForm
            householdId={household.id}
            members={balances.map((row) => ({ userId: row.userId, name: row.name }))}
            currentUserId={user.id}
          />
          <div className="payment-info">
            <span className="payment-info-icon">
              <ArrowUpRight size={17} />
            </span>
            <strong>Recorded between you</strong>
            <p>
              Expense Manager tracks who paid whom. The actual transfer happens however your household prefers.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
