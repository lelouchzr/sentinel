import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireUser } from '@/server/auth/require-user';
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createUserSupabase: async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }),
}));
const id = '11111111-1111-4111-8111-111111111111';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({
    data: { user: { id, email: 'owner@example.test' } },
    error: null,
  });
  const chain = { select: mocks.select, eq: mocks.eq, maybeSingle: mocks.maybeSingle };
  mocks.from.mockReturnValue(chain);
  mocks.select.mockReturnValue(chain);
  mocks.eq.mockReturnValue(chain);
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
});
describe('verified account state', () => {
  it('takes identity only from verified Auth and scopes deletion state to it', async () => {
    const user = await requireUser(
      new Request('http://localhost:3000', { headers: { 'X-User-Id': 'forged' } }),
    );
    expect(user).toEqual({ id, email: 'owner@example.test' });
    expect(mocks.eq).toHaveBeenCalledWith('owner_id', id);
  });
  it('rejects missing or invalid Auth before querying private data', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid token' } });
    await expect(requireUser()).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('blocks normal work during account deletion but permits deletion recovery explicitly', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { owner_id: id }, error: null });
    await expect(requireUser()).rejects.toMatchObject({ code: 'ACCOUNT_DELETING', status: 409 });
    mocks.from.mockClear();
    await expect(requireUser(undefined, { allowDeleting: true })).resolves.toMatchObject({ id });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('fails closed if the required privacy migration is unavailable', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: 'relation missing' } });
    await expect(requireUser()).rejects.toMatchObject({ code: 'SCHEMA_NOT_READY', status: 503 });
  });
});
