import { createAdminClient } from '@/lib/supabase/admin';
import { setupWebPush, isVapidConfigured } from './vapid';
import type { PushNotificationPayload, NotificationCategory, PushSendResult } from './types';

interface WebPushError extends Error {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: string;
}

/**
 * Sends a push notification to all active devices of a specific user.
 * Automatically de-duplicates, checks category preferences, and purges expired subscriptions (404/410).
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload,
  category?: NotificationCategory
): Promise<PushSendResult> {
  const result: PushSendResult = { total: 0, sent: 0, failed: 0, removed: 0 };

  if (!isVapidConfigured()) {
    console.warn('[PushService] Web Push VAPID is not configured. Skipping push delivery.');
    return result;
  }

  const webPush = setupWebPush();
  const admin = createAdminClient();

  // Query active subscriptions for user, ignoring dummy preference records
  let query = admin
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .neq('endpoint', 'preferences');

  if (category === 'expense') {
    query = query.eq('expense_enabled', true);
  } else if (category === 'cat') {
    query = query.eq('cat_enabled', true);
  } else if (category === 'reminder') {
    query = query.eq('reminder_enabled', true);
  } else if (category === 'payment') {
    query = query.eq('payment_enabled', true);
  }

  const { data: subscriptions, error } = await query;
  if (error) {
    console.error('[PushService] Error querying user subscriptions:', error.message);
    return result;
  }

  if (!subscriptions || subscriptions.length === 0) {
    return result;
  }

  result.total = subscriptions.length;
  const jsonPayload = JSON.stringify(payload);

  const deliveryPromises = subscriptions.map(async (sub) => {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webPush.sendNotification(pushSub, jsonPayload, {
        TTL: 60 * 60 * 24, // 24 hours
        urgency: 'high',
      });

      result.sent += 1;
      // Optionally update last_used_at timestamp if column exists
      try {
        await admin
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', sub.id);
      } catch {
        // Ignored if optional last_used_at column is not present
      }
    } catch (err: unknown) {
      const wpErr = err as WebPushError;
      const statusCode = wpErr.statusCode;

      // HTTP 404 or 410 indicates subscription has expired or unsubscribed on browser side
      if (statusCode === 404 || statusCode === 410) {
        console.info(`[PushService] Removing expired subscription (${statusCode}) for user ${userId}.`);
        await admin.from('push_subscriptions').delete().eq('id', sub.id);
        result.removed += 1;
      } else {
        result.failed += 1;
        console.error(
          `[PushService] Failed delivering notification to user ${userId}:`,
          wpErr.message || 'Unknown push error'
        );
      }
    }
  });

  await Promise.allSettled(deliveryPromises);
  return result;
}

/**
 * Sends a push notification to all active household members except the initiator.
 */
export async function sendHouseholdPushNotification(
  householdId: string,
  payload: PushNotificationPayload,
  category?: NotificationCategory,
  excludeUserId?: string
): Promise<PushSendResult> {
  const admin = createAdminClient();

  const { data: members, error } = await admin
    .from('household_members')
    .select('user_id')
    .eq('household_id', householdId)
    .eq('status', 'active');

  if (error || !members) {
    console.error('[PushService] Error querying household members:', error?.message);
    return { total: 0, sent: 0, failed: 0, removed: 0 };
  }

  const targetUsers = members
    .map((m) => m.user_id)
    .filter((id) => !excludeUserId || id !== excludeUserId);

  let totalSent = 0;
  let totalFailed = 0;
  let totalRemoved = 0;
  let totalSubs = 0;

  await Promise.allSettled(
    targetUsers.map(async (uid) => {
      const res = await sendPushNotification(uid, payload, category);
      totalSubs += res.total;
      totalSent += res.sent;
      totalFailed += res.failed;
      totalRemoved += res.removed;
    })
  );

  return {
    total: totalSubs,
    sent: totalSent,
    failed: totalFailed,
    removed: totalRemoved,
  };
}
