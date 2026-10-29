import { describe, expect, it } from 'vitest';
import { amendSessionTranscript, flagSessionFeedback } from '@/lib/session-mutations';
import { observationHasSpokenEvidence } from '@/lib/review';
import { validateFeedback } from '@/server/learning/evidence';
import {
  completedSessionFixture,
  feedbackFixture,
  fixtureOperationId,
  secondOperationId,
} from './session-fixtures';

const now = new Date('2026-10-29T12:30:00.000Z');
const amendment = {
  operationId: fixtureOperationId,
  turnId: 'learner-1',
  text: '펜을 빌려도 될까요?',
};
const flag = {
  operationId: fixtureOperationId,
  targetId: 'borrow',
  reason: 'Le mot a été mal reconnu.',
};

describe('transcript corrections', () => {
  it('invalidates a completed evaluation, records its provenance and keeps historical turn IDs', () => {
    const original = completedSessionFixture();
    const next = amendSessionTranscript(original, amendment, now);
    expect(next).toMatchObject({ status: 'active', revision: 5 });
    expect(next.feedback).toBeUndefined();
    expect(next.feedbackRevision).toBeUndefined();
    expect(next.turns.map((turn) => turn.id)).toEqual(original.turns.map((turn) => turn.id));
    expect(next.turns[1]).toMatchObject({
      text: amendment.text,
      corrected: true,
      inputMode: 'spoken',
    });
    expect(next.turns[2]).toEqual(original.turns[2]);
    expect(next.amendments).toEqual([
      {
        ...amendment,
        previousText: original.turns[1]!.text,
        revision: 5,
        createdAt: now.toISOString(),
      },
    ]);
    expect(original.feedback).toEqual(feedbackFixture());
    expect(original.turns[1]!.corrected).toBe(false);
  });
  it('retries an older correction without resurrecting its earlier transcript or feedback', () => {
    const first = amendSessionTranscript(completedSessionFixture(), amendment, now);
    const second = amendSessionTranscript(
      first,
      { ...amendment, operationId: secondOperationId, text: '충전기가 필요해요.' },
      now,
    );
    expect(amendSessionTranscript(second, amendment, now)).toEqual(second);
  });
  it('rejects foreign, partner, empty and unchanged turns without creating a revision', () => {
    for (const input of [
      { ...amendment, turnId: 'foreign' },
      { ...amendment, turnId: 'partner-1' },
      { ...amendment, text: '' },
      { ...amendment, text: completedSessionFixture().turns[1]!.text },
    ]) {
      expect(() => amendSessionTranscript(completedSessionFixture(), input, now)).toThrow();
    }
  });
  it('does not allow operation IDs to be reused for different text or a different mutation kind', () => {
    const corrected = amendSessionTranscript(completedSessionFixture(), amendment, now);
    expect(() => amendSessionTranscript(corrected, { ...amendment, text: '다른 말' }, now)).toThrow(
      'identifiant',
    );
    const evaluated = { ...corrected, status: 'completed' as const, feedback: feedbackFixture() };
    expect(() => flagSessionFeedback(evaluated, flag, now)).toThrow('identifiant');
  });
  it('bounds the private audit trail and checks timestamps', () => {
    const session = completedSessionFixture({
      amendments: Array.from({ length: 50 }, (_, index) => ({
        ...amendment,
        operationId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
        previousText: '이전',
        createdAt: now.toISOString(),
        revision: index + 1,
      })),
    });
    expect(() => amendSessionTranscript(session, amendment, now)).toThrow('limite');
    expect(() =>
      amendSessionTranscript(completedSessionFixture(), amendment, new Date('invalid')),
    ).toThrow('date');
  });
});

describe('disputed feedback', () => {
  it('withholds only the disputed observation, with an explicit audit and no oral credit', () => {
    const original = completedSessionFixture();
    const next = flagSessionFeedback(original, flag, now);
    expect(next).toMatchObject({ status: 'completed', revision: 5, feedbackRevision: 5 });
    expect(next.feedback!.observations[0]).toMatchObject({ outcome: 'uncertain', evidence: [] });
    expect(next.feedback!.observations[1]).toEqual(original.feedback!.observations[1]);
    expect(next.feedbackFlags).toEqual([{ ...flag, createdAt: now.toISOString(), revision: 5 }]);
    expect(observationHasSpokenEvidence(original.feedback!.observations[0]!, next)).toBe(false);
    expect(original.feedbackFlags).toBeUndefined();
  });
  it('keeps disputes excluded through correction and model reevaluation', () => {
    const flagged = flagSessionFeedback(completedSessionFixture(), flag, now);
    const corrected = amendSessionTranscript(
      flagged,
      { ...amendment, operationId: secondOperationId },
      now,
    );
    expect(corrected.feedbackFlags).toEqual(flagged.feedbackFlags);
    const reevaluated = validateFeedback(corrected, feedbackFixture());
    expect(reevaluated.observations[0]).toMatchObject({ outcome: 'uncertain', evidence: [] });
  });
  it('returns the latest state on an identical repeated flag and rejects changed operation payloads', () => {
    const flagged = flagSessionFeedback(completedSessionFixture(), flag, now);
    expect(flagSessionFeedback(flagged, flag, now)).toEqual(flagged);
    expect(() => flagSessionFeedback(flagged, { ...flag, reason: 'Autre raison' }, now)).toThrow(
      'identifiant',
    );
    expect(() => amendSessionTranscript(flagged, amendment, now)).toThrow('identifiant');
  });
  it('requires a completed evaluation and a target from the session', () => {
    expect(() =>
      flagSessionFeedback(
        completedSessionFixture({ status: 'active', feedback: undefined }),
        flag,
        now,
      ),
    ).toThrow('bilan');
    expect(() =>
      flagSessionFeedback(completedSessionFixture(), { ...flag, targetId: 'foreign' }, now),
    ).toThrow('expression');
  });
});

describe('review provenance after session revisions', () => {
  it('withholds local rehearsal and feedback from an outdated revision', () => {
    const session = completedSessionFixture();
    const observation = session.feedback!.observations[0]!;
    expect(observationHasSpokenEvidence(observation, session)).toBe(true);
    expect(observationHasSpokenEvidence(observation, { ...session, mode: 'local' })).toBe(false);
    expect(observationHasSpokenEvidence(observation, { ...session, revision: 5 })).toBe(false);
  });
});
