import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({ name: z.string().trim().min(1).max(80), timezone: z.string().default('Asia/Kolkata') });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid household.' }, { status: 400 });
    const { data, error } = await supabase.rpc('create_household', { p_name: parsed.data.name, p_timezone: parsed.data.timezone });
    if (error) throw error;
    return NextResponse.json({ data: { id: data } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create the household.' }, { status: 503 });
  }
}
