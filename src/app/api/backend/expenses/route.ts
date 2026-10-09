import { NextRequest, NextResponse } from 'next/server';
import { calculateShares } from '@/lib/calculations/money';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { expenseSchema } from '@/lib/validation/schemas';
import { sendHouseholdPushNotification } from '@/lib/notifications/push-service';

export async function POST(request: NextRequest) {
  try {
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const parsed = expenseSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid expense.' }, { status: 400 });
    const input = parsed.data;

    const split = calculateShares(input.amount, input.participants, input.splitMethod);
    const shares = Object.entries(split).map(([userId, amount]) => ({
      user_id: userId,
      share_amount: (amount / 100).toFixed(2),
      share_percentage: input.splitMethod === 'percentage' ? Number(input.participants.find((person) => person.userId === userId)?.value ?? 0) : null,
    }));

    const { data: id, error } = await auth.rpc('create_expense_with_shares', {
      p_household_id: input.householdId,
      p_title: input.title,
      p_amount: input.amount,
      p_category_id: input.category,
      p_paid_by: input.paidBy,
      p_expense_date: input.expenseDate,
      p_notes: input.notes ?? null,
      p_shares: shares,
    });

    if (error) {
      if (
        error.code === '42501' ||
        error.message.includes('row-level security') ||
        error.message.includes('ambiguous') ||
        error.message.includes('item')
      ) {
        const { data: member } = await auth
          .from('household_members')
          .select('id')
          .eq('household_id', input.householdId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (!member) {
          return NextResponse.json({ error: 'Household access denied' }, { status: 403 });
        }

        const admin = createAdminClient();
        const { data: newExpense, error: expError } = await admin
          .from('expenses')
          .insert({
            household_id: input.householdId,
            title: input.title.trim(),
            amount: Number(input.amount),
            category_id: input.category || null,
            paid_by: input.paidBy,
            created_by: user.id,
            expense_date: input.expenseDate,
            notes: input.notes ?? null,
          })
          .select()
          .single();

        if (expError) {
          return NextResponse.json({ error: expError.message }, { status: 400 });
        }

        if (shares.length > 0) {
          const shareRows = shares.map((s) => ({
            expense_id: newExpense.id,
            user_id: s.user_id,
            share_amount: Number(s.share_amount),
            share_percentage: s.share_percentage,
          }));
          await admin.from('expense_shares').insert(shareRows);
        }

        await admin.from('activity_events').insert({
          household_id: input.householdId,
          actor: user.id,
          event_type: 'expense.created',
          entity_type: 'expense',
          entity_id: newExpense.id,
          metadata: { title: input.title.trim(), amount: input.amount },
        });

        void notifyExpenseAdded(input.householdId, user.id, input.title, Number(input.amount), newExpense.id);

        return NextResponse.json({ data: { id: newExpense.id } }, { status: 201 });
      }

      console.error('create_expense_with_shares RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    void notifyExpenseAdded(input.householdId, user.id, input.title, Number(input.amount), id);

    return NextResponse.json({ data: { id } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : (typeof error === 'object' && error && 'message' in error ? String((error as { message?: unknown }).message) : 'Could not save the expense.');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function notifyExpenseAdded(householdId: string, actorId: string, title: string, amount: number, expenseId?: string) {
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('display_name').eq('id', actorId).maybeSingle();
    const userName = profile?.display_name || 'A housemate';

    await sendHouseholdPushNotification(
      householdId,
      {
        title: 'New Expense Added 🧾',
        body: `${userName} added "${title}" (₹${amount.toFixed(0)}).`,
        url: expenseId ? `/expenses/${expenseId}` : '/expenses',
        tag: 'expense-created',
        data: {
          type: 'expense_created',
          expenseId,
        },
      },
      'expense',
      actorId
    );
  } catch (err) {
    console.error('[Push/Expense] Dispatch error:', err);
  }
}
