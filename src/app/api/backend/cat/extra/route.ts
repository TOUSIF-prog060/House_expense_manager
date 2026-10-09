import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendHouseholdPushNotification } from '@/lib/notifications/push-service';

const schema = z.object({ householdId: z.string().uuid(), note: z.string().max(500).optional() });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid feeding.' }, { status: 400 });

    const { data, error } = await supabase.rpc('record_extra_feeding', { p_household_id: parsed.data.householdId, p_note: parsed.data.note ?? undefined });

    if (error) {
      if (error.code === '42501' || error.message.includes('row-level security')) {
        const { data: member } = await supabase
          .from('household_members')
          .select('id')
          .eq('household_id', parsed.data.householdId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (!member) {
          return NextResponse.json({ error: 'Household access denied' }, { status: 403 });
        }

        const admin = createAdminClient();
        const { data: household } = await admin
          .from('households')
          .select('timezone')
          .eq('id', parsed.data.householdId)
          .maybeSingle();

        const today = new Intl.DateTimeFormat('en-CA', {
          timeZone: household?.timezone || 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());

        const { data: feedData, error: feedError } = await admin
          .from('cat_feedings')
          .insert({
            household_id: parsed.data.householdId,
            feeding_date: today,
            fed_by: user.id,
            note: parsed.data.note ?? null,
            feeding_type: 'extra',
          })
          .select()
          .single();

        if (feedError) {
          return NextResponse.json({ error: feedError.message }, { status: 400 });
        }

        await admin.from('activity_events').insert({
          household_id: parsed.data.householdId,
          actor: user.id,
          event_type: 'cat.extra_fed',
          entity_type: 'cat_feeding',
          entity_id: feedData.id,
        });

        void notifyExtraFed(parsed.data.householdId, user.id, parsed.data.note);

        return NextResponse.json({ data: feedData }, { status: 201 });
      }

      console.error('record_extra_feeding RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    void notifyExtraFed(parsed.data.householdId, user.id, parsed.data.note);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : (typeof error === 'object' && error && 'message' in error ? String((error as { message?: unknown }).message) : 'Could not record the extra feeding.');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function notifyExtraFed(householdId: string, actorId: string, note?: string | null) {
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('display_name').eq('id', actorId).maybeSingle();
    const userName = profile?.display_name || 'A housemate';
    const noteText = note ? ` ("${note}")` : '';

    await sendHouseholdPushNotification(
      householdId,
      {
        title: 'Extra Cat Care 🐱',
        body: `${userName} recorded an extra feeding/treat${noteText}.`,
        url: '/cat',
        tag: 'cat-feeding-extra',
        data: {
          type: 'cat_extra_feeding',
        },
      },
      'cat',
      actorId
    );
  } catch (err) {
    console.error('[Push/CatExtra] Dispatch error:', err);
  }
}
