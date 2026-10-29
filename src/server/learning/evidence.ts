import {
  feedbackSchema,
  type Feedback,
  type Observation,
  type SpeakingSession,
} from '@/lib/contracts';

/** Model judgments are proposals; unsupported observations cannot change practice history. */
export function validateFeedback(session: SpeakingSession, candidate: unknown): Feedback {
  const feedback = feedbackSchema.parse(candidate);
  const targetIds = new Set(session.setup.targets.map((target) => target.id));
  if (
    new Set(feedback.observations.map((item) => item.targetId)).size !== targetIds.size ||
    feedback.observations.some((item) => !targetIds.has(item.targetId))
  ) {
    throw new Error('Feedback must contain exactly one observation for each session target.');
  }
  if (new Set(session.turns.map((turn) => turn.id)).size !== session.turns.length) {
    throw new Error('Conversation turn IDs must be unique.');
  }
  const learnerTurns = session.turns.filter((turn) => turn.role === 'learner');
  const observations = feedback.observations.map((observation): Observation => {
    if (session.feedbackFlags?.some((flag) => flag.targetId === observation.targetId)) {
      return {
        ...observation,
        outcome: 'uncertain',
        evidence: [],
        explanation: 'Vous avez signalé ce retour. Il reste exclu du suivi de révision orale.',
        nextPractice:
          'Reprenez cette expression dans une nouvelle situation lorsque vous le souhaitez.',
      };
    }
    if (!observation.opportunity) {
      return {
        ...observation,
        outcome: 'not_observed',
        evidence: [],
        explanation: 'Cette expression n’a pas eu d’occasion suffisamment claire d’être utilisée.',
      };
    }
    const validEvidence = observation.evidence.every((evidence) => {
      const turn = learnerTurns.find((item) => item.id === evidence.turnId);
      return turn !== undefined && turn.text.includes(evidence.quote);
    });
    const needsEvidence = ['independent_use', 'assisted_use', 'needs_practice'].includes(
      observation.outcome,
    );
    if (!validEvidence || (needsEvidence && observation.evidence.length === 0)) {
      return {
        ...observation,
        outcome: 'uncertain',
        evidence: [],
        explanation:
          'Les éléments du dialogue ne permettent pas de confirmer ce retour. Aucune difficulté n’est enregistrée.',
      };
    }
    if (observation.outcome === 'independent_use') {
      const assisted = observation.evidence.some((evidence) => {
        const learnerIndex = learnerTurns.findIndex((turn) => turn.id === evidence.turnId);
        const turnIndex = session.turns.findIndex((turn) => turn.id === evidence.turnId);
        const target = session.setup.targets.find((item) => item.id === observation.targetId)!;
        return (
          session.hints.some(
            (hint) => hint.targetId === observation.targetId && hint.beforeTurn <= learnerIndex,
          ) ||
          session.turns
            .slice(0, turnIndex)
            .some(
              (turn) =>
                turn.role === 'partner' &&
                (turn.text.includes(target.expression) || turn.text.includes(evidence.quote)),
            )
        );
      });
      if (assisted)
        return {
          ...observation,
          outcome: 'assisted_use',
          explanation:
            `${observation.explanation} Une aide avait été fournie avant cette tentative.`.slice(
              0,
              1000,
            ),
        };
    }
    return observation;
  });
  if (!learnerTurns.length) {
    return {
      goalAchieved: 'uncertain',
      summary: 'Aucune réponse de votre part n’a encore été observée.',
      observations,
    };
  }
  return { ...feedback, observations };
}
