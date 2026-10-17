import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdForUser } from '@/lib/backend/read-models';
import { ExpenseForm } from '@/components/expense-form';

export const metadata: Metadata = { title: 'Add an expense' };

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; title?: string; category?: string }>;
}) {
  const { date: paramDate, title: paramTitle, category: paramCategory } = await searchParams;

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

  const excludedCategories = new Set(['cat food', 'cat litter', 'cat supplies']);

  const categories = (categoryRows ?? [])
    .filter((row) => !excludedCategories.has(row.name.trim().toLowerCase()))
    .map((row) => ({
      id: row.id,
      name: row.name,
      is_pet: Boolean(row.is_pet),
    }));

  const people = members.map((member) => ({
    userId: member.user_id,
    name: profiles.find((profile) => profile.id === member.user_id)?.display_name || 'Housemate',
  }));

  const initialDate = paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) ? paramDate : undefined;

  const currentMember = members.find((member) => member.user_id === user.id);
  const isAdmin = currentMember?.role === 'admin';

  return (
    <div className="page-wrap form-page">
      <Link className="back-link" href={initialDate ? `/expenses?date=${initialDate}` : '/expenses'}>
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
          initialDate={initialDate}
          initialTitle={paramTitle}
          initialCategory={paramCategory}
          isAdmin={isAdmin}
        />
      </section>
    </div>
  );
}
