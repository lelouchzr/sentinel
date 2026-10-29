import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpeakingSession, SessionSetup } from '@/lib/contracts';
import { DataError } from '@/server/data/errors';
import { ProviderError } from '@/server/providers/types';
import { HttpError } from '@/server/http/errors';
import { runOperation, estimateUsd } from '@/server/usage/run-operation';

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  reserve: vi.fn(),
  finish: vi.fn(),
  plan: vi.fn(),
  reply: vi.fn(),
  hint: vi.fn(),
  evaluate: vi.fn(),
  transcribe: vi.fn(),
  speech: vi.fn(),
  extract: vi.fn(),
  storage: vi.fn(),
}));
vi.mock('@/server/auth/require-user', () => ({ requireUser: mocks.user }));
vi.mock('@/server/data/sessions', () => ({
  getSession: mocks.get,
  createSession: mocks.create,
  saveSession: mocks.save,
  deleteSession: mocks.remove,
}));
vi.mock('@/server/data/operations', () => ({
  reserveOperation: mocks.reserve,
  finishOperation: mocks.finish,
}));
vi.mock('@/lib/supabase/server', () => ({ createUserSupabase: mocks.storage }));
vi.mock('@/server/providers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/providers')>()),
  planSession: mocks.plan,
  replyToSession: mocks.reply,
  createHint: mocks.hint,
  evaluateSession: mocks.evaluate,
  transcribeAudio: mocks.transcribe,
  synthesizeSpeech: mocks.speech,
  extractVocabulary: mocks.extract,
}));

import { POST as start } from '@/app/api/sessions/route';
import { POST as addTurn } from '@/app/api/sessions/[id]/turns/route';
import { POST as hint } from '@/app/api/sessions/[id]/hints/route';
import { POST as complete } from '@/app/api/sessions/[id]/complete/route';
import { POST as transcribe } from '@/app/api/transcribe/route';
import { POST as speech } from '@/app/api/speech/route';
import { POST as extract } from '@/app/api/imports/extract/route';
import { DELETE as remove } from '@/app/api/sessions/[id]/route';

