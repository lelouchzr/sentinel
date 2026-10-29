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

/** Call only while holding the session's durable provider-operation reservation. */
export async function saveSession(session: SpeakingSession, userId: string): Promise<void> {
  const snapshot = sessionSchema.parse(session);
  idSchema.parse(userId);
  const { data, error } = await createAdminSupabase()
    .from('speaking_sessions')
    .update({ snapshot, updated_at: new Date().toISOString() })
    .eq('id', snapshot.id)
    .eq('owner_id', userId)
    .select('id')
    .maybeSingle();
  if (error) throw new DataError('STORAGE_ERROR', 'Impossible d’enregistrer la conversation.');
  if (!data) throw new DataError('SESSION_NOT_FOUND', 'Conversation introuvable.', 404);
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
