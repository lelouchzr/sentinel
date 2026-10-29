import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { sessionSchema, sessionSetupSchema, type SpeakingSession } from '@/lib/contracts';
import {
  getSession,
  createSession,
  saveSession,
  updateSessionSnapshot,
} from '@/server/data/sessions';
import {
  amendSessionTranscript,
  flagSessionFeedback,
  amendmentInputSchema,
  feedbackFlagInputSchema,
} from '@/lib/session-mutations';
import { planSession, replyToSession, createHint, evaluateSession } from '@/server/providers';
import { runOperation, fingerprint } from '@/server/usage/run-operation';
import { getVerifiedTranscription } from '@/server/data/operations';
import { HttpError } from '@/server/http/errors';
import { boundedNumber } from '@/server/config';

export const createInput = z.object({ operationId: z.string().uuid(), setup: sessionSetupSchema });
export const turnInput = z.object({
  operationId: z.string().uuid(),
  text: z.string().trim().min(1).max(2000),
  corrected: z.boolean().default(false),
  inputMode: z.enum(['spoken', 'typed']).default('typed'),
  transcriptionOperationId: z.string().uuid().optional(),
});
export const hintInput = z.object({
  operationId: z.string().uuid(),
  targetId: z.string().min(1).max(100),
  level: z.enum(['meaning', 'starter', 'example']),
});
export const completeInput = z.object({ operationId: z.string().uuid() });
const expectedRevisionSchema = z.number().int().nonnegative().optional();
export const amendInput = amendmentInputSchema
  .omit({ turnId: true })
  .extend({ expectedRevision: expectedRevisionSchema });
export const flagInput = feedbackFlagInputSchema.extend({
  expectedRevision: expectedRevisionSchema,
});

