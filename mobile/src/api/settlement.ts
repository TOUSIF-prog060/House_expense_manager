import { supabase } from './supabase';
import { simplifySettlements, type Balance, type Transfer } from '@ourhome/core';

export type SettlementSummary = {
  totalPaise: number;
  myBalancePaise: number;
  transfers: Transfer[];
  memberBalances: Array<{
    userId: string;
    name: string;
    upiId: string | null;
    paidPaise: number;
    fairSharePaise: number;
    balancePaise: number;
  }>;
  recentPayments: Array<{
    id: string;
    fromUser: string;
    toUser: string;
    fromName: string;
    toName: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    notes: string | null;
  }>;
};

export async function fetchSettlementData(
  householdId: string,
  currentUserId: string,
  period: 'month' | 'all' = 'month',
  timezone: string = 'Asia/Kolkata'
): Promise<SettlementSummary> {
  let expensesQuery = supabase
    .from('expenses')
    .select(`
      id,
      amount,
      paid_by,
      expense_date,
      shares:expense_shares(user_id, share_amount)
    `)
    .eq('household_id', householdId);

  let paymentsQuery = supabase
    .from('payments')
    .select('*')
    .eq('household_id', householdId);

  if (period === 'month') {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(now);
    const start = `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}-01`;
    expensesQuery = expensesQuery.gte('expense_date', start);
    paymentsQuery = paymentsQuery.gte('payment_date', start);
  }

  const [expensesRes, paymentsRes, membersRes] = await Promise.all([
    expensesQuery,
    paymentsQuery.order('payment_date', { ascending: false }),
    supabase
      .from('household_members')
      .select('user_id, profile:profiles(id, display_name, upi_id)')
      .eq('household_id', householdId)
      .eq('status', 'active'),
  ]);

  if (expensesRes.error) throw new Error(expensesRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);
  if (membersRes.error) throw new Error(membersRes.error.message);

  const expenses = expensesRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const members = membersRes.data ?? [];

  const totalPaise = expenses.reduce((sum, e) => sum + Math.round(Number(e.amount) * 100), 0);
  const memberCount = Math.max(members.length, 1);
  const baseShare = Math.floor(totalPaise / memberCount);

  const sortedMembers = [...members].sort((a, b) => a.user_id.localeCompare(b.user_id));
  const fairShares = new Map<string, number>();
  sortedMembers.forEach((m) => fairShares.set(m.user_id, 0));

  for (const exp of expenses) {
    const rawShares = (exp as { shares?: Array<{ user_id: string; share_amount: number | string }> }).shares ?? [];
    if (rawShares.length > 0) {
      for (const s of rawShares) {
        const cur = fairShares.get(s.user_id) ?? 0;
        fairShares.set(s.user_id, cur + Math.round(Number(s.share_amount) * 100));
      }
    } else {
      // Deterministic fallback for legacy expenses without itemized shares
      const expPaise = Math.round(Number(exp.amount) * 100);
      const base = Math.floor(expPaise / memberCount);
      const rem = expPaise % memberCount;
      sortedMembers.forEach((m, idx) => {
        const cur = fairShares.get(m.user_id) ?? 0;
        fairShares.set(m.user_id, cur + base + (idx < rem ? 1 : 0));
      });
    }
  }

  const profileMap = new Map<string, { name: string; upiId: string | null }>();
  members.forEach((m) => {
    const p = m.profile as unknown as { id: string; display_name: string; upi_id: string | null } | null;
    profileMap.set(m.user_id, {
      name: p?.display_name || 'Member',
      upiId: p?.upi_id || null,
    });
  });

  const balances: Balance[] = sortedMembers.map((m) => {
    const paidPaise = expenses
      .filter((e) => e.paid_by === m.user_id)
      .reduce((sum, e) => sum + Math.round(Number(e.amount) * 100), 0);

    const share = fairShares.get(m.user_id) ?? baseShare;

    const paymentsSent = payments
      .filter((p) => p.from_user === m.user_id && (p.status === 'confirmed' || p.status === 'recorded'))
      .reduce((sum, p) => sum + Math.round(Number(p.amount) * 100), 0);

    const paymentsReceived = payments
      .filter((p) => p.to_user === m.user_id && (p.status === 'confirmed' || p.status === 'recorded'))
      .reduce((sum, p) => sum + Math.round(Number(p.amount) * 100), 0);

    const balancePaise = paidPaise - share + paymentsSent - paymentsReceived;

    return {
      userId: m.user_id,
      name: profileMap.get(m.user_id)?.name || 'Member',
      balancePaise,
    };
  });

  // Calculate transfers
  let transfers: Transfer[] = [];
  try {
    transfers = simplifySettlements(balances);
  } catch {
    transfers = [];
  }

  const myBalance = balances.find((b) => b.userId === currentUserId)?.balancePaise ?? 0;

  const memberBalances = sortedMembers.map((m) => {
    const p = profileMap.get(m.user_id);
    const paidPaise = expenses
      .filter((e) => e.paid_by === m.user_id)
      .reduce((sum, e) => sum + Math.round(Number(e.amount) * 100), 0);
    const fairSharePaise = fairShares.get(m.user_id) ?? baseShare;
    const bal = balances.find((b) => b.userId === m.user_id)?.balancePaise ?? 0;

    return {
      userId: m.user_id,
      name: p?.name || 'Member',
      upiId: p?.upiId || null,
      paidPaise,
      fairSharePaise,
      balancePaise: bal,
    };
  });

  const recentPayments = payments.map((p) => ({
    id: p.id,
    fromUser: p.from_user,
    toUser: p.to_user,
    fromName: profileMap.get(p.from_user)?.name || 'Member',
    toName: profileMap.get(p.to_user)?.name || 'Member',
    amount: Number(p.amount),
    paymentMethod: p.payment_method,
    paymentDate: p.payment_date,
    notes: p.notes,
  }));

  return {
    totalPaise,
    myBalancePaise: myBalance,
    transfers,
    memberBalances,
    recentPayments,
  };
}

export async function recordPayment(params: {
  householdId: string;
  toUser: string;
  amount: number;
  paymentMethod: 'upi' | 'cash' | 'bank_transfer' | 'other';
  paymentDate?: string;
  notes?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('record_payment', {
    p_household_id: params.householdId,
    p_to_user: params.toUser,
    p_amount: params.amount,
    p_payment_method: params.paymentMethod,
    p_payment_date: params.paymentDate,
    p_notes: params.notes?.trim() || undefined,
  });

  if (error) throw new Error(error.message);
  return data as string;
}
