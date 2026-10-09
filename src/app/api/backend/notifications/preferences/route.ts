import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  householdId: z.string().uuid(),
  key: z.enum(['expense_enabled', 'cat_enabled', 'reminder_enabled', 'payment_enabled']),
  value: z.boolean(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const householdId = request.nextUrl.searchParams.get('householdId');
    if (!householdId) return NextResponse.json({ error: 'Household required.' }, { status: 400 });

    const { data: membership } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) return NextResponse.json({ error: 'Household access denied.' }, { status: 403 });

    const { data: saved } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('household_id', householdId)
      .eq('endpoint', 'preferences')
      .maybeSingle();

    return NextResponse.json({
      data: {
        expense_enabled: saved ? Boolean(saved.expense_enabled) : true,
        cat_enabled: saved ? Boolean(saved.cat_enabled) : true,
        reminder_enabled: saved ? Boolean(saved.reminder_enabled) : true,
        payment_enabled: saved ? Boolean(saved.payment_enabled) : true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load preferences.' },
      { status: 503 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid preference.' }, { status: 400 });

    const { householdId, key, value } = parsed.data;

    const { data: membership } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) return NextResponse.json({ error: 'Household access denied.' }, { status: 403 });

    const { data: saved } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('household_id', householdId)
      .eq('endpoint', 'preferences')
      .maybeSingle();

    const now = new Date().toISOString();
    const updates: {
      expense_enabled?: boolean;
      cat_enabled?: boolean;
      reminder_enabled?: boolean;
      payment_enabled?: boolean;
      updated_at: string;
    } = { updated_at: now };
    if (key === 'expense_enabled') updates.expense_enabled = value;
    if (key === 'cat_enabled') updates.cat_enabled = value;
    if (key === 'reminder_enabled') updates.reminder_enabled = value;
    if (key === 'payment_enabled') updates.payment_enabled = value;

    if (saved) {
      await supabase
        .from('push_subscriptions')
        .update(updates)
        .eq('id', saved.id);
    } else {
      await supabase
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          household_id: householdId,
          endpoint: 'preferences',
          p256dh: '',
          auth: '',
          is_active: false,
          expense_enabled: key === 'expense_enabled' ? value : true,
          cat_enabled: key === 'cat_enabled' ? value : true,
          reminder_enabled: key === 'reminder_enabled' ? value : true,
          payment_enabled: key === 'payment_enabled' ? value : true,
          created_at: now,
          updated_at: now,
        });
    }

    // Also synchronize this preference to all active device push subscriptions for this user
    await supabase
      .from('push_subscriptions')
      .update(updates)
      .eq('user_id', user.id)
      .neq('endpoint', 'preferences');

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not save preference.' },
      { status: 503 }
    );
  }
}
