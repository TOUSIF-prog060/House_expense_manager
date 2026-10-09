import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { getUser, mockAdmin } = vi.hoisted(() => {
  const admin = {
    from: vi.fn(),
  };
  return {
    getUser: vi.fn(),
    mockAdmin: admin,
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockAdmin,
}));

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }),
  },
}));

import { POST as subscribeHandler } from '../src/app/api/notifications/subscribe/route';
import { POST as unsubscribeHandler } from '../src/app/api/notifications/unsubscribe/route';
import { POST as testHandler } from '../src/app/api/notifications/test/route';
import { GET as vapidKeyHandler } from '../src/app/api/notifications/vapid-key/route';
import { urlBase64ToUint8Array } from '../src/lib/notifications/notification-service';

describe('Web Push Notification System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'BJadHF5Gj_lMrh_6DeqHiXVdnF8ui-wKfpmb_BYgx5ygfWAg5f3mWskvmoCbSYDn25hjyVoEnfcwZoB08L87G7Y';
    process.env.VAPID_PRIVATE_KEY = 'test_private_key';
    process.env.VAPID_SUBJECT = 'mailto:test@example.com';
  });

  describe('POST /api/notifications/subscribe', () => {
    it('rejects unauthenticated requests', async () => {
      getUser.mockResolvedValue({ data: { user: null } });
      const req = new NextRequest('http://localhost/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: 'https://fcm.googleapis.com/fcm/send/sample-123',
          keys: { p256dh: 'dummy-p256dh', auth: 'dummy-auth' },
        }),
      });

      const res = await subscribeHandler(req);
      expect(res.status).toBe(401);
    });

    it('rejects invalid subscription payloads', async () => {
      getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const req = new NextRequest('http://localhost/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: 'not-a-valid-url',
        }),
      });

      const res = await subscribeHandler(req);
      expect(res.status).toBe(400);
    });

    it('saves a valid subscription for the authenticated user', async () => {
      getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'sub-1' }, error: null }),
      };

      mockAdmin.from.mockReturnValue(mockQueryBuilder);

      const req = new NextRequest('http://localhost/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: 'https://fcm.googleapis.com/fcm/send/sample-123',
          keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
          deviceType: 'mobile',
        }),
      });

      const res = await subscribeHandler(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toMatchObject({ ok: true, created: true, id: 'sub-1' });
    });
  });

  describe('POST /api/notifications/unsubscribe', () => {
    it('rejects unauthenticated requests', async () => {
      getUser.mockResolvedValue({ data: { user: null } });
      const req = new NextRequest('http://localhost/api/notifications/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: 'https://fcm.googleapis.com/fcm/send/sample-123',
        }),
      });

      const res = await unsubscribeHandler(req);
      expect(res.status).toBe(401);
    });

    it('deletes the subscription matching the user and endpoint', async () => {
      getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

      const mockDeleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      // eq is called twice: eq('user_id', user.id).eq('endpoint', endpoint)
      mockDeleteBuilder.eq.mockReturnValueOnce(mockDeleteBuilder).mockResolvedValueOnce({ error: null });

      mockAdmin.from.mockReturnValue(mockDeleteBuilder);

      const req = new NextRequest('http://localhost/api/notifications/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: 'https://fcm.googleapis.com/fcm/send/sample-123',
        }),
      });

      const res = await unsubscribeHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toMatchObject({ ok: true });
    });
  });

  describe('POST /api/notifications/test', () => {
    it('rejects unauthenticated requests', async () => {
      getUser.mockResolvedValue({ data: { user: null } });
      const res = await testHandler();
      expect(res.status).toBe(401);
    });

    it('returns error if user has no registered subscriptions', async () => {
      getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockAdmin.from.mockReturnValue(mockQueryBuilder);

      const res = await testHandler();
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('No active push subscriptions found');
    });
  });

  describe('GET /api/notifications/vapid-key', () => {
    it('returns the VAPID public key successfully', async () => {
      const res = await vapidKeyHandler();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('publicKey');
      expect(data.publicKey.length).toBeGreaterThan(10);
    });
  });

  describe('urlBase64ToUint8Array utility', () => {
    it('properly converts base64url string to Uint8Array', () => {
      // Mock window.atob in node environment if needed
      if (typeof window === 'undefined') {
        globalThis.window = {
          atob: (str: string) => Buffer.from(str, 'base64').toString('binary'),
        } as unknown as Window & typeof globalThis;
      }

      const input = 'BJadHF5Gj_lMrh_6DeqHiXVdnF8ui-wKfpmb_BYgx5ygfWAg5f3mWskvmoCbSYDn25hjyVoEnfcwZoB08L87G7Y';
      const arr = urlBase64ToUint8Array(input);
      expect(arr).toBeInstanceOf(Uint8Array);
      expect(arr.length).toBeGreaterThan(0);
    });
  });
});
