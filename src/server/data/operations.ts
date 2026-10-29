import 'server-only';
import { z } from 'zod';
import { createAdminSupabase } from '@/lib/supabase/server';
import { DataError } from './errors';

const reservationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  kind: z.string().min(1).max(80),
  provider: z.enum(['meta', 'azure']),
  fingerprint: z.string().min(1).max(128),
  reservedUsd: z.number().positive(),
  limitUsd: z.number().positive().max(120),
  maxConcurrent: z.number().int().min(1).max(2),
});
const resultSchema = z.object({
  state: z.enum(['reserved', 'succeeded', 'failed', 'unresolved']),
  result: z.unknown().nullable(),
  created: z.boolean(),
  // Billing reconciliation cannot establish that the application received a usable result.
  reconciled: z.boolean().optional(),
});
export type Reservation = z.infer<typeof resultSchema>;

const errorMessages: Record<string, { status: number; message: string }> = {
  ACCOUNT_DELETING: { status: 409, message: 'La suppression du compte est en cours.' },
  OPERATION_CONFLICT: {
    status: 409,
    message: 'Cet identifiant est déjà utilisé pour une autre opération.',
  },
  SESSION_BUSY: {
    status: 409,
    message: 'Une opération est déjà en cours pour cette conversation.',
  },
  CONCURRENCY_LIMIT: {
    status: 429,
    message: 'Deux opérations sont déjà en cours. Réessaie dans quelques instants.',
  },
  BUDGET_EXCEEDED: { status: 429, message: 'Le budget de développement disponible est épuisé.' },
  SESSION_NOT_FOUND: { status: 404, message: 'Conversation introuvable.' },
  OPERATION_NOT_FOUND: { status: 404, message: 'Opération introuvable.' },
  OPERATION_ALREADY_FINALIZED: { status: 409, message: 'Cette opération est déjà finalisée.' },
};
function databaseError(message: string): DataError {
  for (const [code, details] of Object.entries(errorMessages))
    if (message.includes(code)) return new DataError(code, details.message, details.status);
  return new DataError('STORAGE_ERROR', 'Le suivi sécurisé des opérations est indisponible.');
}

export async function reserveOperation(
  input: z.infer<typeof reservationSchema>,
): Promise<Reservation> {
  const value = reservationSchema.parse(input);
  const { data, error } = await createAdminSupabase().rpc('reserve_provider_operation', {
    p_id: value.id,
    p_owner_id: value.userId,
    p_session_id: value.sessionId ?? null,
    p_kind: value.kind,
    p_provider: value.provider,
    p_fingerprint: value.fingerprint,
    p_reserved_usd: value.reservedUsd,
    p_limit_usd: value.limitUsd,
    p_max_concurrent: value.maxConcurrent,
  });
  if (error) throw databaseError(error.message);
  const parsed = resultSchema.safeParse(data);
  if (!parsed.success)
    throw new DataError(
      'INVALID_RESERVATION',
      'La réservation de budget n’a pas pu être vérifiée.',
    );
  return parsed.data;
}

const finishSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  state: z.enum(['succeeded', 'failed', 'unresolved']),
  result: z.unknown().optional(),
  estimatedUsd: z.number().nonnegative().optional(),
  usage: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
export async function finishOperation(input: z.infer<typeof finishSchema>): Promise<void> {
  const value = finishSchema.parse(input);
  const { error } = await createAdminSupabase().rpc('finish_provider_operation', {
    p_id: value.id,
    p_owner_id: value.userId,
    p_state: value.state,
    p_result: value.result ?? null,
    p_estimated_usd: value.estimatedUsd ?? null,
    p_usage: value.usage ?? null,
  });
  if (error) throw databaseError(error.message);
}

/** ASR provenance is server-owned; client labels alone do not establish spoken evidence. */
export async function getVerifiedTranscription(
  operationId: string,
  userId: string,
  sessionId: string,
): Promise<{ text: string } | null> {
  z.string().uuid().parse(operationId);
  z.string().uuid().parse(userId);
  z.string().uuid().parse(sessionId);
  const { data, error } = await createAdminSupabase()
    .from('provider_operations')
    .select('result')
    .eq('id', operationId)
    .eq('owner_id', userId)
    .eq('session_id', sessionId)
    .eq('kind', 'transcribe')
    .eq('state', 'succeeded')
    .maybeSingle();
  if (error) throw new DataError('STORAGE_ERROR', 'Impossible de vérifier cette transcription.');
  const result = z.object({ text: z.string().trim().min(1).max(2000) }).safeParse(data?.result);
  return result.success ? result.data : null;
}
