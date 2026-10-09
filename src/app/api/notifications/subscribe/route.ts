import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const subscribeSchema = z.object({
  endpoint: z.string().url('Invalid push endpoint URL'),
  keys: z.object({
    p256dh: z.string().min(1, 'Missing p256dh key'),
    auth: z.string().min(1, 'Missing auth key'),
  }),
  householdId: z.string().uuid().nullable().optional(),
  userAgent: z.string().optional(),
  deviceType: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid subscription payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { endpoint, keys, householdId, userAgent, deviceType } = parsed.data;

    // Use admin client to reliably upsert subscription across device updates
    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { data: existing } = await admin
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', endpoint)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await admin
        .from('push_subscriptions')
        .update({
          user_id: user.id,
          household_id: householdId || null,
          p256dh: keys.p256dh,
          auth: keys.auth,
          is_active: true,
          user_agent: userAgent || null,
          device_type: deviceType || null,
          updated_at: now,
          last_used_at: now,
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('[API/subscribe] Error updating subscription:', updateError.message);
        return NextResponse.json({ error: 'Could not update subscription' }, { status: 500 });
      }

      return NextResponse.json({ ok: true, id: existing.id, updated: true }, { status: 200 });
    } else {
      // Inherit existing notification preferences if set
      const { data: userPref } = await admin
        .from('push_subscriptions')
        .select('expense_enabled, cat_enabled, reminder_enabled, payment_enabled')
        .eq('user_id', user.id)
        .eq('endpoint', 'preferences')
        .maybeSingle();

      const { data: inserted, error: insertError } = await admin
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          household_id: householdId || null,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          is_active: true,
          expense_enabled: userPref ? Boolean(userPref.expense_enabled) : true,
          cat_enabled: userPref ? Boolean(userPref.cat_enabled) : true,
          reminder_enabled: userPref ? Boolean(userPref.reminder_enabled) : true,
          payment_enabled: userPref ? Boolean(userPref.payment_enabled) : true,
          user_agent: userAgent || null,
          device_type: deviceType || null,
          created_at: now,
          updated_at: now,
          last_used_at: now,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[API/subscribe] Error inserting subscription:', insertError.message);
        return NextResponse.json({ error: 'Could not save subscription' }, { status: 500 });
      }

      return NextResponse.json({ ok: true, id: inserted.id, created: true }, { status: 201 });
    }
  } catch (error) {
    console.error('[API/subscribe] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