export async function loadSession(id: string, userId: string): Promise<SpeakingSession> {
  z.string().uuid().parse(id);
  const session = await getSession(id, userId);
  if (!session)
    throw new HttpError('SESSION_NOT_FOUND', 'Cette conversation est introuvable.', 404);
  return session;
}
export function assertActive(session: SpeakingSession, checkTime = true): void {
  if (session.status !== 'active')
    throw new HttpError('SESSION_COMPLETED', 'Cette conversation est terminée.', 409);
  if (
    checkTime &&
    Date.now() - new Date(session.createdAt).getTime() >
      boundedNumber('MAX_SESSION_SECONDS', 300, 30, 300) * 1000
  ) {
    throw new HttpError(
      'SESSION_TIME_LIMIT',
      'Les cinq minutes sont écoulées. Terminez la session pour voir votre bilan.',
      409,
    );
  }
}
export function assertCanAddTurn(session: SpeakingSession): void {
  assertActive(session);
  if (
    session.turns.filter((turn) => turn.role === 'learner').length >=
    boundedNumber('MAX_SESSION_TURNS', 8, 1, 8)
  ) {
    throw new HttpError(
      'TURN_LIMIT',
      'Vous avez terminé les huit tours. Découvrez votre bilan.',
      409,
    );
  }
}
export async function startSession(raw: unknown, userId: string) {
  const input = createInput.parse(raw);
  if (new Set(input.setup.targets.map((item) => item.id)).size !== 3)
    throw new HttpError('DUPLICATE_TARGETS', 'Choisissez trois expressions différentes.');
  return runOperation(
    {
      id: input.operationId,
      userId,
      sessionId: input.operationId,
      kind: 'plan',
      fingerprint: fingerprint(input.setup),
    },
    async (markDispatched) => {
      markDispatched();
      const { data, usage } = await planSession(input.setup);
      const createdAt = new Date().toISOString();
      const session = sessionSchema.parse({
        id: input.operationId,
        mode: 'live',
        revision: 0,
        setup: input.setup,
        status: 'active',
        scene: data.scene,
        turns: [
          { id: randomUUID(), role: 'partner', text: data.opening, corrected: false, createdAt },
        ],
        hints: [],
        createdAt,
      });
      await createSession(session, userId);
      return { result: session, usage };
    },
    true,
    () => loadSession(input.operationId, userId),
  );
}
export async function addTurn(id: string, raw: unknown, userId: string) {
  const input = turnInput.parse(raw);
  await loadSession(id, userId);
  return runOperation(
    {
      id: input.operationId,
      userId,
      sessionId: id,
      kind: 'reply',
      fingerprint: fingerprint(input),
    },
    async (markDispatched) => {
      const session = await loadSession(id, userId); // Read again after acquiring the durable session lock.
      assertCanAddTurn(session);
      if (session.turns.some((turn) => turn.id === input.operationId))
        throw new HttpError(
          'TURN_ID_CONFLICT',
          'Cet identifiant appartient déjà à une prise de parole.',
          409,
        );
      let corrected = input.corrected;
      let transcriptionOperationId: string | undefined;
      if (input.inputMode === 'spoken') {
        const transcription = input.transcriptionOperationId
          ? await getVerifiedTranscription(input.transcriptionOperationId, userId, id)
          : null;
        if (!transcription)
          throw new HttpError(
            'TRANSCRIPTION_REQUIRED',
            'Une transcription vérifiée est nécessaire pour enregistrer une réponse orale. Enregistrez votre voix ou envoyez une réponse écrite.',
          );
        if (
          session.turns.some(
            (turn) => turn.transcriptionOperationId === input.transcriptionOperationId,
          )
        )
          throw new HttpError(
            'TRANSCRIPTION_REUSED',
            'Cet enregistrement a déjà été utilisé pour une prise de parole. Enregistrez une nouvelle réponse.',
            409,
          );
        transcriptionOperationId = input.transcriptionOperationId;
        // The verified ASR result, rather than a client boolean, establishes whether text changed.
        corrected ||= input.text !== transcription.text.trim();
      }
      markDispatched();
      const { data, usage } = await replyToSession(session, input.text);
      session.turns.push(
        {
          id: input.operationId,
          role: 'learner',
          text: input.text,
          corrected,
          inputMode: input.inputMode,
          ...(transcriptionOperationId ? { transcriptionOperationId } : {}),
          createdAt: new Date().toISOString(),
        },
        {
          id: randomUUID(),
          role: 'partner',
          text: data.reply,
          corrected: false,
          createdAt: new Date().toISOString(),
        },
      );
      const saved = await saveSession(session, userId);
      return { result: saved, usage };
    },
    true,
    () => loadSession(id, userId),
  );
}
export async function revealHint(id: string, raw: unknown, userId: string) {
  const input = hintInput.parse(raw);
  await loadSession(id, userId);
  return runOperation(
    { id: input.operationId, userId, sessionId: id, kind: 'hint', fingerprint: fingerprint(input) },
    async (markDispatched) => {
      const session = await loadSession(id, userId);
      assertActive(session);
      if (!session.setup.targets.some((item) => item.id === input.targetId))
        throw new HttpError(
          'UNKNOWN_TARGET',
          'Cette expression ne fait pas partie de la conversation.',
        );
      const levels = ['meaning', 'starter', 'example'];
      const priorHints = session.hints.filter((hint) => hint.targetId === input.targetId);
      if (levels[priorHints.length] !== input.level)
        throw new HttpError('HINT_ORDER', 'Les indices se révèlent progressivement.', 409);
      markDispatched();
      const { data, usage } = await createHint(session, input.targetId, input.level);
      session.hints.push({
        id: input.operationId,
        targetId: input.targetId,
        level: input.level,
        text: data.text,
        beforeTurn: session.turns.filter((turn) => turn.role === 'learner').length,
      });
      const saved = await saveSession(session, userId);
      return { result: saved, usage };
    },
    true,
    () => loadSession(id, userId),
  );
}
export async function completeSession(id: string, raw: unknown, userId: string) {
  const input = completeInput.parse(raw);
  const initial = await loadSession(id, userId);
  if (initial.status === 'completed') return initial;
  return runOperation(
    {
      id: input.operationId,
      userId,
      sessionId: id,
      kind: 'evaluate',
      fingerprint: fingerprint({ sessionId: id }),
    },
    async (markDispatched) => {
      const session = await loadSession(id, userId);
      assertActive(session, false);
      if (!session.turns.some((turn) => turn.role === 'learner'))
        throw new HttpError(
          'NO_LEARNER_TURN',
          'Ajoutez au moins une réponse avant de demander un bilan.',
        );
      markDispatched();
      const { data, usage } = await evaluateSession(session);
      session.feedback = data;
      session.feedbackRevision = (session.revision ?? 0) + 1;
      session.status = 'completed';
      const saved = await saveSession(session, userId);
      return { result: saved, usage };
    },
    true,
    () => loadSession(id, userId),
  );
}

export async function amendTranscript(
  id: string,
  turnId: string,
  raw: unknown,
  userId: string,
): Promise<SpeakingSession> {
  const input = amendInput.parse(raw);
  const session = await loadSession(id, userId);
  const next = amendSessionTranscript(session, { ...input, turnId });
  // A confirmed audit entry makes retries safe even after additional revisions.
  if (session.amendments?.some((entry) => entry.operationId === input.operationId)) return next;
  return updateSessionSnapshot({
    session: next,
    userId,
    expectedRevision: input.expectedRevision ?? session.revision ?? 0,
    operationId: input.operationId,
    fingerprint: fingerprint({ kind: 'amend', turnId, text: input.text }),
  });
}

export async function flagFeedback(
  id: string,
  raw: unknown,
  userId: string,
): Promise<SpeakingSession> {
  const input = flagInput.parse(raw);
  const session = await loadSession(id, userId);
  const next = flagSessionFeedback(session, input);
  if (session.feedbackFlags?.some((entry) => entry.operationId === input.operationId)) return next;
  return updateSessionSnapshot({
    session: next,
    userId,
    expectedRevision: input.expectedRevision ?? session.revision ?? 0,
    operationId: input.operationId,
    fingerprint: fingerprint({ kind: 'flag', targetId: input.targetId, reason: input.reason }),
  });
}
