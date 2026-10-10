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
    } = await auth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    const body = (await request.json()) as { upiId?: string };
    const rawUpi = (body.upiId ?? '').trim();

    if (rawUpi.length > 0 && !UPI_REGEX.test(rawUpi)) {
      return NextResponse.json(
        { error: 'Invalid UPI ID format. Example: yourname@oksbi or 9876543210@paytm' },
        { status: 400 }
      );
    }

    const cleanUpi = rawUpi.length > 0 ? rawUpi : null;

    // 1. Try calling the RPC function
    let updateSuccess = false;
    try {
      const { error: rpcError } = await auth.rpc('set_my_upi_id', {
        p_upi_id: cleanUpi ?? '',
      });
      if (!rpcError) {
        updateSuccess = true;
      }
    } catch {
      // Fallback to table update
    }

    // 2. If RPC was not found, fallback to direct profile table update
    if (!updateSuccess) {
      const { error: updateError } = await auth
        .from('profiles')
        .update({ upi_id: cleanUpi })
        .eq('id', user.id);

      if (updateError) {
        // Try with admin client in case of RLS column caching
        try {
          const admin = createAdminClient();
          const { error: adminError } = await admin
            .from('profiles')
            .update({ upi_id: cleanUpi })
            .eq('id', user.id);

          if (adminError) throw adminError;
        } catch (adminErr) {
          throw updateError || adminErr;
        }
      }
    }

    return NextResponse.json({ data: { upiId: cleanUpi } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not save UPI ID.' },
      { status: 500 }
    );
  }
}
