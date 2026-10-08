import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Plus, ReceiptText, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdForUser } from '@/lib/backend/read-models';
import { formatRupees } from '@/lib/calculations/money';
import { monthStartInTimezone } from '@/lib/dates';
import { HouseholdRealtimeListener } from '@/components/household-realtime-listener';

export const metadata: Metadata = { title: 'Expenses' };

export default async function ExpensesPage() {
  let auth;
  try {
    auth = await createClient();
  } catch {
    redirect('/login');
  }
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/login');

  const householdData = await getHouseholdForUser(user.id);
  const { supabase, household, profiles, members } = householdData;
  if (!household) {
    return (
      <div className="page-wrap">
        <h1>Expenses</h1>
        <p>Set up or join a household to get started.</p>
        <Link className="button button-primary" href="/onboarding">
          Set up household
        </Link>
      </div>
    );
  }

  const [expensesRes, sharesRes, categoriesRes] = await Promise.all([
    supabase
      .from('expenses')
      .select('*')
      .eq('household_id', household.id)
      .order('expense_date', { ascending: false })
      .limit(100),
    supabase
      .from('expense_shares')
      .select('*'),
    supabase
      .from('expense_categories')
      .select('*')
      .or(`household_id.is.null,household_id.eq.${household.id}`),
  ]);

  const rawExpenses = expensesRes.data ?? [];
  const shares = sharesRes.data ?? [];
  const categories = categoriesRes.data ?? [];

  const now = new Date();
  const monthStart = monthStartInTimezone(now, household.timezone);
  const categoryMap = new Map(categories.map((row) => [row.id, row.name]));
  const profileMap = new Map(profiles.map((p) => [p.id, p.display_name]));

  const expenses = rawExpenses;
  const mine = shares.filter((row) => row.user_id === user.id);
  const myShares = new Map(mine.map((row) => [row.expense_id, Math.round(Number(row.share_amount) * 100)]));

  const filtered = expenses.filter((expense) => expense.expense_date >= monthStart);
  const total = filtered.reduce((sum, expense) => sum + Math.round(Number(expense.amount) * 100), 0);
  const personal = filtered.reduce((sum, expense) => sum + (myShares.get(expense.id) ?? 0), 0);
  const paid = filtered
    .filter((expense) => expense.paid_by === user.id)
    .reduce((sum, expense) => sum + Math.round(Number(expense.amount) * 100), 0);

  return (
    <div className="page-wrap">
      <HouseholdRealtimeListener householdId={household.id} />
      <div className="page-title-row">
        <div>
          <span className="eyebrow">{household.name.toUpperCase()} <i>·</i> SHARED SPENDING</span>
          <h1>Expenses</h1>
          <p>Everything shared, all in one place.</p>
        </div>
        <Link className="button button-primary" href="/expenses/new">
          <Plus size={17} /> Add expense
        </Link>
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-highlight">
          <span>{now.toLocaleDateString('en', { month: 'long', timeZone: household.timezone })} total</span>
          <strong>{formatRupees(total)}</strong>
          <small>Shared household spending</small>
        </div>
        <div className="stat-card">
          <span>Your share</span>
          <strong>{formatRupees(personal)}</strong>
          <small>Across {filtered.length} expenses</small>
        </div>
        <div className="stat-card">
          <span>You paid</span>
          <strong>{formatRupees(paid)}</strong>
          <small>This month</small>
        </div>
      </div>

      <div className="list-heading">
        <div>
          <h2>All expenses</h2>
          <p>Most recent first</p>
        </div>
        <span className="filter-chip">
          <Search size={14} /> {expenses.length} records
        </span>
      </div>

      {expenses.length ? (
        <div className="expense-list">
          {expenses.map((expense) => {
            const category = categoryMap.get(expense.category_id ?? '') ?? 'Other';
            const payerName = profileMap.get(expense.paid_by) ?? members.find((m) => m.user_id === expense.paid_by)?.user_id ?? 'A member';
            const amountPaise = Math.round(Number(expense.amount) * 100);
            return (
              <Link className="expense-list-row" key={expense.id} href={`/expenses/${expense.id}`}>
                <span className="expense-emoji">{category.startsWith('Cat') ? '🐾' : '✳'}</span>
                <span className="recent-main">
                  <strong>{expense.title}</strong>
                  <span>
                    {payerName} <i>·</i> {category} <i>·</i>{' '}
                    {new Date(`${expense.expense_date}T12:00:00`).toLocaleDateString('en', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </span>
                <span className="expense-row-share">
                  <b>{formatRupees(amountPaise)}</b>
                  <small>Your share {formatRupees(myShares.get(expense.id) ?? 0)}</small>
                </span>
                <ArrowRight className="row-arrow" size={16} />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty-state list-empty">
          <ReceiptText size={26} />
          <h3>No expenses yet</h3>
          <p>Add your first shared expense.</p>
          <Link className="button button-primary" href="/expenses/new">
            Add expense <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}
