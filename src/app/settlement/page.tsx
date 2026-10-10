import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Divide,
  Equal,
  Layers,
  Receipt,
  Scale,
  Sparkles,
  Tags,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdForUser } from '@/lib/backend/read-models';
import { formatRupees, simplifySettlements, type Balance, type Transfer } from '@/lib/calculations/money';
import { monthStartInTimezone } from '@/lib/dates';
import { HouseholdRealtimeListener } from '@/components/household-realtime-listener';
import { SettlementInteractive } from '@/components/settlement-interactive';

export const metadata: Metadata = { title: 'Settlement' };

const categoryEmojiMap: Record<string, string> = {
  Rent: '🏠',
  Groceries: '🛒',
  Electricity: '⚡',
  Water: '💧',
  Internet: '📶',
  Gas: '🔥',
  Maid: '🧹',
  Household: '🏡',
  Transport: '🚗',
  Food: '🍽️',
  'Cat Food': '🐾',
  'Cat Litter': '🐱',
  'Cat Vet': '🏥',
  'Cat Medicine': '💊',
  'Cat Supplies': '🧶',
  Other: '📦',
};

export default async function SettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const isAllTime = period === 'all';

  let auth;
  try {
    auth = await createClient();
  } catch {
    redirect('/login');
  }

  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect('/login');

  const householdData = await getHouseholdForUser(user.id);
  const { supabase, household, members, profiles } = householdData;
  if (!household) redirect('/onboarding');

  const now = new Date();
  const monthStart = monthStartInTimezone(now, household.timezone);

  const monthFormatter = new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: household.timezone,
  });
  const currentMonthLabel = monthFormatter.format(now);

  // 1. Fetch household expenses, payments, and categories
  let expensesQuery = supabase
    .from('expenses')
    .select('id, amount, paid_by, expense_date, title, category_id, expense_categories(id, name, icon, is_pet)')
    .eq('household_id', household.id);

  let paymentsQuery = supabase
    .from('payments')
    .select('*')
    .eq('household_id', household.id);

  const categoriesQuery = supabase
    .from('expense_categories')
    .select('*')
    .or(`household_id.is.null,household_id.eq.${household.id}`);

  if (!isAllTime) {
    expensesQuery = expensesQuery.gte('expense_date', monthStart);
    paymentsQuery = paymentsQuery.gte('payment_date', monthStart);
  }

  const [expensesRes, paymentsRes, categoriesRes] = await Promise.all([
    expensesQuery,
    paymentsQuery.order('payment_date', { ascending: false }),
    categoriesQuery,
  ]);

  const expenses = expensesRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const categories = categoriesRes.data ?? [];

  // 2. Simple Equal Split Calculation
  const totalPaise = expenses.reduce(
    (sum, row) => sum + Math.round(Number(row.amount) * 100),
    0
  );
  const memberCount = Math.max(members.length, 1);

  // Equal division of the total household expenses
  const baseSharePaise = Math.floor(totalPaise / memberCount);
  const remainderPaise = totalPaise % memberCount;

  // Distribute any remainder paise deterministically
  const memberFairShares = new Map<string, number>();
  const sortedMembers = [...members].sort((a, b) => a.user_id.localeCompare(b.user_id));
  sortedMembers.forEach((member, index) => {
    const extra = index < remainderPaise ? 1 : 0;
    memberFairShares.set(member.user_id, baseSharePaise + extra);
  });

  const profileMap = new Map(profiles.map((p) => [p.id, p.display_name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // 3. Category Split Breakdown
  type CategoryGroup = {
    id: string;
    name: string;
    emoji: string;
    totalPaise: number;
    expenseCount: number;
    expenses: typeof expenses;
  };

  const categoryGroupMap = new Map<string, CategoryGroup>();

  for (const exp of expenses) {
    const rawCat = (exp.category_id ? categoryMap.get(exp.category_id) : null) ||
      (exp.expense_categories as { id?: string; name?: string; icon?: string; is_pet?: boolean } | null);

    const catId = rawCat?.id ?? exp.category_id ?? 'uncategorized';
    const catName = rawCat?.name ?? 'Other';
    const emoji = categoryEmojiMap[catName] || (rawCat?.is_pet ? '🐾' : '📁');

    const existing = categoryGroupMap.get(catId) ?? {
      id: catId,
      name: catName,
      emoji,
      totalPaise: 0,
      expenseCount: 0,
      expenses: [],
    };

    existing.totalPaise += Math.round(Number(exp.amount) * 100);
    existing.expenseCount += 1;
    existing.expenses.push(exp);

    categoryGroupMap.set(catId, existing);
  }

  const categorySplits = Array.from(categoryGroupMap.values())
    .map((group) => {
      const sharePerPersonPaise = Math.floor(group.totalPaise / memberCount);
      const userPaidPaise = group.expenses
        .filter((e) => e.paid_by === user.id)
        .reduce((sum, e) => sum + Math.round(Number(e.amount) * 100), 0);
      const userSharePaise = sharePerPersonPaise;
      const userNetPaise = userPaidPaise - userSharePaise;

      // Group payers for this category
      const payersMap = new Map<string, number>();
      for (const e of group.expenses) {
        const cur = payersMap.get(e.paid_by) || 0;
        payersMap.set(e.paid_by, cur + Math.round(Number(e.amount) * 100));
      }

      const payers = Array.from(payersMap.entries())
        .map(([payerId, amountPaise]) => ({
          name: profileMap.get(payerId) || 'Housemate',
          amountPaise,
          isUser: payerId === user.id,
        }))
        .sort((a, b) => b.amountPaise - a.amountPaise);

      const percentOfTotal = totalPaise > 0 ? Math.round((group.totalPaise / totalPaise) * 100) : 0;

      return {
        id: group.id,
        name: group.name,
        emoji: group.emoji,
        totalPaise: group.totalPaise,
        expenseCount: group.expenseCount,
        sharePerPersonPaise,
        userPaidPaise,
        userSharePaise,
        userNetPaise,
        percentOfTotal,
        payers,
      };
    })
    .sort((a, b) => b.totalPaise - a.totalPaise);

  // 4. Member balances calculation
  const memberBreakdown = sortedMembers.map((member) => {
    const name = profileMap.get(member.user_id) || 'Housemate';

    const paidPaise = expenses
      .filter((e) => e.paid_by === member.user_id)
      .reduce((sum, e) => sum + Math.round(Number(e.amount) * 100), 0);

    const fairSharePaise = memberFairShares.get(member.user_id) ?? baseSharePaise;

    const paymentsSentPaise = payments
      .filter(
        (p) =>
          (p.status === 'confirmed' || p.status === 'recorded') &&
          p.from_user === member.user_id
      )
      .reduce((sum, p) => sum + Math.round(Number(p.amount) * 100), 0);

    const paymentsReceivedPaise = payments
      .filter(
        (p) =>
          (p.status === 'confirmed' || p.status === 'recorded') &&
          p.to_user === member.user_id
      )
      .reduce((sum, p) => sum + Math.round(Number(p.amount) * 100), 0);

    const netPaymentsPaise = paymentsSentPaise - paymentsReceivedPaise;
    const balancePaise = paidPaise + netPaymentsPaise - fairSharePaise;

    return {
      userId: member.user_id,
      name,
      paidPaise,
      fairSharePaise,
      paymentsSentPaise,
      paymentsReceivedPaise,
      netPaymentsPaise,
      balancePaise,
      isCurrentUser: member.user_id === user.id,
    };
  });

  // 5. Simplify settlements into who pays whom
  const balances: Balance[] = memberBreakdown.map((m) => ({
    userId: m.userId,
    name: m.name,
    balancePaise: m.balancePaise,
  }));

  let transfers: Transfer[] = [];
  try {
    transfers = simplifySettlements(balances);
  } catch (error) {
    console.error('Error simplifying settlements:', error);
  }

  // 6. Current user position
  const currentUser = memberBreakdown.find((m) => m.userId === user.id);
  const userBalance = currentUser?.balancePaise ?? 0;
  const userPaid = currentUser?.paidPaise ?? 0;
  const userFairShare = currentUser?.fairSharePaise ?? 0;

  // 7. Recent recorded payments formatted
  const recentPayments = payments.slice(0, 8).map((p) => ({
    id: p.id,
    fromUser: p.from_user,
    toUser: p.to_user,
    fromName: profileMap.get(p.from_user) || 'Housemate',
    toName: profileMap.get(p.to_user) || 'Housemate',
    amount: Number(p.amount),
    paymentMethod: p.payment_method,
    paymentDate: p.payment_date,
    notes: p.notes,
  }));

  return (
    <div className="page-wrap settlement-page">
      <HouseholdRealtimeListener householdId={household.id} />

      {/* Header */}
      <div className="settlement-header">
        <div className="settlement-title-box">
          <span className="eyebrow">
            {household.name.toUpperCase()} <i>·</i> EQUAL SPLIT
          </span>
          <h1>Settlement</h1>
          <p>
            Total household expenses divided equally among all {memberCount} housemates.
          </p>
        </div>

        {/* Time Period Filter Tabs */}
        <div className="settlement-tabs">
          <Link
            href="/settlement"
            className={`tab-pill ${!isAllTime ? 'tab-pill-active' : ''}`}
          >
            {currentMonthLabel}
          </Link>
          <Link
            href="/settlement?period=all"
            className={`tab-pill ${isAllTime ? 'tab-pill-active' : ''}`}
          >
            All Time
          </Link>
        </div>
      </div>

      {/* The Simple Math Equation: Total / Members = Fair Share */}
      <div className="split-equation-container">
        <div className="split-equation-card">
          <div className="equation-block">
            <span className="eq-label">
              <Receipt size={14} /> Total Expenses
            </span>
            <strong className="eq-value">{formatRupees(totalPaise)}</strong>
            <small className="eq-sub">
              {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}{' '}
              {isAllTime ? 'in total' : 'this month'}
            </small>
          </div>

          <div className="equation-operator">
            <Divide size={20} />
          </div>

          <div className="equation-block">
            <span className="eq-label">
              <Users size={14} /> House Members
            </span>
            <strong className="eq-value">{memberCount}</strong>
            <small className="eq-sub">
              {memberCount === 1 ? 'person in house' : 'people sharing costs'}
            </small>
          </div>

          <div className="equation-operator">
            <Equal size={20} />
          </div>

          <div className="equation-block equation-block-highlight">
            <span className="eq-label">
              <Scale size={14} /> Equal Share Each
            </span>
            <strong className="eq-value eq-highlight-value">
              {formatRupees(baseSharePaise)}
            </strong>
            <small className="eq-sub">Per housemate fair split</small>
          </div>
        </div>
      </div>

      {/* User's Direct Status Banner */}
      <div
        className={`user-status-banner ${
          userBalance > 0
            ? 'status-banner-positive'
            : userBalance < 0
            ? 'status-banner-negative'
            : 'status-banner-settled'
        }`}
      >
        <div className="status-banner-content">
          <div className="status-icon-wrap">
            {userBalance > 0 ? (
              <TrendingUp size={24} />
            ) : userBalance < 0 ? (
              <TrendingDown size={24} />
            ) : (
              <CheckCircle2 size={24} />
            )}
          </div>
          <div className="status-text-wrap">
            <span className="status-eyebrow">YOUR CURRENT POSITION</span>
            <h2>
              {userBalance > 0 && `You get back ${formatRupees(userBalance)}`}
              {userBalance < 0 && `You owe ${formatRupees(Math.abs(userBalance))}`}
              {userBalance === 0 && 'You are completely settled up! 🎉'}
            </h2>
            <p>
              {userBalance > 0 &&
                `You contributed ${formatRupees(
                  userPaid
                )}, which is ${formatRupees(
                  userBalance
                )} more than your fair share of ${formatRupees(userFairShare)}.`}
              {userBalance < 0 &&
                `You contributed ${formatRupees(
                  userPaid
                )} so far. Your equal share is ${formatRupees(
                  userFairShare
                )}, so you need to pay ${formatRupees(
                  Math.abs(userBalance)
                )} to settle up.`}
              {userBalance === 0 &&
                `Your total contribution matches your exact equal share of ${formatRupees(
                  userFairShare
                )}.`}
            </p>
          </div>
        </div>

        <div className="status-metrics">
          <div className="status-metric-item">
            <span>You Paid</span>
            <b>{formatRupees(userPaid)}</b>
          </div>
          <div className="status-metric-divider" />
          <div className="status-metric-item">
            <span>Your Fair Share</span>
            <b>{formatRupees(userFairShare)}</b>
          </div>
        </div>
      </div>

      {/* Category-Wise Split Breakdown */}
      <section className="panel-card category-breakdown-panel">
        <div className="section-heading">
          <div className="section-icon category-icon-wrap">
            <Tags size={18} />
          </div>
          <div className="category-heading-text">
            <h2>Category split breakdown</h2>
            <p>
              Each category’s total expense split of {memberCount} equal shares, with your portion clearly calculated.
            </p>
          </div>
        </div>

        {categorySplits.length > 0 ? (
          <div className="category-cards-grid">
            {categorySplits.map((cat) => {
              const owes = cat.userNetPaise < 0;
              const covered = cat.userNetPaise > 0;
              const isSettled = cat.userNetPaise === 0;

              return (
                <div className="category-split-card" key={cat.id}>
                  <div className="cat-card-header">
                    <div className="cat-title-row">
                      <span className="cat-emoji">{cat.emoji}</span>
                      <div>
                        <h3>{cat.name}</h3>
                        <small>
                          {cat.expenseCount} {cat.expenseCount === 1 ? 'expense' : 'expenses'}
                        </small>
                      </div>
                    </div>
                    {cat.percentOfTotal > 0 && (
                      <span className="cat-pct-badge">{cat.percentOfTotal}% of total</span>
                    )}
                  </div>

                  {/* Math Equation for this Category: Total ÷ Members = Share */}
                  <div className="cat-math-box">
                    <div className="cat-math-step">
                      <span className="cat-math-label">{cat.name} Total</span>
                      <strong className="cat-math-val">{formatRupees(cat.totalPaise)}</strong>
                    </div>
                    <div className="cat-math-sym">÷</div>
                    <div className="cat-math-step">
                      <span className="cat-math-label">{memberCount} Members</span>
                      <strong className="cat-math-val">{memberCount}</strong>
                    </div>
                    <div className="cat-math-sym">=</div>
                    <div className="cat-math-step cat-math-result">
                      <span className="cat-math-label">Equal Share Each</span>
                      <strong className="cat-math-val cat-math-val-highlight">
                        {formatRupees(cat.sharePerPersonPaise)}
                      </strong>
                    </div>
                  </div>

                  {/* Your Personal Status in this Category */}
                  <div className="cat-personal-summary">
                    <div className="cat-metric-pill">
                      <span>Your Share</span>
                      <b>{formatRupees(cat.userSharePaise)}</b>
                    </div>
                    <div className="cat-metric-pill">
                      <span>You Paid</span>
                      <b>{formatRupees(cat.userPaidPaise)}</b>
                    </div>
                    <div className="cat-metric-pill cat-status-pill">
                      <span>Your Status</span>
                      {covered && (
                        <b className="cat-status-green">
                          +{formatRupees(cat.userNetPaise)} (Covered)
                        </b>
                      )}
                      {owes && (
                        <b className="cat-status-red">
                          -{formatRupees(Math.abs(cat.userNetPaise))} (You owe)
                        </b>
                      )}
                      {isSettled && (
                        <b className="cat-status-neutral">
                          Settled
                        </b>
                      )}
                    </div>
                  </div>

                  {/* Who paid for this category */}
                  <div className="cat-payers-footer">
                    <span className="cat-payers-label">Paid by:</span>
                    <div className="cat-payers-chips">
                      {cat.payers.map((p, idx) => (
                        <span className={`payer-tag ${p.isUser ? 'payer-tag-user' : ''}`} key={idx}>
                          {p.name} {p.isUser ? '(You)' : ''}: <b>{formatRupees(p.amountPaise)}</b>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Layers size={28} />
            <p>No categorized expenses recorded for this period yet.</p>
          </div>
        )}
      </section>

      {/* Housemates Breakdown Card */}
      <section className="panel-card member-breakdown-card">
        <div className="section-heading">
          <div className="section-icon users-icon">
            <Users size={17} />
          </div>
          <div>
            <h2>Housemate split breakdown</h2>
            <p>What each person paid towards the house versus their equal share.</p>
          </div>
        </div>

        <div className="members-table">
          <div className="members-table-head">
            <span>Member</span>
            <span>Amount Paid</span>
            <span>Equal Share</span>
            <span>Status / Balance</span>
          </div>

          <div className="members-table-body">
            {memberBreakdown.map((item) => {
              const owes = item.balancePaise < 0;
              const getsBack = item.balancePaise > 0;
              const isSettled = item.balancePaise === 0;

              return (
                <div
                  className={`member-row ${item.isCurrentUser ? 'member-row-user' : ''}`}
                  key={item.userId}
                >
                  <div className="member-info">
                    <span className="member-avatar-chip">
                      {item.name[0]?.toUpperCase() ?? 'H'}
                    </span>
                    <div>
                      <strong>
                        {item.name} {item.isCurrentUser && <span className="you-pill">You</span>}
                      </strong>
                      {item.netPaymentsPaise !== 0 && (
                        <small className="member-adjustment-hint">
                          {item.netPaymentsPaise > 0
                            ? `+₹${(item.netPaymentsPaise / 100).toFixed(0)} sent in payments`
                            : `-₹${(Math.abs(item.netPaymentsPaise) / 100).toFixed(0)} received in payments`}
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="member-cell">
                    <span className="mobile-col-label">Paid</span>
                    <b>{formatRupees(item.paidPaise)}</b>
                  </div>

                  <div className="member-cell">
                    <span className="mobile-col-label">Share</span>
                    <span>{formatRupees(item.fairSharePaise)}</span>
                  </div>

                  <div className="member-cell member-status-cell">
                    <span className="mobile-col-label">Status</span>
                    {getsBack && (
                      <span className="balance-badge badge-green">
                        <ArrowUpRight size={13} /> Gets back {formatRupees(item.balancePaise)}
                      </span>
                    )}
                    {owes && (
                      <span className="balance-badge badge-red">
                        <ArrowDownLeft size={13} /> Owes {formatRupees(Math.abs(item.balancePaise))}
                      </span>
                    )}
                    {isSettled && (
                      <span className="balance-badge badge-neutral">
                        <CheckCircle2 size={13} /> Settled (₹0.00)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Settlement Transfers & Payment Recording */}
      <SettlementInteractive
        householdId={household.id}
        currentUserId={user.id}
        members={memberBreakdown.map((m) => ({ userId: m.userId, name: m.name }))}
        transfers={transfers}
        recentPayments={recentPayments}
      />
    </div>
  );
}
