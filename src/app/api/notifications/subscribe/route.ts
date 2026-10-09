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

    const admin = createAdminClient();
    const now = new Date().toISOString();

    // 1. Resolve active household_id if not provided, ensuring compatibility with not-null constraints
    let resolvedHouseholdId = householdId || null;
    if (!resolvedHouseholdId) {
      const { data: membership } = await admin
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (membership?.household_id) {
        resolvedHouseholdId = membership.household_id;
      }
    }

    // 2. Fetch existing category preferences to inherit
    const { data: userPref } = await admin
      .from('push_subscriptions')
      .select('expense_enabled, cat_enabled, reminder_enabled, payment_enabled')
      .eq('user_id', user.id)
      .eq('endpoint', 'preferences')
      .maybeSingle();

    const baseRow: Record<string, unknown> = {
      user_id: user.id,
      household_id: resolvedHouseholdId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      is_active: true,
      expense_enabled: userPref ? Boolean(userPref.expense_enabled) : true,
      cat_enabled: userPref ? Boolean(userPref.cat_enabled) : true,
      reminder_enabled: userPref ? Boolean(userPref.reminder_enabled) : true,
      payment_enabled: userPref ? Boolean(userPref.payment_enabled) : true,
      updated_at: now,
    };

    const extendedRow: Record<string, unknown> = {
      ...baseRow,
      user_agent: userAgent || null,
      device_type: deviceType || null,
      last_used_at: now,
    };

    const { data: existing } = await admin
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', endpoint)
      .maybeSingle();

    if (existing) {
      // Attempt update with extended columns; fallback to base columns if columns don't exist yet
      let updateRes = await admin
        .from('push_subscriptions')
        .update(extendedRow as any)
        .eq('id', existing.id);

      if (updateRes.error && (updateRes.error.code === 'PGRST204' || updateRes.error.message.includes('column'))) {
        updateRes = await admin
          .from('push_subscriptions')
          .update(baseRow as any)
          .eq('id', existing.id);
      }

      if (updateRes.error) {
        console.error('[API/subscribe] Error updating subscription:', updateRes.error.message);
        return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, id: existing.id, updated: true }, { status: 200 });
    } else {
      // Attempt insert with extended columns; fallback to base columns if columns don't exist yet
      let insertRes = await admin
        .from('push_subscriptions')
        .insert({ ...extendedRow, created_at: now } as any)
        .select('id')
        .single();

      if (insertRes.error && (insertRes.error.code === 'PGRST204' || insertRes.error.message.includes('column'))) {
        insertRes = await admin
          .from('push_subscriptions')
          .insert({ ...baseRow, created_at: now } as any)
          .select('id')
          .single();
      }

      if (insertRes.error) {
        console.error('[API/subscribe] Error inserting subscription:', insertRes.error.message);
        return NextResponse.json({ error: insertRes.error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, id: insertRes.data?.id, created: true }, { status: 201 });
    }
  } catch (error) {
    console.error('[API/subscribe] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
