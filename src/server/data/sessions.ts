import 'server-only';
import { z } from 'zod';
import { sessionSchema, type SpeakingSession } from '@/lib/contracts';
import { createAdminSupabase, createUserSupabase } from '@/lib/supabase/server';
import { DataError } from './errors';

const idSchema = z.string().uuid();

export async function getSession(id: string, userId: string): Promise<SpeakingSession | null> {
  idSchema.parse(id);
  idSchema.parse(userId);
  const client = await createUserSupabase();
  const { data, error } = await client
    .from('speaking_sessions')
    .select('snapshot')
    .eq('id', id)
    .eq('owner_id', userId)
    .maybeSingle();
  if (error) throw new DataError('STORAGE_ERROR', 'Impossible de charger la conversation.');
  if (!data) return null;
  const result = sessionSchema.safeParse(data.snapshot);
  if (!result.success)
    throw new DataError('INVALID_STORED_SESSION', 'Cette conversation ne peut pas être chargée.');
  return result.data;
}

export async function createSession(session: SpeakingSession, userId: string): Promise<void> {
  const snapshot = sessionSchema.parse(session);
  idSchema.parse(userId);
  const { error } = await createAdminSupabase()
    .from('speaking_sessions')
    .insert({ id: snapshot.id, owner_id: userId, snapshot });
  if (error)
    throw new DataError(
      error.code === '23505' ? 'SESSION_EXISTS' : 'STORAGE_ERROR',
      'Impossible de créer la conversation.',
      error.code === '23505' ? 409 : 500,
    );
}

function sessionError(message: string): DataError {
  const known: Record<string, [string, number]> = {
    SESSION_NOT_FOUND: ['Conversation introuvable.', 404],
    SESSION_CONFLICT: ['La conversation a changé. Rechargez-la avant de réessayer.', 409],
    SESSION_BUSY: ['Une opération est encore en cours sur cette conversation.', 409],
    OPERATION_CONFLICT: ['Cet identifiant est déjà utilisé pour une autre opération.', 409],
    ACCOUNT_DELETING: ['La suppression du compte est en cours.', 409],
  };
  for (const [code, [text, status]] of Object.entries(known))
    if (message.includes(code)) return new DataError(code, text, status);
  return new DataError('STORAGE_ERROR', 'Impossible d’enregistrer la conversation.');
}

/** Call only while holding the session's durable provider-operation reservation. */
export async function saveSession(
  session: SpeakingSession,
  userId: string,
): Promise<SpeakingSession> {
  const snapshot = sessionSchema.parse(session);
  idSchema.parse(userId);
  const { data, error } = await createAdminSupabase().rpc('save_session_snapshot', {
    p_session_id: snapshot.id,
    p_owner_id: userId,
    p_expected_revision: snapshot.revision ?? 0,
    p_snapshot: snapshot,
  });
  if (error) throw sessionError(error.message);
  return sessionSchema.parse(data);
}

export async function updateSessionSnapshot(input: {
  session: SpeakingSession;
  userId: string;
  expectedRevision: number;
  operationId: string;
  fingerprint: string;
}): Promise<SpeakingSession> {
  const snapshot = sessionSchema.parse(input.session);
  idSchema.parse(input.userId);
  idSchema.parse(input.operationId);
  z.number().int().nonnegative().parse(input.expectedRevision);
  z.string().min(1).max(128).parse(input.fingerprint);
  const { data, error } = await createAdminSupabase().rpc('mutate_session_snapshot', {
    p_session_id: snapshot.id,
    p_owner_id: input.userId,
    p_expected_revision: input.expectedRevision,
    p_snapshot: snapshot,
    p_operation_id: input.operationId,
    p_fingerprint: input.fingerprint,
  });
  if (error) throw sessionError(error.message);
  return sessionSchema.parse(data);
}

export async function listSessions(
  userId: string,
  options: { before?: string; limit?: number } = {},
): Promise<{ sessions: SpeakingSession[]; nextCursor: string | null }> {
  idSchema.parse(userId);
  const limit = z
    .number()
    .int()
    .min(1)
    .max(50)
    .parse(options.limit ?? 50);
  let cursor: { createdAt: string; id: string } | undefined;
  if (options.before) {
    try {
      cursor = z
        .object({ createdAt: z.string().datetime({ offset: true }), id: idSchema })
        .parse(
          JSON.parse(
            Buffer.from(z.string().max(512).parse(options.before), 'base64url').toString('utf8'),
          ),
        );
    } catch {
      throw new DataError('INVALID_CURSOR', 'Le lien de pagination est invalide.', 400);
    }
  }
  let query = (await createUserSupabase())
    .from('speaking_sessions')
    .select('id,snapshot,created_at')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);
  if (cursor)
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    );
  const { data, error } = await query;
  if (error) throw new DataError('STORAGE_ERROR', 'Impossible de charger les conversations.');
  const rows = data ?? [];
  return {
    sessions: rows.slice(0, limit).map((row) => sessionSchema.parse(row.snapshot)),
    nextCursor:
      rows.length > limit
        ? Buffer.from(
            JSON.stringify({ createdAt: rows[limit - 1]!.created_at, id: rows[limit - 1]!.id }),
          ).toString('base64url')
        : null,
  };
}

export async function deleteSession(id: string, userId: string): Promise<void> {
  idSchema.parse(id);
  idSchema.parse(userId);
  const { error } = await createAdminSupabase().rpc('delete_owned_session', {
    p_id: id,
    p_owner_id: userId,
  });
  if (error)
    throw new DataError(
      error.message.includes('SESSION_BUSY') ? 'SESSION_BUSY' : 'STORAGE_ERROR',
      'Impossible de supprimer cette conversation pendant une opération.',
      error.message.includes('SESSION_BUSY') ? 409 : 500,
    );
}
