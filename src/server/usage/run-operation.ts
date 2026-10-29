import 'server-only';
import { createHash } from 'node:crypto';
import { reserveOperation, finishOperation } from '@/server/data/operations';
import { assertAiEnabled, boundedNumber } from '@/server/config';
import { HttpError } from '@/server/http/errors';
import { ProviderError, type ProviderUsage } from '@/server/providers/types';

/** Estimated from reported usage at the standard prices checked 2026-10-29. */
export function estimateUsd(usage: ProviderUsage): number | undefined {
  if (usage.provider !== 'meta') return undefined;
  if (usage.operation === 'transcribe' && usage.audioSeconds !== undefined)
    return (Math.ceil(usage.audioSeconds) * 0.18) / 3600;
  if (usage.inputTokens !== undefined && usage.outputTokens !== undefined)
    return (usage.inputTokens * 1.25 + usage.outputTokens * 4.25) / 1_000_000;
  return undefined;
}
export function fingerprint(value: unknown): string {
  return createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex');
}
export async function runOperation<T>(
  input: {
    id: string;
    userId: string;
    sessionId?: string;
    kind: string;
    provider?: 'meta' | 'azure';
    fingerprint: string;
  },
  execute: (markDispatched: () => void) => Promise<{ result: T; usage: ProviderUsage }>,
  replayable = true,
): Promise<T> {
  const provider = input.provider || 'meta';
  assertAiEnabled(provider);
  const limitUsd =
    provider === 'meta'
      ? Math.min(
          boundedNumber('META_RUN_LIMIT_USD', 5, 1, 120),
          boundedNumber('META_DEVELOPMENT_LIMIT_USD', 120, 1, 120),
        )
      : boundedNumber('AZURE_RUN_LIMIT_USD', 5, 1, 120);
  const reservation = await reserveOperation({
    ...input,
    provider,
    reservedUsd: 1,
    limitUsd,
    maxConcurrent: boundedNumber('AI_MAX_CONCURRENT_OPERATIONS', 2, 1, 2),
  });
  if (!reservation.created) {
    if (replayable && reservation.state === 'succeeded' && reservation.result !== null)
      return reservation.result as T;
    throw new HttpError(
      'OPERATION_ALREADY_SUBMITTED',
      reservation.state === 'unresolved'
        ? 'Cette opération attend une vérification de facturation. Elle ne sera pas relancée automatiquement.'
        : 'Cette opération a déjà été envoyée. Rechargez la conversation avant de réessayer.',
      409,
    );
  }
  let dispatched = false;
  try {
    const output = await execute(() => {
      dispatched = true;
    });
    const usage = Object.fromEntries(
      Object.entries(output.usage).filter(([, value]) => value !== undefined),
    );
    await finishOperation({
      id: input.id,
      userId: input.userId,
      state: 'succeeded',
      result: replayable ? output.result : undefined,
      usage,
      estimatedUsd: estimateUsd(output.usage),
    });
    return output.result;
  } catch (error) {
    // Unknown failures after dispatch keep their reservation. No implicit paid retry.
    const knownUnbilled = error instanceof ProviderError && !error.ambiguous && !error.usage;
    const beforeDispatch = !dispatched;
    const failedUsage =
      error instanceof ProviderError && error.usage
        ? Object.fromEntries(Object.entries(error.usage).filter(([, value]) => value !== undefined))
        : undefined;
    try {
      await finishOperation({
        id: input.id,
        userId: input.userId,
        state: knownUnbilled || beforeDispatch ? 'failed' : 'unresolved',
        estimatedUsd:
          knownUnbilled || beforeDispatch
            ? 0
            : error instanceof ProviderError && error.usage
              ? estimateUsd(error.usage)
              : undefined,
        usage: failedUsage,
      });
    } catch {
      /* Leave the durable reservation intact if finalization itself failed. */
    }
    throw error;
  }
}
