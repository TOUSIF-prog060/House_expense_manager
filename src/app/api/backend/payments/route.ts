import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { paymentSchema } from '@/lib/validation/schemas';
import { sendPushNotification } from '@/lib/notifications/push-service';

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

    void (async () => {
      try {
        const admin = createAdminClient();
        const { data: profile } = await admin.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
        const payerName = profile?.display_name || 'A housemate';

        await sendPushNotification(
          input.toUser,
          {
            title: 'Payment Recorded 💸',
            body: `${payerName} recorded a payment of ₹${Number(input.amount).toFixed(0)} to you.`,
            url: '/settlement',
            tag: 'payment-recorded',
            data: {
              type: 'payment_recorded',
              paymentId,
            },
          },
          'payment'
        );
      } catch (err) {
        console.error('[Push/Payment] Dispatch error:', err);
      }
    })();

    return NextResponse.json({ data: { id: paymentId } }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not record payment.' },
      { status: 503 }
    );
  }
}
