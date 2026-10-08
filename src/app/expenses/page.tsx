import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Plus, ReceiptText, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdForUser } from '@/lib/backend/read-models';
import { formatRupees } from '@/lib/calculations/money';
import { monthStartInTimezone } from '@/lib/dates';
import { ExpenseDateFilter } from '@/components/expense-date-filter';
import { HouseholdRealtimeListener } from '@/components/household-realtime-listener';

export const metadata: Metadata = { title: 'Expenses' };

export default async function ExpensesPage({
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

  const selectedDate = paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) ? paramDate : undefined;

  let expensesQuery = supabase
    .from('expenses')
    .select('*')
    .eq('household_id', household.id)
    .order('expense_date', { ascending: false });

  if (selectedDate) {
    expensesQuery = expensesQuery.eq('expense_date', selectedDate);
  } else {
    expensesQuery = expensesQuery.limit(100);
  }

  const [expensesRes, sharesRes, categoriesRes] = await Promise.all([
    expensesQuery,
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

  const total = expenses.reduce((sum, expense) => sum + Math.round(Number(expense.amount) * 100), 0);
  const personal = expenses.reduce((sum, expense) => sum + (myShares.get(expense.id) ?? 0), 0);
  const paid = expenses
    .filter((expense) => expense.paid_by === user.id)
    .reduce((sum, expense) => sum + Math.round(Number(expense.amount) * 100), 0);

  const formattedSelectedDate = selectedDate
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className="page-wrap">
      <HouseholdRealtimeListener householdId={household.id} />
      <div className="page-title-row">
        <div>
          <span className="eyebrow">{household.name.toUpperCase()} <i>·</i> SHARED SPENDING</span>
          <h1>Expenses</h1>
          <p>Everything shared, all in one place.</p>
        </div>
        <Link
          className="button button-primary"
          href={selectedDate ? `/expenses/new?date=${selectedDate}` : '/expenses/new'}
        >
          <Plus size={17} /> Add expense
        </Link>
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-highlight">
          <span>{selectedDate ? `${formattedSelectedDate} total` : `${now.toLocaleDateString('en', { month: 'long', timeZone: household.timezone })} total`}</span>
          <strong>{formatRupees(total)}</strong>
          <small>{selectedDate ? 'Expenses on this date' : 'Shared household spending'}</small>
        </div>
        <div className="stat-card">
          <span>Your share</span>
          <strong>{formatRupees(personal)}</strong>
          <small>{selectedDate ? `For this date` : `Across ${expenses.length} expenses`}</small>
        </div>
        <div className="stat-card">
          <span>You paid</span>
          <strong>{formatRupees(paid)}</strong>
          <small>{selectedDate ? `On this date` : 'This month'}</small>
        </div>
      </div>

      <ExpenseDateFilter
        currentDate={selectedDate}
        totalFilteredRecords={expenses.length}
        totalAmountPaise={total}
      />

      <div className="list-heading">
        <div>
          <h2>{selectedDate ? `Expenses on ${formattedSelectedDate}` : 'All expenses'}</h2>
          <p>{selectedDate ? `${expenses.length} recorded on this date` : 'Most recent first'}</p>
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
          <h3>{selectedDate ? `No expenses on ${formattedSelectedDate}` : 'No expenses yet'}</h3>
          <p>{selectedDate ? 'No shared expenses were recorded for this date.' : 'Add your first shared expense.'}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <Link
              className="button button-primary"
              href={selectedDate ? `/expenses/new?date=${selectedDate}` : '/expenses/new'}
            >
              Add expense <ArrowRight size={16} />
            </Link>
            {selectedDate && (
              <Link className="button button-secondary" href="/expenses">
                View all expenses
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
