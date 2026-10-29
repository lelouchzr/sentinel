'use client';

import { z } from 'zod';
import { api, ApiClientError } from './client-api';
import {
  sessionSchema,
  sessionSetupSchema,
  type Hint,
  type SessionSetup,
  type SpeakingSession,
} from './contracts';
import {
  createLocalPractice,
  addLocalTurn,
  addLocalHint,
  finishLocalPractice,
  amendLocalTurn,
  flagLocalFeedback,
} from './local-practice';

export type PracticeMode = 'local' | 'live';
const storeKey = 'language-speaking-practice-v1';
const entrySchema = z.object({
  session: sessionSchema,
  operations: z.record(z.string().uuid(), z.string().max(24_000)),
});
const storeSchema = z.object({ version: z.literal(1), entries: z.array(entrySchema).max(50) });
type Store = z.infer<typeof storeSchema>;
function readStore(): Store {
  const raw = localStorage.getItem(storeKey);
  if (!raw) return { version: 1, entries: [] };
  if (raw.length > 6_000_000)
    throw new Error(
      'Le stockage local des conversations est trop volumineux. Exportez vos données avant de le vider.',
    );
  try {
    return storeSchema.parse(JSON.parse(raw));
  } catch {
    throw new Error(
      'Les conversations locales ne peuvent pas être lues. Les données existantes ont été conservées.',
    );
  }
}
function writeStore(store: Store) {
  try {
    localStorage.setItem(storeKey, JSON.stringify(storeSchema.parse(store)));
  } catch {
    throw new Error(
      'Le navigateur ne peut pas enregistrer cette conversation. Exportez vos données puis libérez de l’espace.',
    );
  }
}
function signature(kind: string, input: unknown): string {
  return JSON.stringify({ kind, input });
}
function localEntry(store: Store, id: string) {
  const entry = store.entries.find((entry) => entry.session.id === id);
  if (!entry)
    throw new ApiClientError(
      'SESSION_NOT_FOUND',
      'Cette conversation locale est introuvable. Revenez à votre bibliothèque.',
      'none',
      404,
    );
  return entry;
}
async function storageLock<T>(run: () => T): Promise<T> {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.locks)
    return navigator.locks.request(storeKey, run);
  return run();
}
function localMutation(
  session: SpeakingSession,
  operationId: string,
  kind: string,
  input: unknown,
  update: (current: SpeakingSession) => SpeakingSession,
): Promise<SpeakingSession> {
  z.string().uuid().parse(operationId);
  return storageLock(() => {
    const store = readStore();
    const entry = localEntry(store, session.id);
    const key = signature(kind, input);
    const existing = entry.operations[operationId];
    if (existing !== undefined) {
      if (existing !== key)
        throw new ApiClientError(
          'OPERATION_CONFLICT',
          'Cet envoi correspond à une autre action.',
          'none',
          409,
        );
      return entry.session;
    }
    if ((entry.session.revision ?? 0) !== (session.revision ?? 0))
      throw new ApiClientError(
        'REVISION_CONFLICT',
        'La conversation a changé dans un autre écran. Rechargez-la avant de continuer.',
        'none',
        409,
      );
    if (Object.keys(entry.operations).length >= 150)
      throw new Error('Cette conversation a atteint sa limite de modifications.');
    entry.session = sessionSchema.parse(update(entry.session));
    entry.operations[operationId] = key;
    writeStore(store);
    return entry.session;
  });
}
export async function startPractice(
  setup: SessionSetup,
  mode: PracticeMode,
  operationId: string,
): Promise<SpeakingSession> {
  const confirmed = sessionSetupSchema.parse(setup);
  z.string().uuid().parse(operationId);
  if (mode === 'live')
    return sessionSchema.parse(
      await api('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ operationId, setup: confirmed }),
      }),
    );
  return storageLock(() => {
    const store = readStore();
    const existing = store.entries.find((entry) => entry.session.id === operationId);
    const key = signature('start', confirmed);
    if (existing) {
      if (existing.operations[operationId] !== key)
        throw new Error('Cet identifiant a déjà servi à une autre conversation.');
      return existing.session;
    }
    if (store.entries.length >= 50)
      throw new Error(
        'Vous avez 50 conversations locales. Exportez puis supprimez une conversation pour continuer.',
      );
    const session = createLocalPractice(confirmed, operationId);
    store.entries.push({ session, operations: { [operationId]: key } });
    writeStore(store);
    return session;
  });
}
export async function getPracticeSession(
  id: string,
  mode: PracticeMode = 'live',
): Promise<SpeakingSession> {
  z.string().uuid().parse(id);
  return mode === 'local'
    ? localEntry(readStore(), id).session
    : sessionSchema.parse(await api(`/api/sessions/${id}`));
}
export async function sendPracticeTurn(
  session: SpeakingSession,
  input: {
    operationId: string;
    text: string;
    corrected?: boolean;
    inputMode?: 'spoken' | 'typed';
    transcriptionOperationId?: string;
  },
): Promise<SpeakingSession> {
  if (session.mode === 'local')
    return localMutation(session, input.operationId, 'turn', input, (current) =>
      addLocalTurn(current, input),
    );
  return sessionSchema.parse(
    await api(`/api/sessions/${session.id}/turns`, { method: 'POST', body: JSON.stringify(input) }),
  );
}
export async function requestPracticeHint(
  session: SpeakingSession,
  input: { operationId: string; targetId: string; level: Hint['level'] },
): Promise<SpeakingSession> {
  if (session.mode === 'local')
    return localMutation(session, input.operationId, 'hint', input, (current) =>
      addLocalHint(current, input),
    );
  return sessionSchema.parse(
    await api(`/api/sessions/${session.id}/hints`, { method: 'POST', body: JSON.stringify(input) }),
  );
}
export async function finishPractice(
  session: SpeakingSession,
  operationId: string,
): Promise<SpeakingSession> {
  if (session.mode === 'local')
    return localMutation(session, operationId, 'complete', {}, finishLocalPractice);
  return sessionSchema.parse(
    await api(`/api/sessions/${session.id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ operationId }),
    }),
  );
}
export async function deletePracticeSession(session: SpeakingSession): Promise<void> {
  if (session.mode !== 'local') return api(`/api/sessions/${session.id}`, { method: 'DELETE' });
  await storageLock(() => {
    const store = readStore();
    store.entries = store.entries.filter((entry) => entry.session.id !== session.id);
    writeStore(store);
  });
}
export async function amendPracticeTurn(
  session: SpeakingSession,
  input: { operationId: string; turnId: string; text: string },
): Promise<SpeakingSession> {
  if (session.mode === 'local')
    return localMutation(session, input.operationId, 'amend', input, (current) =>
      amendLocalTurn(current, input),
    );
  return sessionSchema.parse(
    await api(`/api/sessions/${session.id}/turns/${input.turnId}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...input, expectedRevision: session.revision ?? 0 }),
    }),
  );
}
export async function flagPracticeFeedback(
  session: SpeakingSession,
  input: { operationId: string; targetId: string; reason?: string },
): Promise<SpeakingSession> {
  if (session.mode === 'local')
    return localMutation(session, input.operationId, 'flag', input, (current) =>
      flagLocalFeedback(current, input),
    );
  return sessionSchema.parse(
    await api(`/api/sessions/${session.id}/feedback/flags`, {
      method: 'POST',
      body: JSON.stringify({ ...input, expectedRevision: session.revision ?? 0 }),
    }),
  );
}
export function clearLocalPractice(): void {
  localStorage.removeItem(storeKey);
}
export function restoreLocalPracticeSessions(sessions: SpeakingSession[]): void {
  const incoming = z.array(sessionSchema).max(50).parse(sessions);
  if (incoming.some((session) => session.mode !== 'local'))
    throw new Error('Seuls les entraînements locaux peuvent être restaurés sans compte.');
  const store = readStore();
  for (const session of incoming) {
    if (!store.entries.some((entry) => entry.session.id === session.id))
      store.entries.push({ session, operations: {} });
  }
  if (store.entries.length > 50)
    throw new Error(
      'La restauration dépasserait 50 conversations locales. Aucune conversation n’a été ajoutée.',
    );
  writeStore(store);
}
