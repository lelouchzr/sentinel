import { z } from 'zod';
import { sessionSchema, type SpeakingSession } from '@/lib/contracts';

export class SessionMutationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = 'SessionMutationError';
  }
}

export const amendmentInputSchema = z.object({
  operationId: z.string().uuid(),
  turnId: z.string().min(1).max(100),
  text: z.string().trim().min(1).max(2000),
});
export const feedbackFlagInputSchema = z.object({
  operationId: z.string().uuid(),
  targetId: z.string().min(1).max(100),
  reason: z.string().trim().max(1000).default('Ce retour ne correspond pas à ma tentative.'),
});

function timestamp(now: Date): string {
  if (!Number.isFinite(now.getTime()))
    throw new SessionMutationError('INVALID_DATE', 'La date de modification est invalide.');
  return now.toISOString();
}
function conflict(): never {
  throw new SessionMutationError(
    'OPERATION_CONFLICT',
    'Cet identifiant correspond déjà à une autre modification.',
    409,
  );
}

/** Keeps historical replies, but withdraws their dependent evaluation until an explicit rerun. */
export function amendSessionTranscript(
  source: SpeakingSession,
  raw: z.input<typeof amendmentInputSchema>,
  now = new Date(),
): SpeakingSession {
  const input = amendmentInputSchema.parse(raw);
  const session = sessionSchema.parse(source);
  const previous = session.amendments?.find((entry) => entry.operationId === input.operationId);
  if (previous) {
    if (previous.turnId !== input.turnId || previous.text !== input.text) return conflict();
    return session;
  }
  if (session.feedbackFlags?.some((entry) => entry.operationId === input.operationId))
    return conflict();
  const turn = session.turns.find((entry) => entry.id === input.turnId && entry.role === 'learner');
  if (!turn)
    throw new SessionMutationError('TURN_NOT_FOUND', 'Cette prise de parole est introuvable.', 404);
  if (turn.text === input.text)
    throw new SessionMutationError(
      'NO_TRANSCRIPT_CHANGE',
      'Le texte est identique à la version enregistrée.',
    );
  if ((session.amendments?.length ?? 0) >= 50)
    throw new SessionMutationError(
      'AMENDMENT_LIMIT',
      'Cette conversation a atteint la limite de corrections.',
      409,
    );
  const revision = (session.revision ?? 0) + 1;
  const createdAt = timestamp(now);
  const { feedback: _feedback, feedbackRevision: _feedbackRevision, ...rest } = session;
  return sessionSchema.parse({
    ...rest,
    revision,
    status: 'active',
    turns: session.turns.map((entry) =>
      entry.id === input.turnId ? { ...entry, text: input.text, corrected: true } : entry,
    ),
    amendments: [
      ...(session.amendments ?? []),
      {
        operationId: input.operationId,
        turnId: input.turnId,
        previousText: turn.text,
        text: input.text,
        createdAt,
        revision,
      },
    ],
  });
}

/** User-disputed feedback is never silently restored by a later model evaluation. */
export function flagSessionFeedback(
  source: SpeakingSession,
  raw: z.input<typeof feedbackFlagInputSchema>,
  now = new Date(),
): SpeakingSession {
  const input = feedbackFlagInputSchema.parse(raw);
  const session = sessionSchema.parse(source);
  const previous = session.feedbackFlags?.find((entry) => entry.operationId === input.operationId);
  if (previous) {
    if (previous.targetId !== input.targetId || previous.reason !== input.reason) return conflict();
    return session;
  }
  if (session.amendments?.some((entry) => entry.operationId === input.operationId))
    return conflict();
  if (!session.setup.targets.some((target) => target.id === input.targetId))
    throw new SessionMutationError(
      'UNKNOWN_TARGET',
      'Cette expression ne fait pas partie de la conversation.',
    );
  if (!session.feedback || session.status !== 'completed')
    throw new SessionMutationError(
      'FEEDBACK_NOT_READY',
      'Le bilan doit être disponible avant de signaler un retour.',
      409,
    );
  if ((session.feedbackFlags?.length ?? 0) >= 50)
    throw new SessionMutationError(
      'FEEDBACK_FLAG_LIMIT',
      'Cette conversation a atteint la limite de signalements.',
      409,
    );
  const revision = (session.revision ?? 0) + 1;
  return sessionSchema.parse({
    ...session,
    revision,
    feedbackRevision: revision,
    feedbackFlags: [
      ...(session.feedbackFlags ?? []),
      { ...input, createdAt: timestamp(now), revision },
    ],
    feedback: {
      ...session.feedback,
      observations: session.feedback.observations.map((observation) =>
        observation.targetId === input.targetId
          ? {
              ...observation,
              outcome: 'uncertain',
              evidence: [],
              explanation: 'Vous avez signalé ce retour. Il est exclu du suivi de révision orale.',
              nextPractice:
                'Reprenez cette expression dans une nouvelle situation lorsque vous le souhaitez.',
            }
          : observation,
      ),
    },
  });
}
