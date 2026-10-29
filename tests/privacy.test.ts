import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteAccount, getUsage } from '@/server/data/account';
import { cleanupUploads, reconcileOperation } from '@/server/data/maintenance';
import { requireMaintenance } from '@/server/auth/maintenance';
import { POST as cleanupRoute } from '@/app/api/maintenance/uploads/route';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
  deleteUser: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabase: () => ({
    rpc: mocks.rpc,
    storage: { from: () => ({ list: mocks.list, remove: mocks.remove }) },
    auth: { admin: { deleteUser: mocks.deleteUser } },
  }),
  createUserSupabase: async () => ({ auth: { signOut: mocks.signOut } }),
}));
const user = '11111111-1111-4111-8111-111111111111';
beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  mocks.list.mockResolvedValue({ data: [], error: null });
  mocks.remove.mockResolvedValue({ data: [], error: null });
  mocks.deleteUser.mockResolvedValue({ data: { user: null }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
});
describe('account deletion', () => {
  it('locks the account, removes only its private objects, then deletes Auth and expires cookies', async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: [{ name: `${user}/page.jpg` }], error: null });
    await deleteAccount(user);
    expect(mocks.rpc).toHaveBeenCalledWith('begin_account_deletion', { p_owner_id: user });
    expect(mocks.rpc).toHaveBeenCalledWith('owned_vocabulary_uploads', {
      p_owner_id: user,
      p_limit: 100,
    });
    expect(mocks.remove).toHaveBeenCalledWith([`${user}/page.jpg`]);
    expect(mocks.deleteUser).toHaveBeenCalledWith(user);
    expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.remove.mock.invocationCallOrder[0]!,
    );
    expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteUser.mock.invocationCallOrder[0]!,
    );
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
  it('preserves the account when a provider request is still in flight', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'ACCOUNT_BUSY' }, data: null });
    await expect(deleteAccount(user)).rejects.toMatchObject({ code: 'ACCOUNT_BUSY', status: 409 });
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it('does not delete Auth or claim success when private file removal fails', async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: [{ name: `${user}/page.jpg` }], error: null });
    mocks.remove.mockResolvedValue({ error: { message: 'network' }, data: null });
    await expect(deleteAccount(user)).rejects.toMatchObject({ code: 'DELETE_INCOMPLETE' });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it('refuses unsafe paths without deleting anything outside the owned prefix', async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: [{ name: `${user}/../other.jpg` }], error: null });
    await expect(deleteAccount(user)).rejects.toMatchObject({ code: 'DELETE_INCOMPLETE' });
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});
describe('maintenance boundary and usage reporting', () => {
  it('requires a long dedicated server secret and rejects wrong bearer tokens', () => {
    const req = (token: string) =>
      new Request('http://localhost:3000/api/maintenance/uploads', {
        headers: { Authorization: `Bearer ${token}` },
      });
    expect(() => requireMaintenance(req(''))).toThrow('maintenance');
    vi.stubEnv('MAINTENANCE_SECRET', 'short');
    expect(() => requireMaintenance(req('short'))).toThrow('maintenance');
    vi.stubEnv('MAINTENANCE_SECRET', 's'.repeat(40));
    expect(() => requireMaintenance(req('wrong'))).toThrow('administratif');
    expect(() => requireMaintenance(req('s'.repeat(40)))).not.toThrow();
  });
  it('unauthorized maintenance never reaches Storage or the database', async () => {
    vi.stubEnv('MAINTENANCE_SECRET', 's'.repeat(40));
    const response = await cleanupRoute(
      new Request('http://localhost:3000/api/maintenance/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
    );
    expect(response.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('defaults cleanup to dry-run and deletes only the bounded server-selected batch', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ name: `${user}/old.jpg` }], error: null });
    expect(await cleanupUploads({})).toMatchObject({ dryRun: true, candidates: 1, deleted: 0 });
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(await cleanupUploads({ dryRun: false, limit: 10 })).toMatchObject({
      dryRun: false,
      deleted: 1,
    });
    expect(mocks.remove).toHaveBeenCalledWith([`${user}/old.jpg`]);
    await expect(cleanupUploads({ limit: 1000 })).rejects.toThrow();
  });
  it('requires explicit documented reconciliation and never accepts a negative amount', async () => {
    await expect(
      reconcileOperation({
        operationId: user,
        billedUsd: -1,
        reason: 'A valid documented investigation.',
        reference: 'invoice-1',
      }),
    ).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
    await reconcileOperation({
      operationId: user,
      billedUsd: 0.02,
      reason: 'Verified billing amount after provider timeout.',
      reference: 'invoice-1',
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      'reconcile_provider_operation',
      expect.objectContaining({ p_id: user, p_billed_usd: 0.02 }),
    );
  });
  it('keeps unknown costs distinct and does not call an estimate a verified provider balance', async () => {
    mocks.rpc.mockResolvedValue({
      error: null,
      data: {
        providers: [
          {
            provider: 'meta',
            estimatedUsd: 0.03,
            heldUsd: 1,
            operationCount: 2,
            pendingCount: 0,
            unresolvedCount: 1,
            hasUnknownCharges: true,
          },
        ],
        balanceVerified: false,
      },
    });
    const result = await getUsage(user);
    expect(result.balanceVerified).toBe(false);
    expect(result.providers).toHaveLength(2);
    expect(result.providers.find((row) => row.provider === 'meta')).toMatchObject({
      estimatedUsd: 0.03,
      heldUsd: 1,
      hasUnknownCharges: true,
    });
    expect(result.providers.find((row) => row.provider === 'azure')).toMatchObject({
      operationCount: 0,
    });
  });
});
