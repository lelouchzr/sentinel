import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCollection, deleteCollection, updateCollection } from '@/server/data/collections';
import { POST } from '@/app/api/collections/route';
import { DataError } from '@/server/data/errors';
import { previewImport } from '@/features/imports/parser';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), requireUser: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabase: () => ({ rpc: mocks.rpc }),
  createUserSupabase: vi.fn(),
}));
vi.mock('@/server/auth/require-user', () => ({ requireUser: mocks.requireUser }));
const alice = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
function content() {
  return {
    id,
    title: 'My vocabulary',
    items: previewImport('expression\tmeaning\n빌리다\temprunter\n돌려주다\trendre').rows,
  };
}
const request = (body: unknown, origin = 'http://localhost:3000') =>
  new Request('http://localhost:3000/api/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: alice });
  mocks.rpc.mockImplementation(async (_name: string, args: Record<string, unknown>) => ({
    data: {
      id: args.p_id,
      title: args.p_title,
      items: args.p_items,
      revision: args.p_expected_revision === null ? 0 : Number(args.p_expected_revision) + 1,
      created_at: '2026-10-29T12:00:00Z',
      updated_at: '2026-10-29T12:00:00Z',
    },
    error: null,
  }));
});
describe('validated cloud collection writes', () => {
  it('derives ownership from verified authentication and ignores supplied owner IDs', async () => {
    const response = await POST(request({ ...content(), owner_id: 'foreign-account' }));
    expect(response.status).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith(
      'write_vocabulary_collection',
      expect.objectContaining({ p_owner_id: alice, p_expected_revision: null }),
    );
  });
  it('never dispatches a write for unauthenticated or cross-site requests', async () => {
    mocks.requireUser.mockRejectedValueOnce(new DataError('UNAUTHORIZED', 'Connectez-vous.', 401));
    expect((await POST(request(content()))).status).toBe(401);
    expect((await POST(request(content(), 'https://untrusted.example'))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('normalizes edited item identities and groups identical pairs without merging homonyms', async () => {
    const input = content();
    const originalId = input.items[0]!.id;
    input.items[0]!.meaning = 'une signification modifiée';
    input.items.push({ ...input.items[0]! }, { ...input.items[0]!, meaning: 'emprunter' });
    const saved = await createCollection(input, alice);
    expect(saved.items).toHaveLength(3);
    expect(saved.items[0]!.id).not.toBe(originalId);
    expect(saved.items[2]!.id).toBe(originalId);
  });
  it('rejects empty, oversized and invalid imports before any storage mutation', async () => {
    await expect(createCollection({ ...content(), items: [] }, alice)).rejects.toThrow();
    await expect(
      createCollection({ ...content(), items: Array(501).fill(content().items[0]) }, alice),
    ).rejects.toThrow();
    await expect(createCollection({ ...content(), title: '   ' }, alice)).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('sends explicit optimistic revision checks for updates and deletes', async () => {
    await updateCollection(id, { ...content(), revision: 4 }, alice);
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      'write_vocabulary_collection',
      expect.objectContaining({ p_expected_revision: 4, p_owner_id: alice }),
    );
    await deleteCollection(id, 5, alice);
    expect(mocks.rpc).toHaveBeenLastCalledWith('delete_vocabulary_collection', {
      p_id: id,
      p_owner_id: alice,
      p_expected_revision: 5,
    });
  });
  it('maps stale revision conflicts without leaking raw database details', async () => {
    mocks.rpc.mockResolvedValue({
      error: { message: 'COLLECTION_CONFLICT private DB detail' },
      data: null,
    });
    await expect(updateCollection(id, { ...content(), revision: 0 }, alice)).rejects.toMatchObject({
      code: 'COLLECTION_CONFLICT',
      status: 409,
    });
  });
});
