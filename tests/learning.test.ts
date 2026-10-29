import { describe, expect, it } from 'vitest';
import type { Feedback, Observation, SpeakingSession } from '@/lib/contracts';
import { validateFeedback } from '@/server/learning/evidence';
import { observationHasSpokenEvidence, scheduleOralReview } from '@/lib/review';

const observation = (targetId: string, overrides: Partial<Observation> = {}): Observation => ({
  targetId,
  outcome: 'not_observed',
  opportunity: false,
  evidence: [],
  explanation: 'Aucune occasion.',
  nextPractice: 'Demander un objet dans un autre lieu.',
  ...overrides,
});
const session: SpeakingSession = {
  id: '1f12df14-8b86-4aa0-888b-a46f2bc1be17',
  createdAt: '2026-10-29T12:00:00.000Z',
  status: 'active',
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
      source: 'manual' as const,
      provenance: {
        expression: 'edited' as const,
        meaning: 'edited' as const,
        example: 'edited' as const,
      },
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
      corrected: false,
      createdAt: '2026-10-29T12:00:10.000Z',
    },
  ],
  hints: [],
};
const candidate = (first: Partial<Observation> = {}): Feedback => ({
  goalAchieved: 'yes',
  summary: 'La demande est compréhensible.',
  observations: [
    observation('borrow', {
      outcome: 'independent_use',
      opportunity: true,
      evidence: [{ turnId: 'learner-1', quote: '빌려도 될까요?' }],
      ...first,
    }),
    observation('charger'),
    observation('brief'),
  ],
});

describe('evidence validation', () => {
  it('accepts a semantically judged inflection without requiring the dictionary string', () => {
    expect(validateFeedback(session, candidate()).observations[0]?.outcome).toBe('independent_use');
  });
  it('withholds observations built on invented quotes or another speaker', () => {
    for (const evidence of [
      [{ turnId: 'learner-1', quote: '없는 문장' }],
      [{ turnId: 'partner-1', quote: '무엇이' }],
      [{ turnId: 'another-session', quote: '빌려도' }],
    ]) {
      const result = validateFeedback(session, candidate({ evidence }));
      expect(result.observations[0]).toMatchObject({ outcome: 'uncertain', evidence: [] });
    }
  });
  it('never treats absent opportunities as failure', () => {
    expect(
      validateFeedback(session, candidate({ opportunity: false, outcome: 'needs_practice' }))
        .observations[0]?.outcome,
    ).toBe('not_observed');
  });
  it('requires evidence for a positive or negative ability observation', () => {
    for (const outcome of ['needs_practice', 'independent_use', 'assisted_use'] as const) {
      expect(
        validateFeedback(session, candidate({ outcome, evidence: [] })).observations[0]?.outcome,
      ).toBe('uncertain');
    }
  });
  it('downgrades independent use after relevant support but not after later support', () => {
    const hint = {
      id: 'hint-1',
      targetId: 'borrow',
      level: 'starter' as const,
      text: '빌려도…',
      beforeTurn: 0,
    };
    expect(
      validateFeedback({ ...session, hints: [hint] }, candidate()).observations[0]?.outcome,
    ).toBe('assisted_use');
    expect(
      validateFeedback({ ...session, hints: [{ ...hint, beforeTurn: 1 }] }, candidate())
        .observations[0]?.outcome,
    ).toBe('independent_use');
  });
  it('records partner-provided target wording as assistance', () => {
    const primed = {
      ...session,
      turns: [{ ...session.turns[0]!, text: '빌리다라는 동사를 써 보세요.' }, session.turns[1]!],
    };
    expect(validateFeedback(primed, candidate()).observations[0]?.outcome).toBe('assisted_use');
  });
  it('recognizes an already supplied inflected phrase as help even when the dictionary form differs', () => {
    const primed = {
      ...session,
      turns: [
        { ...session.turns[0]!, text: '«빌려도 될까요?»라고 말해 보세요.' },
        session.turns[1]!,
      ],
    };
    expect(validateFeedback(primed, candidate()).observations[0]?.outcome).toBe('assisted_use');
  });
  it('rejects duplicate turn IDs that make evidence ambiguous', () => {
    const ambiguous = {
      ...session,
      turns: [...session.turns, { ...session.turns[0]!, id: 'learner-1' }],
    };
    expect(() => validateFeedback(ambiguous, candidate())).toThrow('unique');
  });
  it('rejects duplicate or foreign target references', () => {
    const feedback = candidate();
    feedback.observations[1]!.targetId = 'borrow';
    expect(() => validateFeedback(session, feedback)).toThrow('exactly one');
  });
  it('keeps communication success separate from unobserved words', () => {
    const feedback = candidate();
    feedback.observations = ['borrow', 'charger', 'brief'].map((id) => observation(id));
    expect(validateFeedback(session, feedback).goalAchieved).toBe('yes');
  });
  it('cannot claim a communication goal was achieved with no learner turn', () => {
    expect(validateFeedback({ ...session, turns: [] }, candidate()).goalAchieved).toBe('uncertain');
  });
});

