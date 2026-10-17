import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

type SupplyUpdate = Database['public']['Tables']['supplies']['Update'];

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const { id } = await context.params;

    // Fetch existing supply item
    const { data: existing, error: fetchErr } = await auth
      .from('supplies')
      .select('id, household_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Supply item not found.' }, { status: 404 });
    }

    // Verify user is active household member
    const { data: membership } = await auth
      .from('household_members')
      .select('id')
      .eq('household_id', existing.household_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Household access denied.' }, { status: 403 });
    }

    const body = await request.json();
    const updates: SupplyUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.name === 'string') {
      const trimmed = body.name.trim();
      if (!trimmed || trimmed.length > 120) {
        return NextResponse.json({ error: 'Item name must be between 1 and 120 characters.' }, { status: 400 });
      }
      updates.name = trimmed;
    }

    if (body.quantity !== undefined) {
      updates.quantity = typeof body.quantity === 'string' && body.quantity.trim() ? body.quantity.trim() : null;
    }

    if (typeof body.category === 'string' && body.category.trim()) {
      updates.category = body.category.trim();
    }

    if (body.notes !== undefined) {
      updates.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
    }

    if (typeof body.is_purchased === 'boolean') {
      updates.is_purchased = body.is_purchased;
      if (body.is_purchased) {
        updates.purchased_by = user.id;
        updates.purchased_at = new Date().toISOString();
      } else {
        updates.purchased_by = null;
        updates.purchased_at = null;
      }
    }

    const { data: updated, error: updateErr } = await auth
      .from('supplies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update supply item.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const { id } = await context.params;

    const { data: existing, error: fetchErr } = await auth
      .from('supplies')
      .select('id, household_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Supply item not found.' }, { status: 404 });
    }

    const { data: membership } = await auth
      .from('household_members')
      .select('id')
      .eq('household_id', existing.household_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Household access denied.' }, { status: 403 });
    }

    const { error: deleteErr } = await auth
      .from('supplies')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete supply item.' },
      { status: 500 }
    );
  }
}
