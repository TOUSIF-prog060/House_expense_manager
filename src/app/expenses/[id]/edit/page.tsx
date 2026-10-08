import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdForUser } from '@/lib/backend/read-models';
import { EditExpenseForm } from '@/components/edit-expense-form';

export const metadata: Metadata = { title: 'Edit expense' };

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
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
  const { supabase, household, profiles, members } = householdData;
  if (!household) redirect('/onboarding');

  const { data: expense } = await supabase
    .from('expenses')
    .select('*, expense_shares(*)')
    .eq('id', id)
    .eq('household_id', household.id)
    .maybeSingle();

  if (!expense) notFound();

  const membership = members.find((m) => m.user_id === user.id);
  if (expense.created_by !== user.id && membership?.role !== 'admin') {
    redirect(`/expenses/${id}`);
  }

  const people = members.map((m) => ({
    userId: m.user_id,
    name: profiles.find((p) => p.id === m.user_id)?.display_name || 'Housemate',
  }));

  const shares = (expense.expense_shares as Array<{ id: string; user_id: string; share_amount: number }> | null) ?? [];

  const formattedExpense = {
    id: expense.id,
    household_id: expense.household_id,
    title: expense.title,
    amount_paise: String(Math.round(Number(expense.amount) * 100)),
    expense_date: expense.expense_date,
    notes: expense.notes ?? '',
    expense_shares: shares.map((s) => ({
      id: s.id,
      user_id: s.user_id,
      share_amount_paise: String(Math.round(Number(s.share_amount) * 100)),
    })),
  };

  return (
    <div className="page-wrap form-page">
      <EditExpenseForm expense={formattedExpense} people={people} />
    </div>
  );
}
