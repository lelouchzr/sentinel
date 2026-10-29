import 'server-only';
import { z } from 'zod';
import {
  cloudCollectionSchema,
  createCollectionSchema,
  updateCollectionSchema,
  type CloudCollection,
} from '@/lib/cloud-contracts';
import { createAdminSupabase, createUserSupabase } from '@/lib/supabase/server';
import { stableVocabularyId, vocabularyKey } from '@/features/imports/parser';
import { DataError } from './errors';

const uuid = z.string().uuid();
function mapCollection(row: Record<string, unknown>): CloudCollection {
  return cloudCollectionSchema.parse({
    id: row.id,
    title: row.title,
    items: row.items,
    revision: row.revision,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  });
}
function normalizeItems(items: CloudCollection['items']): CloudCollection['items'] {
  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = vocabularyKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => ({
      ...item,
      expression: item.expression.normalize('NFC').trim(),
      meaning: item.meaning.normalize('NFC').trim(),
      id: stableVocabularyId(vocabularyKey(item)),
    }));
}
function collectionError(message: string): DataError {
  const details: Record<string, [string, number]> = {
    COLLECTION_NOT_FOUND: ['Cette collection est introuvable.', 404],
    COLLECTION_CONFLICT: [
      'La collection a changé dans un autre onglet. Rechargez-la avant de réessayer.',
      409,
    ],
    COLLECTION_LIMIT: ['La limite de 30 collections sur ce compte est atteinte.', 409],
    ACCOUNT_DELETING: ['La suppression du compte est en cours.', 409],
  };
  for (const [code, [text, status]] of Object.entries(details))
    if (message.includes(code)) return new DataError(code, text, status);
  return new DataError('STORAGE_ERROR', 'Impossible d’enregistrer cette collection.');
}
export async function listCollections(userId: string): Promise<CloudCollection[]> {
  uuid.parse(userId);
  const { data, error } = await (
    await createUserSupabase()
  )
    .from('vocabulary_collections')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(31);
  if (error) throw new DataError('STORAGE_ERROR', 'Impossible de charger les collections.');
  if ((data?.length ?? 0) > 30)
    throw new DataError(
      'COLLECTION_LIMIT',
      'Le compte contient plus de collections que cette version ne peut afficher.',
      409,
    );
  return (data ?? []).map(mapCollection);
}
export async function createCollection(raw: unknown, userId: string): Promise<CloudCollection> {
  const input = createCollectionSchema.parse(raw);
  uuid.parse(userId);
  const { data, error } = await createAdminSupabase().rpc('write_vocabulary_collection', {
    p_id: input.id,
    p_owner_id: userId,
    p_title: input.title,
    p_items: normalizeItems(input.items),
    p_expected_revision: null,
  });
  if (error) throw collectionError(error.message);
  return mapCollection(data);
}
export async function updateCollection(
  id: string,
  raw: unknown,
  userId: string,
): Promise<CloudCollection> {
  const input = updateCollectionSchema.parse(raw);
  uuid.parse(id);
  uuid.parse(userId);
  const { data, error } = await createAdminSupabase().rpc('write_vocabulary_collection', {
    p_id: id,
    p_owner_id: userId,
    p_title: input.title,
    p_items: normalizeItems(input.items),
    p_expected_revision: input.revision,
  });
  if (error) throw collectionError(error.message);
  return mapCollection(data);
}
export async function deleteCollection(
  id: string,
  revision: number,
  userId: string,
): Promise<void> {
  uuid.parse(id);
  uuid.parse(userId);
  z.number().int().nonnegative().parse(revision);
  const { error } = await createAdminSupabase().rpc('delete_vocabulary_collection', {
    p_id: id,
    p_owner_id: userId,
    p_expected_revision: revision,
  });
  if (error) throw collectionError(error.message);
}
