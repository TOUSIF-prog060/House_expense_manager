import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdForUser } from '@/lib/backend/read-models';
import { ExpenseForm } from '@/components/expense-form';

export const metadata: Metadata = { title: 'Add an expense' };

export default async function NewExpensePage() {
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

  const { data: categoryRows } = await supabase
    .from('expense_categories')
    .select('*')
    .or(`household_id.is.null,household_id.eq.${household.id}`);

  const categories = (categoryRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    is_pet: Boolean(row.is_pet),
  }));

  const people = members.map((member) => ({
    userId: member.user_id,
    name: profiles.find((profile) => profile.id === member.user_id)?.display_name || 'Housemate',
  }));

  return (
    <div className="page-wrap form-page">
      <Link className="back-link" href="/expenses">
        <ArrowLeft size={16} /> All expenses
      </Link>
      <div className="page-heading">
        <span className="eyebrow">A LITTLE SOMETHING SHARED</span>
        <h1>Add an expense</h1>
        <p>One quick note now makes settling up easier later.</p>
      </div>
      <section className="form-card">
        <ExpenseForm
          householdId={household.id}
          people={people}
          categories={categories}
          currentUserId={user.id}
        />
      </section>
    </div>
  );
}
