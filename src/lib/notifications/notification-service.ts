'use client';

import type { SubscribeRequestPayload } from './types';

/**
 * Converts a base64 string to a Uint8Array for applicationServerKey
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks whether the current browser supports Web Push and Service Workers.
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Detects if the current device is running iOS / iPadOS.
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Checks if the web app is running as an installed standalone PWA.
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandaloneSafari = (window.navigator as unknown as { standalone?: boolean }).standalone;
  const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
  return Boolean(isStandaloneSafari || isStandaloneMatch);
}

/**
 * Detects approximate device category
 */
export function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown';
  const ua = window.navigator.userAgent;
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  return 'desktop';
}

/**
 * Returns the current notification permission or 'unsupported'.
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Ensures the service worker is registered and returns the registration.
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    let registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
    // Wait until ready
    return await navigator.serviceWorker.ready;
  } catch (err) {
    console.error('[NotificationService] Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Retrieves the current PushSubscription, if one exists on this browser.
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await getServiceWorkerRegistration();
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.error('[NotificationService] Error getting current push subscription:', err);
    return null;
  }
}

/**
 * Retrieves the VAPID public key, checking build-time env var, dynamic runtime API, or fallback.
 */
export async function getVapidPublicKey(): Promise<string> {
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  }
  try {
    const res = await fetch('/api/notifications/vapid-key');
    if (res.ok) {
      const data = (await res.json()) as { publicKey?: string };
      if (data.publicKey) return data.publicKey;
    }
  } catch (err) {
    console.warn('[NotificationService] Dynamic VAPID key fetch failed:', err);
  }
  return 'BJadHF5Gj_lMrh_6DeqHiXVdnF8ui-wKfpmb_BYgx5ygfWAg5f3mWskvmoCbSYDn25hjyVoEnfcwZoB08L87G7Y';
}

/**
 * Requests permission and subscribes the browser to push notifications.
 */
export async function subscribeToPushNotifications(
  householdId?: string | null
): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    if (isIOS() && !isStandalone()) {
      return {
        success: false,
        error: 'On iPhone and iPad, push notifications require adding this app to your Home Screen first.',
      };
    }
    return { success: false, error: 'Push notifications are not supported in this browser.' };
  }

  const vapidPublicKey = await getVapidPublicKey();
  if (!vapidPublicKey) {
    return { success: false, error: 'Web Push is not configured on the server (missing public key).' };
  }

  try {
    // 1. Request browser permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      if (permission === 'denied') {
        return {
          success: false,
          error: 'Notification permission was denied. You can enable it in your browser site settings.',
        };
      }
      return { success: false, error: 'Notification permission request was dismissed.' };
    }

    // 2. Get SW registration
    const reg = await getServiceWorkerRegistration();
    if (!reg) {
      return { success: false, error: 'Service worker is not active on this device.' };
    }

    // 3. Subscribe with PushManager
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
    }

    // 4. Extract keys and send to backend
    const rawKeys = subscription.toJSON().keys;
    if (!rawKeys?.p256dh || !rawKeys?.auth) {
      return { success: false, error: 'Failed to extract push encryption keys from browser.' };
    }

    const payload: SubscribeRequestPayload = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: rawKeys.p256dh,
        auth: rawKeys.auth,
      },
      householdId: householdId || null,
      deviceType: getDeviceType(),
      userAgent: window.navigator.userAgent,
    };

    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { success: false, error: body.error || 'Failed to register subscription on server.' };
    }

    return { success: true };
  } catch (error) {
    console.error('[NotificationService] Subscribe failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred while subscribing.',
    };
  }
}

/**
 * Unsubscribes the current device from push notifications.
 */
export async function unsubscribeFromPushNotifications(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: true };
  }

  try {
    const reg = await getServiceWorkerRegistration();
    if (!reg) return { success: true };

    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      // 1. Notify backend to remove this device
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch((err) => console.warn('[NotificationService] Backend unsubscribe call failed:', err));

      // 2. Unsubscribe browser pushManager
      await subscription.unsubscribe();
    }

    return { success: true };
  } catch (error) {
    console.error('[NotificationService] Unsubscribe failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred while unsubscribing.',
    };
  }
}
