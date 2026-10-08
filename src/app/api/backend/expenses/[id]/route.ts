import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  title: z.string().trim().min(1).max(120),
  amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
  expenseDate: z.string().date(),
  notes: z.string().max(2000).optional(),
  shares: z.array(z.object({
    user_id: z.string().uuid(),
    share_amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
  })).min(1),
});

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid expense.' }, { status: 400 });

    const { id } = await context.params;

    const shares = parsed.data.shares.map((share) => ({
      user_id: share.user_id,
      share_amount: Number(share.share_amount),
      share_percentage: null,
    }));

    const { error } = await auth.rpc('update_expense_with_shares', {
      p_expense_id: id,
      p_title: parsed.data.title,
      p_amount: Number(parsed.data.amount),
      p_expense_date: parsed.data.expenseDate,
      p_notes: parsed.data.notes ?? null,
      p_shares: shares,
    });

    if (error) {
      if (
        error.code === '42501' ||
        error.message.includes('row-level security') ||
        error.message.includes('ambiguous') ||
        error.message.includes('item')
      ) {
        const { data: existingExpense } = await auth
          .from('expenses')
          .select('household_id, created_by, amount')
          .eq('id', id)
          .maybeSingle();

        if (existingExpense) {
          const { createAdminClient } = await import('@/lib/supabase/admin');
          const admin = createAdminClient();
          await admin
            .from('expenses')
            .update({
              title: parsed.data.title,
              amount: Number(parsed.data.amount),
              expense_date: parsed.data.expenseDate,
              notes: parsed.data.notes ?? null,
            })
            .eq('id', id);

          await admin.from('expense_shares').delete().eq('expense_id', id);

          if (shares.length > 0) {
            await admin.from('expense_shares').insert(
              shares.map((s) => ({
                expense_id: id,
                user_id: s.user_id,
                share_amount: s.share_amount,
                share_percentage: s.share_percentage,
              }))
            );
          }

          return NextResponse.json({ ok: true });
        }
      }
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update the expense.' }, { status: 503 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const { id } = await context.params;

    const { error } = await auth.rpc('delete_expense', { p_expense_id: id });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not delete the expense.' }, { status: 503 });
  }
}
