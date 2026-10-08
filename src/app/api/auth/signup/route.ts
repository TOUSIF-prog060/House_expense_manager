import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Create user with email_confirm: true so no rate-limited confirmation email is required
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: typeof name === 'string' ? name.trim() : '',
      },
    });

    if (error) {
      // If user already exists, check if unconfirmed and confirm them
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        const { data: users } = await admin.auth.admin.listUsers();
        const existing = users?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (existing) {
          // Confirm the existing account and update credentials
          await admin.auth.admin.updateUserById(existing.id, {
            password,
            email_confirm: true,
            user_metadata: {
              ...(existing.user_metadata || {}),
              display_name: typeof name === 'string' ? name.trim() : existing.user_metadata?.display_name,
            },
          });
          return NextResponse.json({ success: true, message: 'Account confirmed. Signing in...' });
        }
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
