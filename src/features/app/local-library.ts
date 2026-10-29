import { z } from 'zod';
import { stableVocabularyId, vocabularyKey } from '@/features/imports/parser';
import {
  sessionSchema,
  vocabularySchema,
  type SpeakingSession,
  type VocabularyItem,
} from '@/lib/contracts';

const collectionSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  createdAt: z.string().datetime(),
  items: z.array(vocabularySchema).max(500),
});
export type Collection = z.infer<typeof collectionSchema>;
const librarySchema = z.object({
  version: z.literal(1),
  collections: z.array(collectionSchema).max(30),
  history: z.array(sessionSchema).max(50),
});
export type LocalLibrary = z.infer<typeof librarySchema>;
export const emptyLibrary: LocalLibrary = { version: 1, collections: [], history: [] };
const storageKey = 'language-speaking-library-v1';

export function readLibrary(): LocalLibrary {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return emptyLibrary;
  const result = librarySchema.safeParse(JSON.parse(raw));
  if (!result.success)
    throw new Error(
      'Les données locales ne peuvent pas être lues. Exportez ou effacez les données du site avant de recommencer.',
    );
  return result.data;
}

export function writeLibrary(library: LocalLibrary): void {
  localStorage.setItem(storageKey, JSON.stringify(librarySchema.parse(library)));
}

export function addCollection(
  library: LocalLibrary,
  title: string,
  rows: VocabularyItem[],
): LocalLibrary {
  if (library.collections.length >= 30)
    throw new Error(
      'Vous avez atteint la limite de 30 collections locales. Supprimez une collection pour continuer.',
    );
  // Deduplicate only identical pairs; the same Korean expression can have different meanings.
  const seen = new Set<string>();
  const items = rows
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
  if (items.length === 0) throw new Error('Sélectionnez au moins une expression valide.');
  const signature = (entries: VocabularyItem[]) =>
    JSON.stringify(entries.map(vocabularyKey).sort());
  if (library.collections.some((collection) => signature(collection.items) === signature(items)))
    throw new Error(
      'Ces expressions sont déjà présentes ensemble dans une collection. Retrouvez-la dans votre bibliothèque.',
    );
  return {
    ...library,
    collections: [
      ...library.collections,
      { id: crypto.randomUUID(), title: title.trim(), createdAt: new Date().toISOString(), items },
    ],
  };
}

export function saveCompletedSession(
  library: LocalLibrary,
  session: SpeakingSession,
): LocalLibrary {
  return {
    ...library,
    history: [session, ...library.history.filter((previous) => previous.id !== session.id)].slice(
      0,
      50,
    ),
  };
}

export function downloadLibrary(library: LocalLibrary): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(library, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'language-speaking-backup.json';
  link.click();
  URL.revokeObjectURL(url);
}
