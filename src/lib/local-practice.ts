import { z } from 'zod';
import { amendSessionTranscript, flagSessionFeedback } from './session-mutations';
import {
  sessionSchema,
  sessionSetupSchema,
  type Hint,
  type SessionSetup,
  type SpeakingSession,
} from './contracts';

export const LOCAL_PRACTICE_NOTICE =
  'Entraînement local guidé : répliques prédéfinies, sans IA ni évaluation de votre niveau.';
const requestId = z.string().uuid();
const learnerText = z.string().trim().min(1).max(2000);
const scenarios = {
  request: {
    scene:
      'Vous demandez un petit service à une personne. Les répliques suivantes sont écrites à l’avance : adaptez vos réponses à votre propre objectif.',
    polite: [
      '안녕하세요. 무엇을 도와드릴까요?',
      '네, 괜찮아요. 언제 필요하세요?',
      '알겠어요. 또 필요한 것이 있으세요?',
      '네, 감사합니다. 좋은 하루 보내세요.',
    ],
    friendly: [
      '안녕. 뭐 도와줄까?',
      '응, 괜찮아. 언제 필요해?',
      '알겠어. 또 필요한 게 있어?',
      '응, 고마워. 좋은 하루 보내.',
    ],
  },
  appointment: {
    scene:
      'Vous convenez d’un rendez-vous. Ce dialogue guidé vous propose de choisir le jour, l’heure et de confirmer les détails.',
    polite: [
      '안녕하세요. 언제 만나면 좋을까요?',
      '좋아요. 몇 시가 편하세요?',
      '네, 어디에서 만날까요?',
      '알겠어요. 그때 뵐게요.',
    ],
    friendly: [
      '안녕. 언제 만나면 좋을까?',
      '좋아. 몇 시가 편해?',
      '응, 어디에서 만날까?',
      '알겠어. 그때 보자.',
    ],
  },
  problem: {
    scene:
      'Vous expliquez un problème du quotidien. Le partenaire suit un script pour vous inviter à décrire le problème, son début et votre besoin.',
    polite: [
      '안녕하세요. 무슨 문제가 있으세요?',
      '언제부터 그랬어요?',
      '알겠어요. 어떻게 도와드리면 좋을까요?',
      '네, 확인해 볼게요. 잠시만 기다려 주세요.',
    ],
    friendly: [
      '안녕. 무슨 문제야?',
      '언제부터 그랬어?',
      '알겠어. 어떻게 도와줄까?',
      '응, 확인해 볼게. 잠깐만 기다려 줘.',
    ],
  },
} as const;

function script(session: Pick<SpeakingSession, 'setup'>) {
  const definition = scenarios[session.setup.scenario];
  return session.setup.relationship === 'friend' ? definition.friendly : definition.polite;
}
function clone(input: SpeakingSession): SpeakingSession {
  const session = sessionSchema.parse(input);
  if (session.mode !== 'local') throw new Error('Cette conversation appartient au mode connecté.');
  return structuredClone(session);
}
function active(session: SpeakingSession, now: Date) {
  if (session.status !== 'active') throw new Error('Cette conversation est terminée.');
  if (now.getTime() - Date.parse(session.createdAt) > 300_000)
    throw new Error(
      'Les cinq minutes sont écoulées. Ouvrez votre bilan ou commencez une nouvelle conversation.',
    );
}
function nextRevision(session: SpeakingSession) {
  return (session.revision ?? 0) + 1;
}

export function createLocalPractice(
  setup: SessionSetup,
  operationId: string,
  now = new Date(),
): SpeakingSession {
  requestId.parse(operationId);
  const confirmed = sessionSetupSchema.parse(setup);
  if (new Set(confirmed.targets.map((item) => item.id)).size !== 3)
    throw new Error('Choisissez trois expressions différentes.');
  return sessionSchema.parse({
    id: operationId,
    mode: 'local',
    revision: 0,
    setup: confirmed,
    status: 'active',
    scene: `${LOCAL_PRACTICE_NOTICE} ${scenarios[confirmed.scenario].scene}`,
    createdAt: now.toISOString(),
    hints: [],
    turns: [
      {
        id: crypto.randomUUID(),
        role: 'partner',
        text: script({ setup: confirmed })[0],
        corrected: false,
        createdAt: now.toISOString(),
      },
    ],
  });
}

