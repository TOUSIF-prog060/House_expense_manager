import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStore } from '@/lib/backend/google-sheets';

export async function POST() {
  try {
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    await getStore().initialize();
    return NextResponse.json({ ok: true, message: 'Expense Manager tabs are ready in the configured workbook.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not initialize Google Sheets.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
