import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runOperation, estimateUsd } from '@/server/usage/run-operation';
import { HttpError } from '@/server/http/errors';
import { ProviderError, type ProviderUsage } from '@/server/providers/types';
import {
  completedSessionFixture,
  fixtureOperationId,
  fixtureSessionId,
  fixtureUserId,
} from './session-fixtures';

const ledger = vi.hoisted(() => ({ reserve: vi.fn(), finish: vi.fn() }));
vi.mock('@/server/data/operations', () => ({
  reserveOperation: ledger.reserve,
  finishOperation: ledger.finish,
}));

const operation = {
  id: fixtureOperationId,
  userId: fixtureUserId,
  sessionId: fixtureSessionId,
  kind: 'evaluate',
  fingerprint: 'fixture-input-fingerprint',
};
const usage: ProviderUsage = {
  provider: 'meta',
  model: 'fixture',
  operation: 'evaluate',
  inputTokens: 100,
  outputTokens: 200,
  latencyMs: 1,
};
beforeEach(() => {
  vi.resetAllMocks();
  for (const [name, value] of Object.entries({
    AI_ENABLED: 'true',
    META_API_KEY: 'test-only',
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-only',
    SUPABASE_SECRET_KEY: 'test-only',
  }))
    vi.stubEnv(name, value);
  ledger.reserve.mockResolvedValue({ created: true, state: 'reserved', result: null });
  ledger.finish.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe('explicit retry advice and durable billing state', () => {
  it('allows a new operation after a confirmed unbilled rejection only when its failed state was saved', async () => {
    const rejected = new ProviderError('PROVIDER_RATE_LIMIT', 'Limite fournisseur.', 429);
    const execute = vi.fn(async (dispatch: () => void) => {
      dispatch();
      throw rejected;
    });
    await expect(runOperation(operation, execute)).rejects.toMatchObject({
      retry: 'new-operation',
    });
    expect(ledger.finish).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'failed', estimatedUsd: 0 }),
    );
    expect(execute).toHaveBeenCalledTimes(1);
  });
  it('requires reconciliation if the failed state could not be persisted, even after an unbilled rejection', async () => {
    ledger.finish.mockRejectedValue(new Error('Database connection lost'));
    await expect(
      runOperation(operation, async (dispatch) => {
        dispatch();
        throw new ProviderError('PROVIDER_RATE_LIMIT', 'Limite fournisseur.', 429);
      }),
    ).rejects.toMatchObject({ code: 'PROVIDER_RATE_LIMIT', retry: 'reconcile' });
    expect(ledger.reserve).toHaveBeenCalledTimes(1);
    expect(ledger.finish).toHaveBeenCalledTimes(1);
  });
  it.each([true, false])(
    'checks finalization after a rejection before dispatch (saved=%s)',
    async (saved) => {
      if (!saved) ledger.finish.mockRejectedValue(new Error('Storage unavailable'));
      await expect(
        runOperation(operation, async () => {
          throw new HttpError('SESSION_TIME_LIMIT', 'Temps écoulé.', 409);
        }),
      ).rejects.toMatchObject({
        code: 'SESSION_TIME_LIMIT',
        retry: saved ? 'new-operation' : 'reconcile',
      });
      expect(ledger.finish).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'failed', estimatedUsd: 0 }),
      );
    },
  );
  it('records measured successful usage once and returns only after durable finalization', async () => {
    const result = completedSessionFixture();
    const execute = vi.fn(async (dispatch: () => void) => {
      dispatch();
      return { result, usage };
    });
    await expect(runOperation(operation, execute)).resolves.toEqual(result);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(ledger.finish).toHaveBeenCalledTimes(1);
    expect(ledger.finish).toHaveBeenCalledWith({
      id: operation.id,
      userId: operation.userId,
      state: 'succeeded',
      result,
      usage,
      estimatedUsd: estimateUsd(usage),
    });
  });
  it('never recommends a fresh paid request when the successful finalization acknowledgement was lost', async () => {
    ledger.finish.mockRejectedValueOnce(new Error('Successful commit acknowledgement lost'));
    const execute = vi.fn(async (dispatch: () => void) => {
      dispatch();
      return { result: completedSessionFixture(), usage };
    });
    await expect(runOperation(operation, execute)).rejects.toMatchObject({ retry: 'reconcile' });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(ledger.finish).toHaveBeenLastCalledWith(
      expect.objectContaining({ state: 'unresolved' }),
    );
  });
  it('retains an ambiguous billed failure and its measured usage without rerunning the provider', async () => {
    const execute = vi.fn(async (dispatch: () => void) => {
      dispatch();
      throw new ProviderError('INVALID_MODEL_OUTPUT', 'Réponse invalide.', 502, true, usage);
    });
    await expect(runOperation(operation, execute)).rejects.toMatchObject({ retry: 'reconcile' });
    expect(ledger.finish).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'unresolved', usage, estimatedUsd: estimateUsd(usage) }),
    );
    expect(execute).toHaveBeenCalledTimes(1);
  });
  it.each([
    ['reserved', 'same-operation'],
    ['unresolved', 'reconcile'],
    ['failed', 'new-operation'],
  ])('returns safe advice for an already %s operation without dispatch', async (state, retry) => {
    ledger.reserve.mockResolvedValue({ created: false, state, result: null });
    const execute = vi.fn();
    await expect(runOperation(operation, execute)).rejects.toMatchObject({
      code: 'OPERATION_ALREADY_SUBMITTED',
      retry,
    });
    expect(execute).not.toHaveBeenCalled();
    expect(ledger.finish).not.toHaveBeenCalled();
  });
});

describe('authoritative business replays', () => {
  it('does not confuse a reconciled charge with a successful business result', async () => {
    ledger.reserve.mockResolvedValue({
      created: false,
      state: 'succeeded',
      result: null,
      reconciled: true,
    });
    const execute = vi.fn();
    const resolve = vi.fn().mockResolvedValue(completedSessionFixture());
    await expect(runOperation(operation, execute, true, resolve)).rejects.toMatchObject({
      code: 'OPERATION_RECONCILED',
      status: 409,
      retry: 'none',
    });
    expect(resolve).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(ledger.finish).not.toHaveBeenCalled();
  });
  it.each([true, false])(
    'loads the current revision instead of old feedback after an edit (cached=%s)',
    async (cached) => {
      const stale = completedSessionFixture();
      const amended = completedSessionFixture({
        revision: 5,
        feedbackRevision: undefined,
        feedback: undefined,
        status: 'active',
      });
      ledger.reserve.mockResolvedValue({
        created: false,
        state: 'succeeded',
        result: cached ? stale : null,
      });
      const execute = vi.fn();
      const resolve = vi.fn().mockResolvedValue(amended);
      await expect(runOperation(operation, execute, true, resolve)).resolves.toEqual(amended);
      expect(resolve).toHaveBeenCalledWith(cached ? stale : null);
      expect(execute).not.toHaveBeenCalled();
      expect(ledger.finish).not.toHaveBeenCalled();
    },
  );
  it('cannot restore a deleted session from its cached provider result', async () => {
    ledger.reserve.mockResolvedValue({
      created: false,
      state: 'succeeded',
      result: completedSessionFixture(),
    });
    const execute = vi.fn();
    await expect(
      runOperation(operation, execute, true, async () => {
        throw new HttpError('SESSION_NOT_FOUND', 'Conversation supprimée.', 404);
      }),
    ).rejects.toMatchObject({ code: 'SESSION_NOT_FOUND', status: 404 });
    expect(execute).not.toHaveBeenCalled();
  });
});