export function addLocalTurn(
  input: SpeakingSession,
  value: { operationId: string; text: string; corrected?: boolean; inputMode?: 'spoken' | 'typed' },
  now = new Date(),
): SpeakingSession {
  const session = clone(input);
  active(session, now);
  requestId.parse(value.operationId);
  const text = learnerText.parse(value.text);
  const count = session.turns.filter((turn) => turn.role === 'learner').length;
  if (count >= 8) throw new Error('Les huit prises de parole sont terminées. Ouvrez votre bilan.');
  session.turns.push({
    id: value.operationId,
    role: 'learner',
    text,
    corrected: value.corrected ?? false,
    inputMode: 'typed',
    createdAt: now.toISOString(),
  });
  // Script position depends only on turn count, never on an invented interpretation of the reply.
  session.turns.push({
    id: crypto.randomUUID(),
    role: 'partner',
    text: script(session)[Math.min(count + 1, 3)]!,
    corrected: false,
    createdAt: now.toISOString(),
  });
  session.revision = nextRevision(session);
  return sessionSchema.parse(session);
}

export function addLocalHint(
  input: SpeakingSession,
  value: { operationId: string; targetId: string; level: Hint['level'] },
  now = new Date(),
): SpeakingSession {
  const session = clone(input);
  active(session, now);
  requestId.parse(value.operationId);
  const target = session.setup.targets.find((item) => item.id === value.targetId);
  if (!target) throw new Error('Cette expression ne fait pas partie de votre sélection.');
  const prior = session.hints.filter((hint) => hint.targetId === target.id).length;
  if (['meaning', 'starter', 'example'][prior] !== value.level)
    throw new Error('Consultez les indices dans l’ordre.');
  const text =
    value.level === 'meaning'
      ? `Sens confirmé : ${target.meaning}`
      : value.level === 'starter'
        ? `Début de l’expression : ${Array.from(target.expression).slice(0, 1).join('')}…`
        : target.example
          ? `Exemple de votre collection : ${target.example}`
          : `Expression confirmée : ${target.expression}. Aucun exemple n’est fourni dans votre collection.`;
  session.hints.push({
    id: value.operationId,
    targetId: target.id,
    level: value.level,
    text,
    beforeTurn: session.turns.filter((turn) => turn.role === 'learner').length,
  });
  session.revision = nextRevision(session);
  return session;
}

export function finishLocalPractice(input: SpeakingSession): SpeakingSession {
  const session = clone(input);
  if (session.status === 'completed') return session;
  if (!session.turns.some((turn) => turn.role === 'learner'))
    throw new Error('Ajoutez une réponse avant d’ouvrir votre bilan.');
  session.status = 'completed';
  session.revision = nextRevision(session);
  session.feedbackRevision = session.revision;
  session.feedback = {
    goalAchieved: 'uncertain',
    summary:
      'Vous avez parcouru un dialogue guidé sans IA. Relisez vos phrases et les aides consultées. Leur justesse et la réussite de votre objectif n’ont pas été évaluées ; aucune révision orale n’est attribuée.',
    observations: session.setup.targets.map((target) => ({
      targetId: target.id,
      outcome: session.feedbackFlags?.some((flag) => flag.targetId === target.id)
        ? 'uncertain'
        : 'not_observed',
      opportunity: false,
      evidence: [],
      explanation:
        'Ce parcours local ne détermine pas si cette expression a été correctement utilisée.',
      nextPractice: `Réessayez de formuler une phrase pour « ${target.meaning} » dans un autre contexte.`,
    })),
  };
  return session;
}

export function amendLocalTurn(
  input: SpeakingSession,
  value: { operationId: string; turnId: string; text: string },
  now = new Date(),
): SpeakingSession {
  return amendSessionTranscript(clone(input), value, now);
}
export function flagLocalFeedback(
  input: SpeakingSession,
  value: { operationId: string; targetId: string; reason?: string },
  now = new Date(),
): SpeakingSession {
  return flagSessionFeedback(clone(input), value, now);
}
