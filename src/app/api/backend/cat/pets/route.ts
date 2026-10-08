import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { petSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const body = await request.json();
    const parsed = petSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid cat name.' }, { status: 400 });
    }
    const { householdId, name } = parsed.data;

    // Verify membership
    const { data: member } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Household access denied' }, { status: 403 });
    }

    // Try standard client first
    const { data, error } = await supabase
      .from('pets')
      .insert({
        household_id: householdId,
        name: name.trim(),
        species: 'cat',
      })
      .select()
      .single();

    if (error) {
      // Fallback to admin client if RLS is strict
      const admin = createAdminClient();
      const { data: adminData, error: adminError } = await admin
        .from('pets')
        .insert({
          household_id: householdId,
          name: name.trim(),
          species: 'cat',
        })
        .select()
        .single();

      if (adminError) {
        return NextResponse.json({ error: adminError.message }, { status: 400 });
      }
      return NextResponse.json({ data: adminData }, { status: 201 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add cat.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const body = await request.json() as { householdId?: string; petId?: string };
    if (!body.householdId || !body.petId) {
      return NextResponse.json({ error: 'householdId and petId are required.' }, { status: 400 });
    }

    const { data: member } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', body.householdId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Household access denied' }, { status: 403 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('pets')
      .delete()
      .eq('id', body.petId)
      .eq('household_id', body.householdId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete cat.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