const userId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
const operationId = '33333333-3333-4333-8333-333333333333';
const ctx = { params: Promise.resolve({ id: sessionId }) };
const setup: SessionSetup = {
  scenario: 'request',
  goal: 'Demander un chargeur',
  level: 'beginner',
  relationship: 'stranger',
  targetLanguage: 'ko',
  explanationLanguage: 'fr',
  targets: ['충전기', '빌리다', '잠깐'].map((expression, index) => ({
    id: `word-${index}`,
    expression,
    meaning: ['chargeur', 'emprunter', 'un instant'][index]!,
    example: '',
    source: 'manual',
    provenance: { expression: 'edited', meaning: 'edited', example: 'edited' },
  })),
};
function sessionFixture(overrides: Partial<SpeakingSession> = {}): SpeakingSession {
  return {
    id: sessionId,
    setup: structuredClone(setup),
    status: 'active',
    scene: 'Au café',
    createdAt: new Date().toISOString(),
    hints: [],
    turns: [
      {
        id: 'partner-0',
        role: 'partner',
        text: '무엇을 도와드릴까요?',
        corrected: false,
        createdAt: new Date().toISOString(),
      },
    ],
    ...overrides,
  };
}
const usage = {
  provider: 'meta' as const,
  model: 'test-only-model',
  operation: 'plan' as const,
  inputTokens: 100,
  outputTokens: 50,
  latencyMs: 10,
};
function jsonRequest(
  body: unknown,
  path = '/api/sessions',
  headers: Record<string, string> = {},
): Request {
  return new Request(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', ...headers },
    body: JSON.stringify(body),
  });
}
function wav(): Uint8Array {
  const bytes = new Uint8Array(44 + 3200),
    view = new DataView(bytes.buffer);
  const tag = (offset: number, text: string) =>
    [...text].forEach((letter, index) => (bytes[offset + index] = letter.charCodeAt(0)));
  tag(0, 'RIFF');
  view.setUint32(4, bytes.length - 8, true);
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, 'data');
  view.setUint32(40, bytes.length - 44, true);
  return bytes;
}
function audioRequest(): Request {
  const form = new FormData();
  form.set('sessionId', sessionId);
  form.set('operationId', operationId);
  form.set('audio', new Blob([new Uint8Array(wav()).buffer], { type: 'audio/wav' }), 'turn.wav');
  return new Request('http://localhost:3000/api/transcribe', {
    method: 'POST',
    headers: { Origin: 'http://localhost:3000' },
    body: form,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  const env: Record<string, string> = {
    AI_ENABLED: 'true',
    META_API_KEY: 'test-placeholder',
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-placeholder',
    SUPABASE_SECRET_KEY: 'test-placeholder',
    AZURE_SPEECH_KEY: 'test-placeholder',
    AZURE_SPEECH_REGION: 'westeurope',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  };
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  mocks.user.mockResolvedValue({ id: userId });
  mocks.get.mockImplementation(async () => sessionFixture());
  mocks.create.mockResolvedValue(undefined);
  mocks.save.mockResolvedValue(undefined);
  mocks.remove.mockResolvedValue(undefined);
  mocks.reserve.mockResolvedValue({ created: true, state: 'reserved', result: null });
  mocks.finish.mockResolvedValue(undefined);
  mocks.plan.mockResolvedValue({
    data: { scene: 'Au café', opening: '무엇을 도와드릴까요?' },
    usage,
  });
  mocks.reply.mockResolvedValue({
    data: { reply: '네, 여기 있어요.' },
    usage: { ...usage, operation: 'reply' },
  });
  mocks.speech.mockResolvedValue({
    data: new Uint8Array([1, 2, 3]),
    usage: { ...usage, provider: 'azure', operation: 'speech' },
  });
  mocks.transcribe.mockResolvedValue({
    data: { text: '충전기를 빌려 주세요.' },
    usage: { ...usage, operation: 'transcribe', audioSeconds: 0.1 },
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('HTTP authentication, validation and billable boundaries', () => {
  it('never reserves or dispatches when authentication fails', async () => {
    mocks.user.mockRejectedValue(new DataError('UNAUTHORIZED', 'Connecte-toi.', 401));
    const response = await start(jsonRequest({ operationId, setup }));
    expect(response.status).toBe(401);
    expect(mocks.reserve).not.toHaveBeenCalled();
    expect(mocks.plan).not.toHaveBeenCalled();
  });
  it('does not trust a supplied user id and uses the verified identity', async () => {
    const response = await start(jsonRequest({ operationId, setup, userId: 'attacker-value' }));
    expect(response.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith(expect.anything(), userId);
    expect(mocks.reserve).toHaveBeenCalledWith(expect.objectContaining({ userId }));
  });
  it('rejects a cross-site mutation and an oversized JSON body before any billing', async () => {
    expect(
      (
        await start(
          jsonRequest({ operationId, setup }, undefined, { Origin: 'https://attacker.example' }),
        )
      ).status,
    ).toBe(403);
    expect((await start(jsonRequest({ text: 'x'.repeat(33_000) }))).status).toBe(413);
    expect(mocks.reserve).not.toHaveBeenCalled();
    expect(mocks.plan).not.toHaveBeenCalled();
  });
  it('keeps paid calls off by default and rejects absent credentials before reservation', async () => {
    vi.stubEnv('AI_ENABLED', 'false');
    const disabled = await start(jsonRequest({ operationId, setup }));
    expect(disabled.status).toBe(503);
    expect((await disabled.json()).error.code).toBe('AI_DISABLED');
    vi.stubEnv('AI_ENABLED', 'true');
    vi.stubEnv('META_API_KEY', '');
    const absent = await start(jsonRequest({ operationId, setup }));
    expect((await absent.json()).error.code).toBe('META_NOT_CONFIGURED');
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it('rejects invalid target counts and duplicates before planning', async () => {
    expect(
      (
        await start(
          jsonRequest({ operationId, setup: { ...setup, targets: setup.targets.slice(0, 2) } }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await start(
          jsonRequest({
            operationId,
            setup: { ...setup, targets: [setup.targets[0], setup.targets[0], setup.targets[1]] },
          }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.plan).not.toHaveBeenCalled();
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it('associates the plan reservation with the new session for later private-content deletion', async () => {
    expect((await start(jsonRequest({ operationId, setup }))).status).toBe(200);
    expect(mocks.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: operationId, kind: 'plan' }),
    );
  });
  it('returns a successful replay and never calls the provider a second time', async () => {
    const cached = sessionFixture();
    mocks.reserve.mockResolvedValue({ created: false, state: 'succeeded', result: cached });
    const response = await start(jsonRequest({ operationId, setup }));
    expect(await response.json()).toEqual(cached);
    expect(mocks.plan).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each(['reserved', 'unresolved', 'failed'])(
    'does not redispatch a duplicate %s operation',
    async (state) => {
      mocks.reserve.mockResolvedValue({ created: false, state, result: null });
      expect((await start(jsonRequest({ operationId, setup }))).status).toBe(409);
      expect(mocks.plan).not.toHaveBeenCalled();
      expect(mocks.finish).not.toHaveBeenCalled();
    },
  );
  it('holds the reservation after an ambiguous provider timeout', async () => {
    mocks.plan.mockRejectedValue(
      new ProviderError('PROVIDER_TIMEOUT', 'Délai dépassé.', 504, true),
    );
    expect((await start(jsonRequest({ operationId, setup }))).status).toBe(504);
    expect(mocks.finish).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'unresolved', estimatedUsd: undefined }),
    );
  });
  it('holds the reservation if durable storage fails after a successful model request', async () => {
    mocks.create.mockRejectedValue(new DataError('STORAGE_ERROR', 'Stockage indisponible.'));
    expect((await start(jsonRequest({ operationId, setup }))).status).toBe(500);
    expect(mocks.plan).toHaveBeenCalledTimes(1);
    expect(mocks.finish).toHaveBeenCalledWith(expect.objectContaining({ state: 'unresolved' }));
  });
  it('rejects another user’s session before reserving a turn or deleting anything', async () => {
    mocks.get.mockResolvedValue(null);
    expect((await addTurn(jsonRequest({ operationId, text: '안녕하세요.' }), ctx)).status).toBe(
      404,
    );
    expect(
      (
        await remove(
          new Request(`http://localhost:3000/api/sessions/${sessionId}`, { method: 'DELETE' }),
          ctx,
        )
      ).status,
    ).toBe(404);
    expect(mocks.reserve).not.toHaveBeenCalled();
    expect(mocks.reply).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('checks active state again after obtaining the session lock', async () => {
    mocks.get
      .mockResolvedValueOnce(sessionFixture())
      .mockResolvedValue(
        sessionFixture({ createdAt: new Date(Date.now() - 301_000).toISOString() }),
      );
    const response = await addTurn(jsonRequest({ operationId, text: '안녕하세요.' }), ctx);
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('SESSION_TIME_LIMIT');
    expect(mocks.reply).not.toHaveBeenCalled();
    expect(mocks.finish).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'failed', estimatedUsd: 0 }),
    );
  });
  it('blocks a ninth learner turn before requesting a model reply', async () => {
    const turns = Array.from({ length: 8 }, (_, index) => ({
      id: `learner-${index}`,
      role: 'learner' as const,
      text: '안녕',
      corrected: false,
      createdAt: new Date().toISOString(),
    }));
    mocks.get.mockResolvedValue(sessionFixture({ turns }));
    const response = await addTurn(jsonRequest({ operationId, text: '안녕하세요.' }), ctx);
    expect((await response.json()).error.code).toBe('TURN_LIMIT');
    expect(mocks.reply).not.toHaveBeenCalled();
  });
  it('does not transcribe new audio after eight learner turns', async () => {
    const turns = Array.from({ length: 8 }, (_, index) => ({
      id: `learner-${index}`,
      role: 'learner' as const,
      text: '안녕',
      corrected: false,
      createdAt: new Date().toISOString(),
    }));
    mocks.get.mockResolvedValue(sessionFixture({ turns }));
    const response = await transcribe(audioRequest());
    expect(response.status).toBe(409);
    expect(mocks.transcribe).not.toHaveBeenCalled();
  });
  it('enforces hint progression and requires a learner turn before evaluating', async () => {
    const hintResponse = await hint(
      jsonRequest({ operationId, targetId: 'word-0', level: 'example' }),
      ctx,
    );
    expect((await hintResponse.json()).error.code).toBe('HINT_ORDER');
    expect(mocks.hint).not.toHaveBeenCalled();
    const completion = await complete(jsonRequest({ operationId }), ctx);
    expect((await completion.json()).error.code).toBe('NO_LEARNER_TURN');
    expect(mocks.evaluate).not.toHaveBeenCalled();
  });
  it('rechecks ownership inside the speech lock before sending a previously loaded reply', async () => {
    mocks.get.mockResolvedValueOnce(sessionFixture()).mockResolvedValue(null);
    const response = await speech(
      jsonRequest({ operationId, sessionId, turnId: 'partner-0' }, '/api/speech'),
    );
    expect(response.status).toBe(404);
    expect(mocks.speech).not.toHaveBeenCalled();
  });
  it('rejects an image owned by another account before any download or model call', async () => {
    const response = await extract(
      jsonRequest(
        { operationId, objectPath: `44444444-4444-4444-8444-444444444444/${operationId}.png` },
        '/api/imports/extract',
      ),
    );
    expect(response.status).toBe(403);
    expect(mocks.storage).not.toHaveBeenCalled();
    expect(mocks.extract).not.toHaveBeenCalled();
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
});

describe('operation dispatch accounting', () => {
  const operation = {
    id: operationId,
    userId,
    sessionId,
    kind: 'reply',
    fingerprint: 'test-fingerprint',
  };
  it('releases a reservation for a known failure before dispatch even when the failure is internal', async () => {
    await expect(
      runOperation(operation, async () => {
        throw new Error('local validation dependency failed');
      }),
    ).rejects.toThrow('local validation');
    expect(mocks.finish).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'failed', estimatedUsd: 0 }),
    );
  });
  it('does not mistake a client-facing error after dispatch for an unbilled validation error', async () => {
    await expect(
      runOperation(operation, async (markDispatched) => {
        markDispatched();
        throw new HttpError('INVALID_POSTPROCESSING', 'Cannot persist generated result.', 400);
      }),
    ).rejects.toThrow('Cannot persist');
    expect(mocks.finish).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'unresolved', estimatedUsd: undefined }),
    );
  });
  it('retains measured non-content usage metadata when post-response validation fails', async () => {
    const measured = {
      ...usage,
      operation: 'reply' as const,
      requestId: 'provider-request-fixture',
    };
    await expect(
      runOperation(operation, async (markDispatched) => {
        markDispatched();
        throw new ProviderError(
          'INVALID_MODEL_RESPONSE',
          'Invalid structured response.',
          502,
          true,
          measured,
        );
      }),
    ).rejects.toThrow('Invalid structured');
    expect(mocks.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'unresolved',
        usage: measured,
        estimatedUsd: estimateUsd(measured),
      }),
    );
  });
  it('stores measured usage and its estimate on successful completion, excluding undefined fields', async () => {
    const result = await runOperation(operation, async (markDispatched) => {
      markDispatched();
      return { result: { reply: '네.' }, usage: { ...usage, requestId: undefined } };
    });
    expect(result).toEqual({ reply: '네.' });
    expect(mocks.finish).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'succeeded', usage, estimatedUsd: estimateUsd(usage) }),
    );
    expect(mocks.finish.mock.calls[0]![0].usage).not.toHaveProperty('requestId');
  });
});
