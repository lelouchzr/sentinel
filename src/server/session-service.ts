import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { sessionSchema, sessionSetupSchema, type SpeakingSession } from '@/lib/contracts';
import { getSession, createSession, saveSession } from '@/server/data/sessions';
import { planSession, replyToSession, createHint, evaluateSession } from '@/server/providers';
import { runOperation, fingerprint } from '@/server/usage/run-operation';
import { HttpError } from '@/server/http/errors';
import { boundedNumber } from '@/server/config';

export const createInput = z.object({ operationId: z.string().uuid(), setup: sessionSetupSchema });
export const turnInput = z.object({
  operationId: z.string().uuid(),
  text: z.string().trim().min(1).max(2000),
  corrected: z.boolean().default(false),
  inputMode: z.enum(['spoken', 'typed']).default('typed'),
});
export const hintInput = z.object({
  operationId: z.string().uuid(),
  targetId: z.string().min(1).max(100),
  level: z.enum(['meaning', 'starter', 'example']),
});
export const completeInput = z.object({ operationId: z.string().uuid() });

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
      markDispatched();
      const { data, usage } = await replyToSession(session, input.text);
      session.turns.push(
        {
          id: input.operationId,
          role: 'learner',
          text: input.text,
          corrected: input.corrected,
          inputMode: input.inputMode,
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
      await saveSession(session, userId);
      return { result: session, usage };
    },
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
      await saveSession(session, userId);
      return { result: session, usage };
    },
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
      session.status = 'completed';
      await saveSession(session, userId);
      return { result: session, usage };
    },
  );
}
