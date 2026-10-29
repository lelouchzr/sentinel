import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportAccount } from '@/server/data/account';

const mocks = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), range: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabase: () => ({ from: mocks.from }),
}));
const user = '11111111-1111-4111-8111-111111111111';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockImplementation((table: string) => {
    const chain = {
      select: (fields: string) => {
        mocks.select(table, fields);
        return chain;
      },
      eq: (field: string, value: string) => {
        mocks.eq(table, field, value);
        return chain;
      },
      order: () => chain,
      range: (start: number, end: number) => mocks.range(table, start, end),
    };
    return chain;
  });
});

describe('private account export', () => {
  it('pages all owned records and explicitly excludes raw provider replay payloads', async () => {
    mocks.range.mockImplementation((table: string, start: number) => ({
      data:
        table === 'speaking_sessions'
          ? Array.from({ length: start === 0 ? 100 : 1 }, (_, index) => ({
              id: `${start + index}`,
              snapshot: { private: true },
            }))
          : [{ id: table }],
      error: null,
    }));
    const result = await exportAccount(user, 'learner@example.test');
    expect(result.account).toEqual({ id: user, email: 'learner@example.test' });
    expect(result.sessions).toHaveLength(101);
    expect(mocks.range).toHaveBeenCalledWith('speaking_sessions', 100, 199);
    for (const table of ['vocabulary_collections', 'speaking_sessions', 'provider_operations'])
      expect(mocks.eq).toHaveBeenCalledWith(table, 'owner_id', user);
    const operationFields = mocks.select.mock.calls.find(
      ([table]) => table === 'provider_operations',
    )![1] as string;
    expect(operationFields.split(',')).not.toContain('result');
    expect(operationFields.split(',')).not.toContain('fingerprint');
  });
  it('returns no partial export when any private table cannot be read', async () => {
    mocks.range.mockImplementation((table: string) => ({
      data: [],
      error: table === 'speaking_sessions' ? { message: 'private database detail' } : null,
    }));
    await expect(exportAccount(user, null)).rejects.toMatchObject({ code: 'EXPORT_FAILED' });
    await expect(exportAccount(user, null)).rejects.not.toThrow('private database detail');
  });
  it('fails explicitly instead of silently truncating an oversized export', async () => {
    mocks.range.mockImplementation((table: string, start: number, end: number) => ({
      data:
        table === 'speaking_sessions'
          ? Array.from({ length: end - start + 1 }, (_, index) => ({ id: `${start + index}` }))
          : [],
      error: null,
    }));
    await expect(exportAccount(user, null)).rejects.toMatchObject({
      code: 'EXPORT_TOO_LARGE',
      status: 413,
    });
  });
});
