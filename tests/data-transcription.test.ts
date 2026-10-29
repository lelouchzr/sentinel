import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getVerifiedTranscription } from '@/server/data/operations';
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({ createAdminSupabase: () => ({ from: mocks.from }) }));
const operation = '11111111-1111-4111-8111-111111111111';
const user = '22222222-2222-4222-8222-222222222222';
const session = '33333333-3333-4333-8333-333333333333';
beforeEach(() => {
  vi.clearAllMocks();
  const chain = { select: mocks.select, eq: mocks.eq, maybeSingle: mocks.maybeSingle };
  mocks.from.mockReturnValue(chain);
  mocks.select.mockReturnValue(chain);
  mocks.eq.mockReturnValue(chain);
  mocks.maybeSingle.mockResolvedValue({
    data: { result: { text: '펜을 빌리고 싶어요.' } },
    error: null,
  });
});
describe('server-owned transcription provenance', () => {
  it('requires the exact owner, session, purpose and successful operation state', async () => {
    expect(await getVerifiedTranscription(operation, user, session)).toEqual({
      text: '펜을 빌리고 싶어요.',
    });
    expect(mocks.select).toHaveBeenCalledWith('result');
    expect(mocks.eq.mock.calls).toEqual([
      ['id', operation],
      ['owner_id', user],
      ['session_id', session],
      ['kind', 'transcribe'],
      ['state', 'succeeded'],
    ]);
  });
  it.each([
    null,
    { result: null },
    { result: { text: '' } },
    { result: { text: 'x'.repeat(2001) } },
  ])('withholds absent, scrubbed or malformed proof', async (data) => {
    mocks.maybeSingle.mockResolvedValue({ data, error: null });
    expect(await getVerifiedTranscription(operation, user, session)).toBeNull();
  });
  it('fails closed on database failure without exposing provider results', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'secret database error' },
    });
    await expect(getVerifiedTranscription(operation, user, session)).rejects.toMatchObject({
      code: 'STORAGE_ERROR',
    });
  });
});
