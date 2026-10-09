export type NotificationCategory = 'expense' | 'cat' | 'reminder' | 'payment' | 'general';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  tag?: string;
  renotify?: boolean;
  silent?: boolean;
  requireInteraction?: boolean;
  data?: Record<string, unknown> & {
    type?: string;
    id?: string;
    url?: string;
  };
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface SubscribeRequestPayload {
  endpoint: string;
  keys: PushSubscriptionKeys;
  householdId?: string | null;
  userAgent?: string;
  deviceType?: string;
}

export interface UnsubscribeRequestPayload {
  endpoint: string;
}

export interface PushSendResult {
  total: number;
  sent: number;
  failed: number;
  removed: number;
}
