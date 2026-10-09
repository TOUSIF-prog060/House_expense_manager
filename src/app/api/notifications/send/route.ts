import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushNotification, sendHouseholdPushNotification } from '@/lib/notifications/push-service';
import type { NotificationCategory } from '@/lib/notifications/types';

const sendSchema = z.object({
  userId: z.string().uuid().optional(),
  householdId: z.string().uuid().optional(),
  category: z.enum(['expense', 'cat', 'reminder', 'payment', 'general']).optional(),
  excludeSender: z.boolean().optional().default(true),
  payload: z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    icon: z.string().optional(),
    badge: z.string().optional(),
    image: z.string().optional(),
    url: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    let isAuthorized = false;
    let callingUserId: string | null = null;

    // 1. Check if caller provides internal server secret bearer token
    if (secretKey && authHeader === `Bearer ${secretKey}`) {
      isAuthorized = true;
    }

    // 2. Otherwise check session auth and authorization
    if (!isAuthorized) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      callingUserId = user.id;
    }

    const body = await request.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid notification payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId, householdId, category, excludeSender, payload } = parsed.data;

    if (!userId && !householdId) {
      return NextResponse.json(
        { error: 'Either userId or householdId must be specified' },
        { status: 400 }
      );
    }

    // If caller is an authenticated user (not service-token), ensure they belong to the household
    if (callingUserId && householdId) {
      const admin = createAdminClient();
      const { data: member } = await admin
        .from('household_members')
        .select('role')
        .eq('household_id', householdId)
        .eq('user_id', callingUserId)
        .eq('status', 'active')
        .maybeSingle();

      if (!member) {
        return NextResponse.json({ error: 'Forbidden: not a household member' }, { status: 403 });
      }
    }

    // If sending to a specific user, ensure caller is that user or has server role
    if (callingUserId && userId && userId !== callingUserId && !householdId) {
      return NextResponse.json({ error: 'Forbidden to send to other users' }, { status: 403 });
    }

    let result;
    if (householdId) {
      result = await sendHouseholdPushNotification(
        householdId,
        payload,
        category as NotificationCategory | undefined,
        excludeSender && callingUserId ? callingUserId : undefined
      );
    } else if (userId) {
      result = await sendPushNotification(
        userId,
        payload,
        category as NotificationCategory | undefined
      );
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('[API/send] Error dispatching push notification:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
