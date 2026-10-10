import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// UPI format: e.g. name@bank, phone@paytm, user.name@okhdfcbank
const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/;

export async function POST(request: NextRequest) {
  try {
    const auth = await createClient();
    const {
      data: { user },
      error: authError,
    } = await auth.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { upiId?: string };
    const rawUpi = (body.upiId ?? '').trim();

    if (rawUpi.length > 0 && !UPI_REGEX.test(rawUpi)) {
      return NextResponse.json(
        { error: 'Invalid UPI ID format. Example: yourname@oksbi or 9876543210@paytm' },
        { status: 400 }
      );
    }

    const cleanUpi = rawUpi.length > 0 ? rawUpi : null;

    // 1. Update user metadata for immediate persistence
    try {
      await auth.auth.updateUser({
        data: { upi_id: cleanUpi },
      });
    } catch {
      // Non-blocking fallback
    }

    // 2. Update profiles table using privileged admin client (reliable & direct)
    const admin = createAdminClient();
    const { error: adminError } = await admin
      .from('profiles')
      .update({ upi_id: cleanUpi, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (adminError) {
      console.error('[Profile/UPI] Admin update error:', adminError);

      // Fallback: try authenticated client
      const { error: userError } = await auth
        .from('profiles')
        .update({ upi_id: cleanUpi, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (userError) {
        console.error('[Profile/UPI] User update error:', userError);
        return NextResponse.json(
          { error: userError.message || adminError.message || 'Could not update profile.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ data: { upiId: cleanUpi } }, { status: 200 });
  } catch (error) {
    console.error('[Profile/UPI] Unexpected error:', error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Could not save UPI ID.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
