import 'server-only';
import { z } from 'zod';
import { createAdminSupabase } from '@/lib/supabase/server';
import { DataError } from './errors';

export const cleanupSchema = z.object({
  dryRun: z.boolean().default(true),
  limit: z.number().int().min(1).max(200).default(100),
});
export async function cleanupUploads(raw: unknown) {
  const input = cleanupSchema.parse(raw);
  const admin = createAdminSupabase();
  const before = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin.rpc('stale_vocabulary_uploads', {
    p_before: before,
    p_limit: input.limit,
  });
  if (error) throw new DataError('CLEANUP_FAILED', 'Le nettoyage des fichiers est indisponible.');
  const rows = z
    .array(z.object({ name: z.string().min(1) }))
    .max(200)
    .parse(data);
  if (!input.dryRun && rows.length) {
    const { error: removeError } = await admin.storage
      .from('vocabulary-pages')
      .remove(rows.map((row) => row.name));
    if (removeError)
      throw new DataError(
        'CLEANUP_FAILED',
        'Le nettoyage n’a pas abouti ; aucun nombre de suppressions ne peut être confirmé.',
      );
  }
  return {
    dryRun: input.dryRun,
    candidates: rows.length,
    deleted: input.dryRun ? 0 : rows.length,
    hasMore: rows.length === input.limit,
    olderThan: before,
  };
}
export const reconcileSchema = z.object({
  operationId: z.string().uuid(),
  billedUsd: z.number().min(0).max(1000),
  reason: z.string().trim().min(20).max(500),
  reference: z.string().trim().min(3).max(300),
});
export async function reconcileOperation(raw: unknown) {
  const input = reconcileSchema.parse(raw);
  const { error } = await createAdminSupabase().rpc('reconcile_provider_operation', {
    p_id: input.operationId,
    p_billed_usd: input.billedUsd,
    p_reason: input.reason,
    p_reference: input.reference,
  });
  if (error) {
    const known: Record<string, [string, number]> = {
      OPERATION_NOT_FOUND: ['Cette opération est introuvable.', 404],
      OPERATION_STILL_RUNNING: [
        'Cette opération peut encore être en cours. Vérifiez son résultat avant toute réconciliation.',
        409,
      ],
      OPERATION_ALREADY_FINALIZED: ['Cette opération a déjà été réglée.', 409],
    };
    for (const [code, [message, status]] of Object.entries(known))
      if (error.message.includes(code)) throw new DataError(code, message, status);
    throw new DataError('RECONCILIATION_FAILED', 'La réconciliation n’a pas abouti.');
  }
  return { operationId: input.operationId, billedUsd: input.billedUsd, reconciled: true };
}
