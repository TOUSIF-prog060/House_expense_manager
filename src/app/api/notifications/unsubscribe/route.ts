import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const unsubscribeSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = unsubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid endpoint specified' }, { status: 400 });
    }

    const { endpoint } = parsed.data;

    // Securely remove only the calling user's subscription for this specific endpoint
    const admin = createAdminClient();
    const { error: deleteError } = await admin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (deleteError) {
      console.error('[API/unsubscribe] Error removing subscription:', deleteError.message);
      return NextResponse.json({ error: 'Could not remove subscription' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('[API/unsubscribe] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
