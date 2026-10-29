import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpeakingSession } from '@/lib/contracts';
import { DataError } from '@/server/data/errors';
import { validateFeedback } from '@/server/learning/evidence';
import {
  completedSessionFixture,
  feedbackFixture,
  fixtureOperationId,
  fixtureSessionId,
  fixtureUserId,
  secondOperationId,
} from './session-fixtures';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  reserve: vi.fn(),
  finish: vi.fn(),
  transcription: vi.fn(),
  evaluate: vi.fn(),
  plan: vi.fn(),
  reply: vi.fn(),
  hint: vi.fn(),
  user: vi.fn(),
}));
vi.mock('@/server/data/sessions', () => ({
  getSession: mocks.get,
  saveSession: mocks.save,
  updateSessionSnapshot: mocks.update,
  createSession: mocks.create,
}));
vi.mock('@/server/data/operations', () => ({
  reserveOperation: mocks.reserve,
  finishOperation: mocks.finish,
  getVerifiedTranscription: mocks.transcription,
}));
vi.mock('@/server/providers', () => ({
  planSession: mocks.plan,
  replyToSession: mocks.reply,
  createHint: mocks.hint,
  evaluateSession: mocks.evaluate,
}));
vi.mock('@/server/auth/require-user', () => ({ requireUser: mocks.user }));
import {
  amendTranscript,
  flagFeedback,
  completeSession,
  addTurn,
  revealHint,
} from '@/server/session-service';
import { PATCH as amendRoute } from '@/app/api/sessions/[id]/turns/[turnId]/route';
import { POST as flagRoute } from '@/app/api/sessions/[id]/feedback/flags/route';

let current: SpeakingSession;
const usage = {
  provider: 'meta' as const,
  model: 'fixture',
  operation: 'evaluate' as const,
  inputTokens: 50,
  outputTokens: 50,
  latencyMs: 1,
};
beforeEach(() => {
  vi.clearAllMocks();
  for (const [name, value] of Object.entries({
    AI_ENABLED: 'true',
    META_API_KEY: 'test-only',
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-only',
    SUPABASE_SECRET_KEY: 'test-only',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  }))
    vi.stubEnv(name, value);
  current = completedSessionFixture();
  mocks.user.mockResolvedValue({ id: fixtureUserId });
  mocks.get.mockImplementation(async () => structuredClone(current));
  mocks.save.mockImplementation(async (session: SpeakingSession) => {
    current = { ...session, revision: (session.revision ?? 0) + 1 };
    return structuredClone(current);
  });
  mocks.update.mockImplementation(
    async ({
      session,
      expectedRevision,
    }: {
      session: SpeakingSession;
      expectedRevision: number;
    }) => {
      if (expectedRevision !== (current.revision ?? 0))
        throw new DataError('SESSION_CONFLICT', 'La conversation a changé.', 409);
      current = structuredClone(session);
      return structuredClone(current);
    },
  );
  mocks.reserve.mockResolvedValue({ created: true, state: 'reserved', result: null });
  mocks.finish.mockResolvedValue(undefined);
  mocks.transcription.mockResolvedValue(null);
  mocks.reply.mockResolvedValue({
    data: { reply: '네, 알겠습니다.' },
    usage: { ...usage, operation: 'reply' },
  });
  mocks.evaluate.mockImplementation(async (session: SpeakingSession) => ({
    data: validateFeedback(session, feedbackFixture()),
    usage,
  }));
});
afterEach(() => vi.unstubAllEnvs());
function request(body: unknown, method = 'POST', origin = 'http://localhost:3000') {
  return new Request('http://localhost:3000/api/sessions/action', {
    method,
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  });
}

