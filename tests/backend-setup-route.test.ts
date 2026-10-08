import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUser, initialize } = vi.hoisted(() => ({ getUser: vi.fn(), initialize: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser } }) }));
vi.mock('@/lib/backend/google-sheets', () => ({ getStore: () => ({ initialize }) }));

import { POST } from '../src/app/api/backend/setup/route';

describe('POST /api/backend/setup', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('rejects a signed-out request without touching Google Sheets', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const response = await POST();
    expect(response.status).toBe(401);
    expect(initialize).not.toHaveBeenCalled();
  });

  it('initializes the workbook for an authenticated user', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    initialize.mockResolvedValue(undefined);
    const response = await POST();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
    expect(initialize).toHaveBeenCalledOnce();
  });
});
