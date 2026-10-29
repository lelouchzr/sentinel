import type { Observation, SpeakingSession } from '@/lib/contracts';

export const REVIEW_POLICY_VERSION = 'oral-v1';
export type OralReviewState = {
  targetId: string;
  lastSessionId: string;
  lastPracticedAt: string;
  dueAt: string;
  independentSessions: number;
  outcome: Observation['outcome'];
  policyVersion: typeof REVIEW_POLICY_VERSION;
};

/** Deliberately simple initial intervals, not validated claims of learning efficacy. */
export function scheduleOralReview(
  observation: Observation,
  sessionId: string,
  observedAt: Date,
  previous?: OralReviewState,
): OralReviewState | undefined {
  if (!Number.isFinite(observedAt.getTime())) throw new Error('Invalid observation date.');
  if (previous && previous.targetId !== observation.targetId)
    throw new Error('Review target mismatch.');
  if (observation.outcome === 'not_observed' || observation.outcome === 'uncertain')
    return previous;
  if (previous?.lastSessionId === sessionId) return previous;
  const priorTime = previous ? new Date(previous.lastPracticedAt).getTime() : undefined;
  if (priorTime !== undefined && !Number.isFinite(priorTime))
    throw new Error('Invalid previous observation date.');
  // An older recovered session must not move the latest practice state backwards.
  if (priorTime !== undefined && observedAt.getTime() < priorTime) return previous;
  // Immediate repetitions in a new session cannot count as another durable success.
  const spacedSuccess = !previous || observedAt.getTime() - priorTime! >= 86_400_000;
  const independentSessions =
    observation.outcome === 'independent_use'
      ? (previous?.independentSessions ?? 0) + (spacedSuccess ? 1 : 0)
      : (previous?.independentSessions ?? 0);
  const intervalMs =
    observation.outcome === 'needs_practice'
      ? 10 * 60_000
      : observation.outcome === 'assisted_use'
        ? 86_400_000
        : [1, 3, 7, 14][Math.min(Math.max(independentSessions - 1, 0), 3)]! * 86_400_000;
  return {
    targetId: observation.targetId,
    lastSessionId: sessionId,
    lastPracticedAt: observedAt.toISOString(),
    dueAt: new Date(observedAt.getTime() + intervalMs).toISOString(),
    independentSessions,
    outcome: observation.outcome,
    policyVersion: REVIEW_POLICY_VERSION,
  };
}

/** Typed answers and edited ASR text may inform feedback, but cannot establish oral retrieval. */
export function observationHasSpokenEvidence(
  observation: Observation,
  session: SpeakingSession,
): boolean {
  if (!observation.evidence.length) return false;
  return observation.evidence.every((evidence) => {
    const turn = session.turns.find((candidate) => candidate.id === evidence.turnId);
    return (
      turn?.role === 'learner' &&
      'inputMode' in turn &&
      turn.inputMode === 'spoken' &&
      !turn.corrected &&
      turn.text.includes(evidence.quote)
    );
  });
}
