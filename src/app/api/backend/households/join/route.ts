import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({ code: z.string().trim().min(6).max(32) });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Enter a valid invite code.' }, { status: 400 });
    const { data, error } = await supabase.rpc('join_household', { p_code: parsed.data.code });
    if (error) throw error;
    return NextResponse.json({ data: { householdId: data } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not join the household.' }, { status: 503 });
  }
}
