import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const { id } = await context.params;
    const { data, error } = await supabase.rpc('create_household_invite', { p_household_id: id });
    if (error) throw error;
    return NextResponse.json({ data: { code: data, expires_at: new Date(Date.now() + 7 * 86400000).toISOString() } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create invite.' }, { status: 503 });
  }
}
