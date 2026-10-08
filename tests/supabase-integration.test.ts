import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateShares, simplifySettlements } from '@/lib/calculations/money';
import { NextRequest } from 'next/server';

const { getUser, rpc, from } = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser },
    rpc,
    from,
  }),
}));

import { POST as catFeedingPOST } from '@/app/api/backend/cat/feedings/route';

describe('Supabase Integration & Business Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Expense Splitting & Exact Totals', () => {
    it('divides ₹100 among 3 users preserving exact total to the paisa (33.34, 33.33, 33.33)', () => {
      const participants = [{ userId: 'user-1' }, { userId: 'user-2' }, { userId: 'user-3' }];
      const shares = calculateShares('100.00', participants, 'equal');

      expect(shares['user-1']).toBe(3334);
      expect(shares['user-2']).toBe(3333);
      expect(shares['user-3']).toBe(3333);

      const totalPaise = Object.values(shares).reduce((a, b) => a + b, 0);
      expect(totalPaise).toBe(10000); // exactly ₹100.00
    });

    it('handles excluded members correctly', () => {
      const participants = [{ userId: 'user-1' }, { userId: 'user-2' }];
      const shares = calculateShares('50.00', participants, 'equal');

      expect(shares['user-1']).toBe(2500);
      expect(shares['user-2']).toBe(2500);
      expect(shares['user-3']).toBeUndefined();
    });
  });

  describe('Cat Feeding Concurrency & Duplicate Protection', () => {
    it('returns CAT_ALREADY_FED with conflicting feeder details when duplicate feeding is attempted', async () => {
      const householdId = 'e2b3c4d5-a1b2-4c3d-8e4f-0123456789ab';
      const slotId = 'f3c4d5e6-a1b2-4c3d-8e4f-0123456789cd';
      const feedingDate = '2026-10-07';

      getUser.mockResolvedValue({ data: { user: { id: 'shivam-user-id' } } });
      rpc.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'CAT_ALREADY_FED' },
      });

      const mockMaybeSingleFeeding = vi.fn().mockResolvedValue({
        data: {
          id: 'feed-123',
          household_id: householdId,
          meal_slot_id: slotId,
          feeding_date: feedingDate,
          fed_by: 'tousif-user-id',
          fed_at: '2026-10-07T07:42:00.000Z',
          feeding_type: 'scheduled',
        },
      });

      const mockMaybeSingleProfile = vi.fn().mockResolvedValue({
        data: { display_name: 'Tousif' },
      });

      from.mockImplementation((table: string) => {
        if (table === 'cat_feedings') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      maybeSingle: mockMaybeSingleFeeding,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: mockMaybeSingleProfile,
              }),
            }),
          };
        }
        return {};
      });

      const req = new NextRequest('http://localhost/api/backend/cat/feedings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          householdId,
          mealSlotId: slotId,
          feedingDate,
        }),
      });

      const res = await catFeedingPOST(req);
      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.code).toBe('CAT_ALREADY_FED');
      expect(json.duplicate).toBe(true);
      expect(json.fedByName).toBe('Tousif');
      expect(json.data.fed_at).toBe('2026-10-07T07:42:00.000Z');
    });
  });

  describe('Settlement Simplification', () => {
    it('computes minimal debt transfers between members', () => {
      const balances = [
        { userId: 'u1', name: 'Tousif', balancePaise: 4000 },
        { userId: 'u2', name: 'Shivam', balancePaise: -3000 },
        { userId: 'u3', name: 'Shailja', balancePaise: -1000 },
      ];

      const transfers = simplifySettlements(balances);
      expect(transfers).toHaveLength(2);
      expect(transfers).toEqual([
        { fromUserId: 'u2', fromName: 'Shivam', toUserId: 'u1', toName: 'Tousif', amountPaise: 3000 },
        { fromUserId: 'u3', fromName: 'Shailja', toUserId: 'u1', toName: 'Tousif', amountPaise: 1000 },
      ]);
    });
  });
});
