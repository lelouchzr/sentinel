import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLocalPractice,
  addLocalTurn,
  addLocalHint,
  finishLocalPractice,
} from '@/lib/local-practice';
import { observationHasSpokenEvidence } from '@/lib/review';
import { previewImport } from '@/features/imports/parser';
import {
  startPractice,
  sendPracticeTurn,
  getPracticeSession,
  finishPractice,
  amendPracticeTurn,
  flagPracticeFeedback,
  clearLocalPractice,
  restoreLocalPracticeSessions,
  deletePracticeSession,
} from '@/lib/practice-client';
import type { SessionSetup } from '@/lib/contracts';

const setup: SessionSetup = {
  scenario: 'request',
  goal: 'Demander à emprunter un chargeur.',
  level: 'beginner',
  relationship: 'stranger',
  targetLanguage: 'ko',
  explanationLanguage: 'fr',
  targets: previewImport(
    'expression\tmeaning\n빌리다\temprunter\n충전기\tchargeur\n잠깐\tun instant',
  ).rows,
};
const id = () => crypto.randomUUID();
const now = new Date('2026-10-29T10:00:00Z');

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('Unexpected external call.');
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('explicit local rehearsal domain', () => {
  it.each(['request', 'appointment', 'problem'] as const)(
    'supports %s without claiming semantic assessment',
    (scenario) => {
      const initial = createLocalPractice({ ...setup, scenario }, id(), now);
      expect(initial.mode).toBe('local');
      expect(initial.scene).toContain('sans IA');
      const answered = addLocalTurn(
        initial,
        { operationId: id(), text: '아무 말이나', inputMode: 'spoken' },
        now,
      );
      const finished = finishLocalPractice(answered);
      expect(finished.feedback?.goalAchieved).toBe('uncertain');
      expect(finished.feedback?.observations.every((item) => item.outcome === 'not_observed')).toBe(
        true,
      );
      expect(finished.turns[1]?.inputMode).toBe('typed');
      expect(
        finished.feedback?.observations.every(
          (item) => !observationHasSpokenEvidence(item, finished),
        ),
      ).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it('keeps role politeness and hint disclosure explicit', () => {
    const stranger = createLocalPractice(setup, id(), now);
    const friend = createLocalPractice({ ...setup, relationship: 'friend' }, id(), now);
    expect(stranger.turns[0]!.text).not.toBe(friend.turns[0]!.text);
    expect(() =>
      addLocalHint(
        stranger,
        { operationId: id(), targetId: setup.targets[0]!.id, level: 'example' },
        now,
      ),
    ).toThrow('ordre');
    const hint = addLocalHint(
      stranger,
      { operationId: id(), targetId: setup.targets[0]!.id, level: 'meaning' },
      now,
    );
    expect(hint.hints[0]!.text).toContain('emprunter');
    expect(hint.hints[0]!.beforeTurn).toBe(0);
  });
  it('enforces session duration, eight turns and finalization without blocking expired reports', () => {
    const initial = createLocalPractice(setup, id(), now);
    expect(() =>
      addLocalTurn(initial, { operationId: id(), text: '네' }, new Date(now.getTime() + 301000)),
    ).toThrow('cinq minutes');
    expect(() => finishLocalPractice(initial)).toThrow('Ajoutez une réponse');
    let session = initial;
    for (let i = 0; i < 8; i++)
      session = addLocalTurn(session, { operationId: id(), text: '네' }, now);
    expect(() => addLocalTurn(session, { operationId: id(), text: '네' }, now)).toThrow('huit');
    const completed = finishLocalPractice(session);
    expect(completed.status).toBe('completed');
    expect(() => addLocalTurn(completed, { operationId: id(), text: '네' }, now)).toThrow(
      'terminée',
    );
  });
});

describe('browser-only practice persistence and replay', () => {
  it('recovers the same operation without duplicating turns or invoking a network', async () => {
    const operationId = id();
    const initial = await startPractice(setup, 'local', operationId);
    expect((await startPractice(setup, 'local', operationId)).id).toBe(initial.id);
    const turn = { operationId: id(), text: '충전기가 있어요?' };
    const updated = await sendPracticeTurn(initial, turn);
    expect(await sendPracticeTurn(initial, turn)).toEqual(updated);
    expect((await getPracticeSession(initial.id, 'local')).turns).toHaveLength(3);
    await expect(sendPracticeTurn(initial, { ...turn, text: 'different' })).rejects.toThrow(
      'autre action',
    );
    await expect(sendPracticeTurn(initial, { operationId: id(), text: '다른 말' })).rejects.toThrow(
      'changé',
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  it('withdraws old feedback after an amendment and preserves contested feedback on a rerun', async () => {
    let session = await startPractice(setup, 'local', id());
    session = await sendPracticeTurn(session, { operationId: id(), text: '네' });
    session = await finishPractice(session, id());
    session = await flagPracticeFeedback(session, {
      operationId: id(),
      targetId: setup.targets[0]!.id,
      reason: 'Je souhaite revoir cette observation.',
    });
    session = await amendPracticeTurn(session, {
      operationId: id(),
      turnId: session.turns[1]!.id,
      text: '감사합니다.',
    });
    expect(session.feedback).toBeUndefined();
    session = await finishPractice(session, id());
    expect(session.feedbackFlags).toHaveLength(1);
    expect(session.feedback!.observations[0]!.outcome).toBe('uncertain');
    expect(session.amendments?.[0]?.previousText).toBe('네');
  });
  it('restores only local sessions without overwriting existing content, then deletes fully', async () => {
    const session = await startPractice(setup, 'local', id());
    restoreLocalPracticeSessions([{ ...session, scene: 'Tampered duplicate' }]);
    expect((await getPracticeSession(session.id, 'local')).scene).toBe(session.scene);
    expect(() => restoreLocalPracticeSessions([{ ...session, mode: 'live' }])).toThrow('locaux');
    clearLocalPractice();
    restoreLocalPracticeSessions([session]);
    expect((await getPracticeSession(session.id, 'local')).id).toBe(session.id);
    await deletePracticeSession(session);
    await expect(getPracticeSession(session.id, 'local')).rejects.toThrow('introuvable');
  });
});
