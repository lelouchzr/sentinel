import type { Feedback, SpeakingSession } from '@/lib/contracts';

export const fixtureSessionId = '11111111-1111-4111-8111-111111111111';
export const fixtureUserId = '22222222-2222-4222-8222-222222222222';
export const fixtureOperationId = '33333333-3333-4333-8333-333333333333';
export const secondOperationId = '44444444-4444-4444-8444-444444444444';
export function feedbackFixture(): Feedback {
  return {
    goalAchieved: 'yes',
    summary: 'Votre demande est compréhensible.',
    observations: ['borrow', 'charger', 'brief'].map((targetId, index) => ({
      targetId,
      outcome: index === 0 ? 'independent_use' : 'not_observed',
      opportunity: index === 0,
      evidence: index === 0 ? [{ turnId: 'learner-1', quote: '빌려도 될까요?' }] : [],
      explanation: index === 0 ? 'Une demande polie.' : 'Cette expression n’a pas été observée.',
      nextPractice: 'Demander un autre objet.',
    })),
  };
}
export function completedSessionFixture(overrides: Partial<SpeakingSession> = {}): SpeakingSession {
  return {
    id: fixtureSessionId,
    revision: 4,
    feedbackRevision: 4,
    mode: 'live',
    createdAt: '2026-10-29T12:00:00.000Z',
    status: 'completed',
    scene: 'Demandez un objet à un collègue.',
    setup: {
      scenario: 'request',
      goal: 'Demander un chargeur',
      level: 'beginner',
      relationship: 'colleague',
      targetLanguage: 'ko',
      explanationLanguage: 'fr',
      targets: [
        ['borrow', '빌리다', 'emprunter'],
        ['charger', '충전기', 'chargeur'],
        ['brief', '잠깐', 'un instant'],
      ].map(([id, expression, meaning]) => ({
        id: id!,
        expression: expression!,
        meaning: meaning!,
        example: '',
        source: 'manual',
        provenance: { expression: 'edited', meaning: 'edited', example: 'edited' },
      })),
    },
    turns: [
      {
        id: 'partner-1',
        role: 'partner',
        text: '무엇이 필요하세요?',
        corrected: false,
        createdAt: '2026-10-29T12:00:00.000Z',
      },
      {
        id: 'learner-1',
        role: 'learner',
        text: '충전기를 잠깐 빌려도 될까요?',
        inputMode: 'spoken',
        transcriptionOperationId: '55555555-5555-4555-8555-555555555555',
        corrected: false,
        createdAt: '2026-10-29T12:00:10.000Z',
      },
      {
        id: 'partner-2',
        role: 'partner',
        text: '네, 여기 있어요.',
        corrected: false,
        createdAt: '2026-10-29T12:00:11.000Z',
      },
    ],
    hints: [],
    feedback: feedbackFixture(),
    ...overrides,
  };
}
