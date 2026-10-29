'use client';
import type { VocabularyItem } from './contracts';
import { createBrowserSupabase } from './supabase/browser';
import { api } from './client-api';
export async function extractPhoto(
  file: File,
): Promise<{ rows: VocabularyItem[]; warnings: string[] }> {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 5_242_880 ||
    file.size === 0
  ) {
    throw new Error('Choisissez une page au format JPEG, PNG ou WebP, de 5 Mo maximum.');
  }
  const client = createBrowserSupabase();
  const { data, error: authError } = await client.auth.getUser();
  if (authError || !data.user) throw new Error('Connectez-vous pour importer une page.');
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
  const objectPath = `${data.user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage
    .from('vocabulary-pages')
    .upload(objectPath, file, { contentType: file.type, upsert: false });
  if (error) throw new Error('L’envoi de la page a échoué. Vérifiez le stockage Supabase.');
  try {
    return await api('/api/imports/extract', {
      method: 'POST',
      body: JSON.stringify({ objectPath, operationId: crypto.randomUUID() }),
    });
  } finally {
    // Also attempted server-side. A retention task is still required for abandoned uploads.
    await client.storage.from('vocabulary-pages').remove([objectPath]);
  }
}
