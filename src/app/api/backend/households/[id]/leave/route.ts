import { NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const { id } = await context.params;
    const { error } = await supabase.rpc('leave_household', { p_household_id: id });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not leave household.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