describe('non-billable owned corrections', () => {
  it('amends a completed transcript through the atomic snapshot helper without reserving budget', async () => {
    const result = await amendTranscript(
      fixtureSessionId,
      'learner-1',
      { operationId: fixtureOperationId, text: '펜을 빌려도 될까요?', expectedRevision: 4 },
      fixtureUserId,
    );
    expect(result).toMatchObject({ revision: 5, status: 'active' });
    expect(result.feedback).toBeUndefined();
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: fixtureUserId,
        expectedRevision: 4,
        operationId: fixtureOperationId,
      }),
    );
    expect(mocks.reserve).not.toHaveBeenCalled();
    expect(mocks.evaluate).not.toHaveBeenCalled();
  });
  it('does not overwrite a newer revision from a stale editor', async () => {
    await expect(
      amendTranscript(
        fixtureSessionId,
        'learner-1',
        { operationId: fixtureOperationId, text: '다른 답변', expectedRevision: 3 },
        fixtureUserId,
      ),
    ).rejects.toMatchObject({ code: 'SESSION_CONFLICT' });
    expect(current.revision).toBe(4);
    expect(current.feedback).toBeDefined();
  });
  it('replays a confirmed mutation as current state even after later edits', async () => {
    const input = { operationId: fixtureOperationId, text: '첫 번째 수정' };
    await amendTranscript(fixtureSessionId, 'learner-1', input, fixtureUserId);
    await amendTranscript(
      fixtureSessionId,
      'learner-1',
      { operationId: secondOperationId, text: '두 번째 수정' },
      fixtureUserId,
    );
    const result = await amendTranscript(fixtureSessionId, 'learner-1', input, fixtureUserId);
    expect(result.turns[1]!.text).toBe('두 번째 수정');
    expect(mocks.update).toHaveBeenCalledTimes(2);
  });
  it('flags disputed evidence without a provider call and keeps historical target snapshots', async () => {
    const result = await flagFeedback(
      fixtureSessionId,
      {
        operationId: fixtureOperationId,
        targetId: 'borrow',
        reason: 'ASR incorrect',
        expectedRevision: 4,
      },
      fixtureUserId,
    );
    expect(result.feedback!.observations[0]).toMatchObject({ outcome: 'uncertain', evidence: [] });
    expect(result.setup.targets).toEqual(completedSessionFixture().setup.targets);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it('enforces session ownership before a mutation is attempted', async () => {
    mocks.get.mockResolvedValue(null);
    await expect(
      flagFeedback(
        fixtureSessionId,
        { operationId: fixtureOperationId, targetId: 'borrow' },
        fixtureUserId,
      ),
    ).rejects.toMatchObject({ code: 'SESSION_NOT_FOUND' });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe('revision-safe paid evaluation', () => {
  it('evaluates an amended expired session only after an explicit request', async () => {
    await amendTranscript(
      fixtureSessionId,
      'learner-1',
      { operationId: fixtureOperationId, text: '펜을 빌려도 될까요?' },
      fixtureUserId,
    );
    const result = await completeSession(
      fixtureSessionId,
      { operationId: secondOperationId },
      fixtureUserId,
    );
    expect(result).toMatchObject({ status: 'completed', revision: 6, feedbackRevision: 6 });
    expect(mocks.evaluate).toHaveBeenCalledTimes(1);
    expect(mocks.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'succeeded',
        result: expect.objectContaining({ revision: 6 }),
      }),
    );
  });
  it('does not restore feedback from an older successful operation replay', async () => {
    const stale = structuredClone(current);
    await amendTranscript(
      fixtureSessionId,
      'learner-1',
      { operationId: fixtureOperationId, text: '수정된 답변' },
      fixtureUserId,
    );
    mocks.reserve.mockResolvedValue({ created: false, state: 'succeeded', result: stale });
    const result = await completeSession(
      fixtureSessionId,
      { operationId: secondOperationId },
      fixtureUserId,
    );
    expect(result.status).toBe('active');
    expect(result.feedback).toBeUndefined();
    expect(mocks.evaluate).not.toHaveBeenCalled();
  });
  it('uses current ownership state even when the invalidated cached result has been scrubbed', async () => {
    await amendTranscript(
      fixtureSessionId,
      'learner-1',
      { operationId: fixtureOperationId, text: '수정된 답변' },
      fixtureUserId,
    );
    mocks.reserve.mockResolvedValue({ created: false, state: 'succeeded', result: null });
    const result = await completeSession(
      fixtureSessionId,
      { operationId: secondOperationId },
      fixtureUserId,
    );
    expect(result.revision).toBe(5);
    expect(result.feedback).toBeUndefined();
    expect(mocks.evaluate).not.toHaveBeenCalled();
  });
  it('rejects a reused conversation turn ID before dispatching a reply', async () => {
    current = completedSessionFixture({
      status: 'active',
      feedback: undefined,
      createdAt: new Date().toISOString(),
    });
    current.turns[0]!.id = fixtureOperationId;
    await expect(
      addTurn(
        fixtureSessionId,
        { operationId: fixtureOperationId, text: '안녕하세요' },
        fixtureUserId,
      ),
    ).rejects.toMatchObject({ code: 'TURN_ID_CONFLICT' });
    expect(mocks.reply).not.toHaveBeenCalled();
  });
  it('never grants another turn or hint after an amended session has expired', async () => {
    current.status = 'active';
    current.feedback = undefined;
    await expect(
      addTurn(
        fixtureSessionId,
        { operationId: fixtureOperationId, text: '새 답변' },
        fixtureUserId,
      ),
    ).rejects.toMatchObject({ code: 'SESSION_TIME_LIMIT' });
    await expect(
      revealHint(
        fixtureSessionId,
        { operationId: secondOperationId, targetId: 'borrow', level: 'meaning' },
        fixtureUserId,
      ),
    ).rejects.toMatchObject({ code: 'SESSION_TIME_LIMIT' });
    expect(mocks.reply).not.toHaveBeenCalled();
    expect(mocks.hint).not.toHaveBeenCalled();
  });
});

describe('server-verified speech provenance', () => {
  const proof = '66666666-6666-4666-8666-666666666666';
  beforeEach(() => {
    current = completedSessionFixture({
      status: 'active',
      feedback: undefined,
      createdAt: new Date().toISOString(),
    });
  });
  it('rejects a forged spoken label before provider dispatch', async () => {
    await expect(
      addTurn(
        fixtureSessionId,
        {
          operationId: fixtureOperationId,
          text: '안녕하세요',
          inputMode: 'spoken',
        },
        fixtureUserId,
      ),
    ).rejects.toMatchObject({ code: 'TRANSCRIPTION_REQUIRED', status: 400 });
    expect(mocks.reply).not.toHaveBeenCalled();
    expect(mocks.transcription).not.toHaveBeenCalled();
    expect(mocks.finish).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'failed', estimatedUsd: 0 }),
    );
  });
  it('rejects a proof absent from the authenticated session ledger', async () => {
    await expect(
      addTurn(
        fixtureSessionId,
        {
          operationId: fixtureOperationId,
          text: '안녕하세요',
          inputMode: 'spoken',
          transcriptionOperationId: proof,
        },
        fixtureUserId,
      ),
    ).rejects.toMatchObject({ code: 'TRANSCRIPTION_REQUIRED' });
    expect(mocks.transcription).toHaveBeenCalledWith(proof, fixtureUserId, fixtureSessionId);
    expect(mocks.reply).not.toHaveBeenCalled();
  });
  it('persists verified unchanged speech and treats an edited transcript as corrected despite a false client flag', async () => {
    mocks.transcription.mockResolvedValue({ text: '안녕하세요' });
    const unchanged = await addTurn(
      fixtureSessionId,
      {
        operationId: fixtureOperationId,
        text: '안녕하세요',
        inputMode: 'spoken',
        transcriptionOperationId: proof,
      },
      fixtureUserId,
    );
    expect(unchanged.turns.find((turn) => turn.id === fixtureOperationId)).toMatchObject({
      inputMode: 'spoken',
      corrected: false,
      transcriptionOperationId: proof,
    });
    const changed = await addTurn(
      fixtureSessionId,
      {
        operationId: secondOperationId,
        text: '반갑습니다',
        inputMode: 'spoken',
        corrected: false,
        transcriptionOperationId: '77777777-7777-4777-8777-777777777777',
      },
      fixtureUserId,
    );
    expect(changed.turns.find((turn) => turn.id === secondOperationId)).toMatchObject({
      corrected: true,
      inputMode: 'spoken',
    });
  });
  it('does not count the same ASR recording as two different attempts', async () => {
    mocks.transcription.mockResolvedValue({ text: '안녕하세요' });
    current.turns[1]!.transcriptionOperationId = proof;
    await expect(
      addTurn(
        fixtureSessionId,
        {
          operationId: fixtureOperationId,
          text: '안녕하세요',
          inputMode: 'spoken',
          transcriptionOperationId: proof,
        },
        fixtureUserId,
      ),
    ).rejects.toMatchObject({ code: 'TRANSCRIPTION_REUSED', status: 409 });
    expect(mocks.reply).not.toHaveBeenCalled();
  });
  it('does not attach oral provenance to a typed turn even if the client sends a proof ID', async () => {
    const result = await addTurn(
      fixtureSessionId,
      {
        operationId: fixtureOperationId,
        text: '안녕하세요',
        inputMode: 'typed',
        transcriptionOperationId: proof,
      },
      fixtureUserId,
    );
    expect(
      result.turns.find((turn) => turn.id === fixtureOperationId)?.transcriptionOperationId,
    ).toBeUndefined();
    expect(mocks.transcription).not.toHaveBeenCalled();
  });
  it('replays a successful reply before checking whether its speech proof was already consumed', async () => {
    current.turns[1]!.transcriptionOperationId = proof;
    mocks.reserve.mockResolvedValue({ created: false, state: 'succeeded', result: current });
    const result = await addTurn(
      fixtureSessionId,
      {
        operationId: fixtureOperationId,
        text: '안녕하세요',
        inputMode: 'spoken',
        transcriptionOperationId: proof,
      },
      fixtureUserId,
    );
    expect(result).toEqual(current);
    expect(mocks.transcription).not.toHaveBeenCalled();
    expect(mocks.reply).not.toHaveBeenCalled();
  });
});

describe('amendment and dispute HTTP boundaries', () => {
  it('rejects unauthenticated requests before reading or writing a session', async () => {
    mocks.user.mockRejectedValue(new DataError('AUTH_REQUIRED', 'Connexion requise.', 401));
    const result = await amendRoute(
      request({ operationId: fixtureOperationId, text: '수정' }, 'PATCH'),
      { params: Promise.resolve({ id: fixtureSessionId, turnId: 'learner-1' }) },
    );
    expect(result.status).toBe(401);
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it('rejects cross-origin edits and ignores a spoofed owner field', async () => {
    const blocked = await flagRoute(
      request(
        { operationId: fixtureOperationId, targetId: 'borrow' },
        'POST',
        'https://elsewhere.invalid',
      ),
      { params: Promise.resolve({ id: fixtureSessionId }) },
    );
    expect(blocked.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
    const accepted = await flagRoute(
      request({ operationId: fixtureOperationId, targetId: 'borrow', userId: 'spoofed' }),
      { params: Promise.resolve({ id: fixtureSessionId }) },
    );
    expect(accepted.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ userId: fixtureUserId }));
  });
});
