import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { paymentSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const parsed = paymentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid payment.' }, { status: 400 });
    }
    const input = parsed.data;

    const { data: paymentId, error } = await auth.rpc('record_payment', {
      p_household_id: input.householdId,
      p_to_user: input.toUser,
      p_amount: Number(input.amount),
      p_payment_method: input.paymentMethod,
      p_payment_date: input.paymentDate,
      p_notes: input.notes ?? undefined,
    });

    if (error) throw error;
    return NextResponse.json({ data: { id: paymentId } }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not record payment.' },
      { status: 503 }
    );
  }
}