describe('oral review policy', () => {
  const now = new Date('2026-10-29T12:00:00.000Z');
  it('does not penalize uncertainty or missing observations', () => {
    expect(scheduleOralReview(observation('borrow'), 's1', now)).toBeUndefined();
    const previous = scheduleOralReview(
      observation('borrow', { outcome: 'independent_use' }),
      's1',
      now,
    )!;
    expect(
      scheduleOralReview(observation('borrow', { outcome: 'uncertain' }), 's2', now, previous),
    ).toBe(previous);
  });
  it('is idempotent and does not count immediate repetition as another spaced success', () => {
    const result = scheduleOralReview(
      observation('borrow', { outcome: 'independent_use' }),
      's1',
      now,
    )!;
    expect(result.dueAt).toBe('2026-10-30T12:00:00.000Z');
    expect(
      scheduleOralReview(
        observation('borrow', { outcome: 'independent_use' }),
        's1',
        new Date('2026-10-29T12:03:00Z'),
        result,
      ),
    ).toBe(result);
    expect(
      scheduleOralReview(
        observation('borrow', { outcome: 'independent_use' }),
        's2',
        new Date('2026-10-29T12:03:00Z'),
        result,
      )?.independentSessions,
    ).toBe(1);
    const spaced = scheduleOralReview(
      observation('borrow', { outcome: 'independent_use' }),
      's3',
      new Date('2026-10-30T12:00:00Z'),
      result,
    )!;
    expect(spaced.independentSessions).toBe(2);
    expect(spaced.dueAt).toBe('2026-11-02T12:00:00.000Z');
  });
  it('does not replace newer practice state with an older recovered session', () => {
    const current = scheduleOralReview(
      observation('borrow', { outcome: 'independent_use' }),
      'newer',
      now,
    )!;
    expect(
      scheduleOralReview(
        observation('borrow', { outcome: 'needs_practice' }),
        'older',
        new Date('2026-10-28T12:00:00Z'),
        current,
      ),
    ).toBe(current);
  });
  it('brings supported difficulties back earlier without affecting written review history', () => {
    expect(
      scheduleOralReview(observation('borrow', { outcome: 'needs_practice' }), 's1', now)?.dueAt,
    ).toBe('2026-10-29T12:10:00.000Z');
    expect(
      scheduleOralReview(observation('borrow', { outcome: 'assisted_use' }), 's1', now)?.dueAt,
    ).toBe('2026-10-30T12:00:00.000Z');
  });
});

describe('spoken evidence provenance', () => {
  const observation = candidate().observations[0]!;
  it('does not count legacy or typed evidence as oral practice', () => {
    expect(observationHasSpokenEvidence(observation, session)).toBe(false);
  });
  it('requires all evidence to be uncorrected spoken learner text', () => {
    const spoken = {
      ...session,
      turns: session.turns.map((turn) => ({
        ...turn,
        inputMode: 'spoken' as const,
        transcriptionOperationId: '55555555-5555-4555-8555-555555555555',
      })),
    };
    expect(observationHasSpokenEvidence(observation, spoken)).toBe(true);
    expect(
      observationHasSpokenEvidence(observation, {
        ...spoken,
        turns: spoken.turns.map((turn) => ({ ...turn, transcriptionOperationId: undefined })),
      }),
    ).toBe(false);
    const corrected = {
      ...spoken,
      turns: spoken.turns.map((turn) => ({ ...turn, corrected: true })),
    };
    expect(observationHasSpokenEvidence(observation, corrected)).toBe(false);
    const mixed = {
      ...spoken,
      turns: [
        ...spoken.turns,
        { ...spoken.turns[1]!, id: 'typed-turn', inputMode: 'typed' as const },
      ],
    };
    expect(
      observationHasSpokenEvidence(
        {
          ...observation,
          evidence: [...observation.evidence, { turnId: 'typed-turn', quote: '빌려도' }],
        },
        mixed,
      ),
    ).toBe(false);
  });
  it('rejects absent, foreign and partner evidence for oral scheduling', () => {
    expect(observationHasSpokenEvidence({ ...observation, evidence: [] }, session)).toBe(false);
    expect(
      observationHasSpokenEvidence(
        { ...observation, evidence: [{ turnId: 'other', quote: '빌려도' }] },
        session,
      ),
    ).toBe(false);
    const partnerOnly = {
      ...session,
      turns: [{ ...session.turns[0]!, inputMode: 'spoken' as const }],
    };
    expect(
      observationHasSpokenEvidence(
        { ...observation, evidence: [{ turnId: 'partner-1', quote: '무엇이' }] },
        partnerOnly,
      ),
    ).toBe(false);
  });
});
