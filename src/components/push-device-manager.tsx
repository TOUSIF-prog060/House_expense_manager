'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle2, AlertTriangle, Send, Smartphone } from 'lucide-react';
import {
  isPushSupported,
  getNotificationPermission,
  getCurrentSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isIOS,
  isStandalone,
} from '@/lib/notifications/notification-service';

interface PushDeviceManagerProps {
  householdId: string | null;
}

export function PushDeviceManager({ householdId }: PushDeviceManagerProps) {
  const [supported, setSupported] = useState<boolean>(true);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [testing, setTesting] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [iosNeedsPwa, setIosNeedsPwa] = useState<boolean>(false);

  useEffect(() => {
    async function checkState() {
      const isSupp = isPushSupported();
      setSupported(isSupp);

      if (!isSupp) {
        if (isIOS() && !isStandalone()) {
          setIosNeedsPwa(true);
        }
        setLoading(false);
        return;
      }

      const currentPerm = getNotificationPermission();
      setPermission(currentPerm);

      const sub = await getCurrentSubscription();
      if (sub && currentPerm === 'granted') {
        // Automatically ensure existing browser subscription is registered in backend
        const syncResult = await subscribeToPushNotifications(householdId);
        setIsSubscribed(syncResult.success);
      } else {
        setIsSubscribed(false);
      }
      setLoading(false);
    }

    void checkState();
  }, [householdId]);

  async function handleEnable() {
    setLoading(true);
    setMessage(null);

    const result = await subscribeToPushNotifications(householdId);
    if (result.success) {
      setIsSubscribed(true);
      setPermission('granted');
      setMessageType('success');
      setMessage('Push notifications are now enabled on this device.');
    } else {
      setIsSubscribed(false);
      setMessageType('error');
      setMessage(result.error || 'Could not enable notifications.');
      setPermission(getNotificationPermission());
    }

    setLoading(false);
  }

  async function handleDisable() {
    setLoading(true);
    setMessage(null);

    const result = await unsubscribeFromPushNotifications();
    if (result.success) {
      setIsSubscribed(false);
      setMessageType('info');
      setMessage('Push notifications disabled for this device.');
    } else {
      setMessageType('error');
      setMessage(result.error || 'Could not disable notifications.');
    }

    setLoading(false);
  }

  async function handleTest() {
    setTesting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; message?: string };

      if (response.ok && data.ok) {
        setMessageType('success');
        setMessage(data.message || 'Test notification sent! Check your device.');
      } else {
        setMessageType('error');
        setMessage(data.error || 'Could not send test notification.');
      }
    } catch {
      setMessageType('error');
      setMessage('Network error while requesting test notification.');
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="settings-card notification-push-card" style={{ marginTop: '16px' }}>
      <span className="side-eyebrow">DEVICE PUSH DELIVERY</span>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '4px 0' }}>Push Notifications</h2>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--muted)' }}>
            Receive important household updates directly on your device even when this tab is closed.
          </p>
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: '13.5px', color: 'var(--muted)', marginTop: '16px' }}>
          Checking device notification status…
        </p>
      ) : iosNeedsPwa ? (
        <div
          style={{
            marginTop: '16px',
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'var(--orange-light)',
            border: '1px solid color-mix(in srgb, var(--orange) 30%, transparent)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            fontSize: '13.5px',
          }}
        >
          <Smartphone size={20} style={{ color: 'var(--orange)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ display: 'block', color: 'var(--ink)' }}>iOS Web Push Requirement</strong>
            <span style={{ color: 'var(--ink)', opacity: 0.9 }}>
              On iPhone and iPad, Apple requires installing the web app to receive push notifications.
              Tap the <b>Share button</b> in Safari, then select <b>Add to Home Screen</b>.
            </span>
          </div>
        </div>
      ) : !supported ? (
        <div
          style={{
            marginTop: '16px',
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'color-mix(in srgb, var(--ink) 4%, transparent)',
            border: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13.5px',
          }}
        >
          <BellOff size={18} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <span>Notifications aren’t available in this browser.</span>
        </div>
      ) : permission === 'denied' ? (
        <div
          style={{
            marginTop: '16px',
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'color-mix(in srgb, var(--red) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--red) 25%, transparent)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            fontSize: '13.5px',
          }}
        >
          <AlertTriangle size={18} style={{ color: 'var(--red)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ display: 'block', color: 'var(--red)' }}>Permission Blocked</strong>
            <span style={{ color: 'var(--ink)' }}>
              Notification permission was denied. You can re-enable it from your browser’s site settings.
            </span>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '18px' }}>
          {isSubscribed ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--green-ink)',
                  background: 'var(--green-light)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  width: 'fit-content',
                }}
              >
                <CheckCircle2 size={16} />
                <span>Push notifications enabled on this device</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => void handleDisable()}
                  disabled={loading || testing}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--line)',
                    background: 'var(--paper)',
                    color: 'var(--ink)',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <BellOff size={15} />
                  Disable notifications
                </button>

                <button
                  type="button"
                  onClick={() => void handleTest()}
                  disabled={loading || testing}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid transparent',
                    background: 'var(--green)',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Send size={15} />
                  {testing ? 'Sending test…' : 'Send test notification'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => void handleEnable()}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--green)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                }}
              >
                <Bell size={16} />
                Enable notifications
              </button>
            </div>
          )}
        </div>
      )}

      {message && (
        <p
          className="settings-message"
          role="status"
          style={{
            marginTop: '14px',
            color: messageType === 'error' ? 'var(--red)' : messageType === 'success' ? 'var(--green-ink)' : 'var(--muted)',
          }}
        >
          {message}
        </p>
      )}
    </section>
  );
}
