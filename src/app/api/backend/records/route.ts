import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStore } from '@/lib/backend/supabase-store';
import type { SheetRow, SheetTable } from '@/lib/backend/sheet-schema';

const tables = new Set<SheetTable>(['profiles', 'households', 'household_members', 'expense_categories', 'expenses', 'expense_shares', 'payments', 'meal_slots', 'cat_feedings', 'notifications', 'activity_events']);

export async function GET(request: NextRequest) {
  try {
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const table = request.nextUrl.searchParams.get('table') as SheetTable | null;
    const householdId = request.nextUrl.searchParams.get('householdId');
    if (!table || !tables.has(table)) return NextResponse.json({ error: 'Unsupported table.' }, { status: 400 });

    const store = getStore();
    const [members, rows] = await Promise.all([store.list('household_members'), store.list(table)]);
    const membership = members.find((row) => row.user_id === user.id && row.status === 'active' && (!householdId || row.household_id === householdId));
    if (!membership) return NextResponse.json({ error: 'Household access denied.' }, { status: 403 });
    const householdMembers = members.filter((row) => row.household_id === membership.household_id && row.status === 'active');
    const memberIds = new Set(householdMembers.map((row) => row.user_id));
    const householdExpenses = await store.list('expenses');
    const expenseIds = new Set(householdExpenses.filter((row) => row.household_id === membership.household_id).map((row) => row.id));
    const visible = (rows as Array<SheetRow<typeof table>>).filter((row) => {
      const value = row as Record<string, string>;
      if (table === 'profiles') return memberIds.has(value.id);
      if (table === 'households') return value.id === membership.household_id;
      if (table === 'household_members' || table === 'expense_categories' || table === 'expenses' || table === 'payments' || table === 'meal_slots' || table === 'cat_feedings' || table === 'activity_events') return value.household_id === membership.household_id;
      if (table === 'expense_shares') return expenseIds.has(value.expense_id) && memberIds.has(value.user_id);
      if (table === 'notifications') return value.user_id === user.id;
      return false;
    });
    return NextResponse.json({ data: visible });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not read the household data.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
