import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/notifications/push-service';
import { isVapidConfigured } from '@/lib/notifications/vapid';

export async function POST() {
  try {
    if (!isVapidConfigured()) {
      return NextResponse.json(
        { error: 'VAPID configuration is missing on the server.' },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const result = await sendPushNotification(user.id, {
      title: 'Notifications are working 🎉',
      body: 'Your push notification system is successfully configured.',
      url: '/settings/notifications',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon.svg',
      data: {
        type: 'test_notification',
        timestamp: Date.now(),
      },
    });

    if (result.total === 0) {
      return NextResponse.json(
        {
          error:
            'No active push subscriptions found for this account. Please enable push notifications on this device first.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      result,
      message: `Sent test notification to ${result.sent} of ${result.total} device(s).`,
    });
  } catch (error) {
    console.error('[API/test] Error sending test notification:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send test notification' },
      { status: 500 }
    );
  }
}
