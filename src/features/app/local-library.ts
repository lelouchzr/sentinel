import { z } from 'zod';
import { stableVocabularyId, vocabularyKey } from '@/features/imports/parser';
import {
  sessionSchema,
  vocabularySchema,
  type SpeakingSession,
  type VocabularyItem,
} from '@/lib/contracts';

export const collectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(100),
  createdAt: z.string().datetime(),
  items: z.array(vocabularySchema).min(1).max(500),
});
export type Collection = z.infer<typeof collectionSchema>;
export const librarySchema = z.object({
  version: z.literal(1),
  collections: z.array(collectionSchema).max(30),
  history: z.array(sessionSchema).max(50),
});
export type LocalLibrary = z.infer<typeof librarySchema>;
export const emptyLibrary: LocalLibrary = { version: 1, collections: [], history: [] };
export const storageKey = 'language-speaking-library-v1';
const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

export function readLibrary(): LocalLibrary {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return emptyLibrary;
  try {
    const result = librarySchema.parse(JSON.parse(raw));
    // Live history is loaded from the verified account, never from an anonymous shared cache.
    return { ...result, history: result.history.filter((entry) => entry.mode === 'local') };
  } catch {
    throw new Error(
      'Les données locales sont illisibles. Téléchargez leur copie dans les réglages avant de les réinitialiser.',
    );
  }
}

export function writeLibrary(library: LocalLibrary): void {
  const validated = librarySchema.parse(library);
  try {
    localStorage.setItem(storageKey, JSON.stringify(validated));
  } catch {
    throw new Error(
      'Votre navigateur ne peut pas enregistrer cette bibliothèque. Exportez vos données puis libérez de l’espace ou autorisez le stockage local.',
    );
  }
}
export function clearLocalLibrary(): void {
  localStorage.removeItem(storageKey);
  sessionStorage.removeItem('language-speaking-active-session');
}

export function canonicalItems(rows: VocabularyItem[]): VocabularyItem[] {
  const seen = new Set<string>();
  const items = rows
    .map((row, index) => {
      const result = vocabularySchema.safeParse(row);
      if (!result.success)
        throw new Error(
          `Vérifiez l’expression ${index + 1} : le coréen et la traduction sont obligatoires et doivent respecter les limites indiquées.`,
        );
      return result.data;
    })
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
  if (!items.length || items.length > 500)
    throw new Error('Une collection doit contenir de 1 à 500 expressions valides.');
  return items;
}
function validTitle(title: string): string {
  const result = collectionSchema.shape.title.safeParse(title);
  if (!result.success) throw new Error('Donnez à votre collection un nom de 1 à 100 caractères.');
  return result.data;
}
const signature = (items: VocabularyItem[]) => JSON.stringify(items.map(vocabularyKey).sort());

export function addCollection(
  library: LocalLibrary,
  title: string,
  rows: VocabularyItem[],
): LocalLibrary {
  if (library.collections.length >= 30)
    throw new Error('La limite de 30 collections locales est atteinte.');
  const items = canonicalItems(rows);
  if (library.collections.some((collection) => signature(collection.items) === signature(items)))
    throw new Error(
      'Ces expressions sont déjà présentes ensemble dans une collection. Retrouvez-la dans votre bibliothèque.',
    );
  const collection = collectionSchema.parse({
    id: crypto.randomUUID(),
    title: validTitle(title),
    createdAt: new Date().toISOString(),
    items,
  });
  return { ...library, collections: [...library.collections, collection] };
}

export function updateCollection(
  library: LocalLibrary,
  id: string,
  title: string,
  rows: VocabularyItem[],
): LocalLibrary {
  const current = library.collections.find((collection) => collection.id === id);
  if (!current) throw new Error('Cette collection n’existe plus.');
  const items = canonicalItems(rows);
  if (
    library.collections.some(
      (collection) => collection.id !== id && signature(collection.items) === signature(items),
    )
  )
    throw new Error('Une collection contient déjà exactement ces expressions.');
  const updated = collectionSchema.parse({ ...current, title: validTitle(title), items });
  // A changed expression receives a different content identity; old session snapshots stay untouched.
  return {
    ...library,
    collections: library.collections.map((collection) =>
      collection.id === id ? updated : collection,
    ),
  };
}

export function parseLibraryBackup(text: string): LocalLibrary {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES)
    throw new Error('Cette archive dépasse 10 Mo.');
  let parsed: LocalLibrary;
  try {
    parsed = librarySchema.parse(JSON.parse(text));
  } catch {
    throw new Error('Cette archive Language Speaking est invalide. Aucun élément n’a été ajouté.');
  }
  if (
    new Set(parsed.collections.map((collection) => collection.id)).size !==
    parsed.collections.length
  )
    throw new Error('Cette archive contient des identifiants de collection en double.');
  if (new Set(parsed.history.map((session) => session.id)).size !== parsed.history.length)
    throw new Error('Cette archive contient des conversations en double.');
  return {
    ...parsed,
    collections: parsed.collections.map((collection) => ({
      ...collection,
      items: canonicalItems(collection.items),
    })),
    history: parsed.history.filter((entry) => entry.mode === 'local'),
  };
}

export function mergeLibraryBackup(current: LocalLibrary, backup: LocalLibrary): LocalLibrary {
  const collections = [...current.collections];
  for (const source of backup.collections) {
    if (collections.some((collection) => signature(collection.items) === signature(source.items)))
      continue;
    collections.push({
      ...source,
      id: collections.some((collection) => collection.id === source.id)
        ? crypto.randomUUID()
        : source.id,
    });
  }
  if (collections.length > 30)
    throw new Error('La fusion dépasserait 30 collections. Aucune donnée n’a été modifiée.');
  const sessions = new Map(
    current.history.filter((entry) => entry.mode === 'local').map((entry) => [entry.id, entry]),
  );
  for (const entry of backup.history)
    if (entry.mode === 'local' && !sessions.has(entry.id)) sessions.set(entry.id, entry);
  if (sessions.size > 50)
    throw new Error(
      'La fusion dépasserait 50 conversations locales. Supprimez-en avant de restaurer cette archive.',
    );
  return librarySchema.parse({
    version: 1,
    collections,
    history: [...sessions.values()].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    ),
  });
}

export function saveCompletedSession(
  library: LocalLibrary,
  session: SpeakingSession,
): LocalLibrary {
  if (session.mode !== 'local') return library;
  return {
    ...library,
    history: [session, ...library.history.filter((previous) => previous.id !== session.id)].slice(
      0,
      50,
    ),
  };
}

export function downloadJson(content: unknown, filename: string): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadLibrary(library: LocalLibrary): void {
  downloadJson(librarySchema.parse(library), 'language-speaking-backup.json');
}
export function downloadRawLocalData(): void {
  const raw = localStorage.getItem(storageKey);
  const url = URL.createObjectURL(new Blob([raw ?? '{}'], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'language-speaking-local-recovery.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
