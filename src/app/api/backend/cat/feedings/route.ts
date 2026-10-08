import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { feedingSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const parsed = feedingSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid feeding.' }, { status: 400 });
    const input = parsed.data;

    // First attempt PostgreSQL RPC
    const { data, error } = await supabase.rpc('mark_cat_fed', {
      p_household_id: input.householdId,
      p_meal_slot_id: input.mealSlotId,
      p_feeding_date: input.feedingDate,
      p_note: input.note ?? undefined,
    });

    if (error?.code === '23505' || error?.message?.includes('CAT_ALREADY_FED') || error?.message?.includes('already been recorded')) {
      const { data: existing } = await supabase
        .from('cat_feedings')
        .select('*')
        .eq('household_id', input.householdId)
        .eq('meal_slot_id', input.mealSlotId)
        .eq('feeding_date', input.feedingDate)
        .eq('feeding_type', 'scheduled')
        .maybeSingle();

      if (existing) {
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', existing.fed_by).maybeSingle();
        return NextResponse.json({ code: 'CAT_ALREADY_FED', duplicate: true, data: existing, fedByName: profile?.display_name ?? 'A housemate' }, { status: 409 });
      }
      return NextResponse.json({ code: 'CAT_ALREADY_FED', error: 'This meal has already been recorded.' }, { status: 409 });
    }

    if (error) {
      // If RPC is blocked by RLS in current PostgreSQL state, fall back to server-validated admin write
      if (error.code === '42501' || error.message.includes('row-level security')) {
        const { data: member } = await supabase
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
        const { data: feedData, error: feedError } = await admin
          .from('cat_feedings')
          .insert({
            household_id: input.householdId,
            meal_slot_id: input.mealSlotId,
            feeding_date: input.feedingDate,
            fed_by: user.id,
            note: input.note ?? null,
            feeding_type: 'scheduled',
          })
          .select()
          .single();

        if (feedError) {
          if (feedError.code === '23505') {
            const { data: existing } = await admin
              .from('cat_feedings')
              .select('*')
              .eq('household_id', input.householdId)
              .eq('meal_slot_id', input.mealSlotId)
              .eq('feeding_date', input.feedingDate)
              .eq('feeding_type', 'scheduled')
              .maybeSingle();
            const { data: profile } = await admin
              .from('profiles')
              .select('display_name')
              .eq('id', existing?.fed_by ?? '')
              .maybeSingle();
            return NextResponse.json(
              { code: 'CAT_ALREADY_FED', duplicate: true, data: existing, fedByName: profile?.display_name ?? 'A housemate' },
              { status: 409 }
            );
          }
          return NextResponse.json({ error: feedError.message }, { status: 400 });
        }

        // Record activity audit event
        await admin.from('activity_events').insert({
          household_id: input.householdId,
          actor: user.id,
          event_type: 'cat.fed',
          entity_type: 'cat_feeding',
          entity_id: feedData.id,
          metadata: { meal_slot_id: input.mealSlotId, feeding_date: input.feedingDate },
        });

        return NextResponse.json({ data: feedData }, { status: 201 });
      }

      console.error('mark_cat_fed RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : (typeof error === 'object' && error && 'message' in error ? String((error as { message?: unknown }).message) : 'Could not record the feeding.');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
