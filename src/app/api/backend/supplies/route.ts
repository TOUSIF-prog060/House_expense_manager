import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdForUser } from '@/lib/backend/read-models';

export async function GET(request: NextRequest) {
  try {
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    let householdId = searchParams.get('householdId');

    if (!householdId) {
      const householdData = await getHouseholdForUser(user.id);
      if (!householdData.household) {
        return NextResponse.json({ error: 'No active household.' }, { status: 404 });
      }
      householdId = householdData.household.id;
    }

    const { data: supplies, error } = await auth
      .from('supplies')
      .select('*')
      .eq('household_id', householdId)
      .order('is_purchased', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: supplies ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch supplies.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const body = await request.json();
    const { householdId, name, quantity, category, notes } = body;

    if (!householdId || typeof householdId !== 'string') {
      return NextResponse.json({ error: 'Household ID is required.' }, { status: 400 });
    }

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName || trimmedName.length > 120) {
      return NextResponse.json({ error: 'Item name must be between 1 and 120 characters.' }, { status: 400 });
    }

    const { data: membership } = await auth
      .from('household_members')
      .select('id, role')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Household access denied.' }, { status: 403 });
    }

    const newSupply = {
      household_id: householdId,
      name: trimmedName,
      quantity: typeof quantity === 'string' && quantity.trim() ? quantity.trim() : null,
      category: typeof category === 'string' && category.trim() ? category.trim() : 'Groceries',
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
      is_purchased: false,
      added_by: user.id,
    };

    const { data: inserted, error: insertError } = await auth
      .from('supplies')
      .insert(newSupply)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ data: inserted }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add supply item.' },
      { status: 500 }
    );
  }
}
