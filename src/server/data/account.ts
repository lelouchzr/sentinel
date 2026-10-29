import 'server-only';
import { z } from 'zod';
import { createAdminSupabase, createUserSupabase } from '@/lib/supabase/server';
import { DataError } from './errors';
import { usageSummarySchema, type UsageSummary } from '@/lib/cloud-contracts';

export async function accountDeletionPending(userId: string): Promise<boolean> {
  z.string().uuid().parse(userId);
  const { data, error } = await (
    await createUserSupabase()
  )
    .from('account_deletion_requests')
    .select('owner_id')
    .eq('owner_id', userId)
    .maybeSingle();
  if (error)
    throw new DataError(
      'SCHEMA_NOT_READY',
      'Appliquez les migrations du projet avant de continuer.',
      503,
    );
  return Boolean(data);
}

export async function getUsage(userId: string): Promise<UsageSummary> {
  z.string().uuid().parse(userId);
  const { data, error } = await createAdminSupabase().rpc('owned_usage_summary', {
    p_owner_id: userId,
  });
  if (error) throw new DataError('STORAGE_ERROR', 'Le suivi des dépenses est indisponible.');
  const summary = usageSummarySchema.parse(data);
  for (const provider of ['meta', 'azure'] as const)
    if (!summary.providers.some((item) => item.provider === provider))
      summary.providers.push({
        provider,
        estimatedUsd: 0,
        heldUsd: 0,
        operationCount: 0,
        pendingCount: 0,
        unresolvedCount: 0,
        hasUnknownCharges: false,
      });
  return summary;
}

async function readOwnedTable(
  table: 'vocabulary_collections' | 'speaking_sessions' | 'provider_operations',
  userId: string,
): Promise<Record<string, unknown>[]> {
  const client = createAdminSupabase();
  const rows: Record<string, unknown>[] = [];
  // Bounded pages avoid Supabase's default 1000-row truncation. No partial export is returned.
  for (let offset = 0; offset <= 10000; offset += 100) {
    const fields =
      table === 'provider_operations'
        ? 'id,session_id,kind,provider,state,reserved_usd,estimated_usd,usage,created_at,finished_at'
        : '*';
    const { data, error } = await client
      .from(table)
      .select(fields)
      .eq('owner_id', userId)
      .order('created_at')
      .order('id')
      .range(offset, Math.min(offset + 99, 10000));
    if (error) throw new DataError('EXPORT_FAILED', 'L’export du compte n’a pas pu être terminé.');
    rows.push(...((data ?? []) as unknown as Record<string, unknown>[]));
    if (rows.length > 10000) break;
    if (!data || data.length < 100) return rows;
  }
  throw new DataError(
    'EXPORT_TOO_LARGE',
    'Le compte dépasse la limite de cet export. Un export administratif complet est nécessaire.',
    413,
  );
}

export async function exportAccount(userId: string, email: string | null) {
  z.string().uuid().parse(userId);
  const [collections, sessions, operations] = await Promise.all([
    readOwnedTable('vocabulary_collections', userId),
    readOwnedTable('speaking_sessions', userId),
    readOwnedTable('provider_operations', userId),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    account: { id: userId, email },
    collections,
    sessions,
    operations,
    notes: [
      'Les enregistrements audio ne sont pas conservés sur le serveur.',
      'Les fichiers temporaires abandonnés ne sont pas inclus ; leur nettoyage est une opération distincte.',
      'Les données locales du navigateur sont exportées séparément depuis la bibliothèque.',
    ],
  };
}

export async function deleteAccount(userId: string): Promise<void> {
  z.string().uuid().parse(userId);
  const admin = createAdminSupabase();
  const { error: lockError } = await admin.rpc('begin_account_deletion', { p_owner_id: userId });
  if (lockError)
    throw new DataError(
      lockError.message.includes('ACCOUNT_BUSY') ? 'ACCOUNT_BUSY' : 'DELETE_FAILED',
      lockError.message.includes('ACCOUNT_BUSY')
        ? 'Une opération est encore en cours. Attendez sa fin avant de supprimer le compte.'
        : 'Impossible de préparer la suppression du compte.',
      409,
    );
  const bucket = admin.storage.from('vocabulary-pages');
  // Select exact owned object keys, including nested legacy keys, in bounded batches.
  // New uploads and provider dispatches are blocked before cleanup begins.
  for (let page = 0; page < 100; page++) {
    const { data, error } = await admin.rpc('owned_vocabulary_uploads', {
      p_owner_id: userId,
      p_limit: 100,
    });
    if (error)
      throw new DataError(
        'DELETE_INCOMPLETE',
        'La suppression des fichiers n’a pas abouti. Réessayez pour terminer la suppression du compte.',
        503,
      );
    const files = z
      .array(z.object({ name: z.string().min(1) }))
      .max(100)
      .parse(data);
    if (!files.length) break;
    if (
      files.some(
        (file) =>
          !file.name.startsWith(`${userId}/`) ||
          file.name.split('/').some((part) => part === '..' || part === '.' || !part),
      )
    )
      throw new DataError(
        'DELETE_INCOMPLETE',
        'Un chemin de stockage ne peut pas être supprimé automatiquement. Un nettoyage administratif est nécessaire.',
        409,
      );
    const { error: removeError } = await bucket.remove(files.map((file) => file.name));
    if (removeError)
      throw new DataError(
        'DELETE_INCOMPLETE',
        'Certains fichiers n’ont pas été supprimés. Réessayez pour terminer la suppression du compte.',
        503,
      );
    if (page === 99)
      throw new DataError(
        'DELETE_INCOMPLETE',
        'Les fichiers sont supprimés par lots. Réessayez pour terminer la suppression du compte.',
        409,
      );
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error)
    throw new DataError(
      'DELETE_INCOMPLETE',
      'Les fichiers ont été nettoyés, mais le compte n’a pas encore été supprimé. Réessayez.',
      503,
    );
  // Expire the browser session after deletion. Failure here does not resurrect the deleted account.
  try {
    await (await createUserSupabase()).auth.signOut({ scope: 'local' });
  } catch {
    /* Auth will reject this account on the next verified request. */
  }
}
