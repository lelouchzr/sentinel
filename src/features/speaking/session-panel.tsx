'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleNotch,
  Lightbulb,
  Microphone,
  PaperPlaneTilt,
  SpeakerHigh,
  Stop,
  WarningCircle,
} from '@phosphor-icons/react';
import type { ConversationTurn, Hint, ProviderStatus, SpeakingSession } from '@/lib/contracts';
import { messageOf } from '@/features/app/client';
import {
  sendPracticeTurn,
  requestPracticeHint,
  finishPractice,
  deletePracticeSession,
  getPracticeSession,
} from '@/lib/practice-client';
import { ApiClientError } from '@/lib/client-api';
import { useRecorder } from './use-recorder';

const relationLabels = {
  stranger: 'Une personne que vous ne connaissez pas · langage poli',
  colleague: 'Un collègue · langage poli',
  friend: 'Un ami · langage familier adapté',
};
const hintLabels: Record<Hint['level'], string> = {
  meaning: 'Indice de sens',
  starter: 'Début de phrase',
  example: 'Exemple complet',
};

export function SessionPanel({
  session,
  status,
  onChange,
  onBack,
  onComplete,
  onAbandon,
}: {
  session: SpeakingSession;
  status: ProviderStatus;
  onChange: (session: SpeakingSession) => void;
  onBack: () => void;
  onComplete: (session: SpeakingSession) => void;
  onAbandon: () => void;
}) {
  const local = session.mode === 'local';
  const [draft, setDraft] = useState('');
  const [transcribed, setTranscribed] = useState(false);
  const [busy, setBusy] = useState<'send' | 'hint' | 'complete' | 'abandon' | 'reload' | null>(
    null,
  );
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioCache = useRef(new Map<string, string>());
  const mounted = useRef(true);
  const audioGeneration = useRef(0);
  const originalTranscript = useRef('');
  const transcriptionOperation = useRef<string | undefined>(undefined);
  const localAudio = useRef<HTMLAudioElement | null>(null);
  const operations = useRef(new Map<string, string>());
  function operationId(action: string, payload: unknown) {
    const key = `${action}:${JSON.stringify(payload)}`;
    const existing = operations.current.get(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    operations.current.set(key, id);
    return id;
  }
  const end = useRef<HTMLDivElement>(null);
  const draftInput = useRef<HTMLTextAreaElement>(null);
  const recorder = useRecorder(
    session.id,
    (text, operationId) => {
      originalTranscript.current = text;
      transcriptionOperation.current = operationId;
      setDraft(text);
      setTranscribed(true);
      draftInput.current?.focus();
    },
    local,
  );
  const learnerCount = session.turns.filter((turn) => turn.role === 'learner').length;
  const ended = elapsed >= 300 || learnerCount >= 8;
  const microphoneBusy = recorder.state !== 'idle';

  useEffect(() => {
    const update = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - Date.parse(session.createdAt)) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [session.createdAt]);

  useEffect(() => {
    end.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }, [session.turns.length]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      audioGeneration.current++;
      audio.current?.pause();
      audioCache.current.forEach((url) => URL.revokeObjectURL(url));
      audioCache.current.clear();
    };
  }, []);
  useEffect(() => {
    if (ended && recorder.state === 'recording') recorder.stop();
  }, [ended, recorder]);

  function stopAudio() {
    audio.current?.pause();
    localAudio.current?.pause();
    audioGeneration.current++;
    audio.current = null;
    setPlayingId(null);
  }

  async function sendTurn() {
    if (!draft.trim() || busy || microphoneBusy || ended) return;
    setBusy('send');
    setError('');
    stopAudio();
    try {
      const payload = {
        text: draft.trim(),
        inputMode: transcribed ? 'spoken' : 'typed',
        corrected: transcribed && draft.trim() !== originalTranscript.current.trim(),
        transcriptionOperationId: transcribed ? transcriptionOperation.current : undefined,
      };
      const next = await sendPracticeTurn(session, {
        operationId: operationId('turn', { ...payload, afterTurn: session.turns.length }),
        text: payload.text,
        inputMode: payload.inputMode as 'spoken' | 'typed',
        corrected: payload.corrected,
        transcriptionOperationId: payload.transcriptionOperationId,
      });
      onChange(next);
      setDraft('');
      setTranscribed(false);
      transcriptionOperation.current = undefined;
    } catch (failure) {
      if (failure instanceof ApiClientError && failure.retry === 'new-operation')
        operations.current.clear();
      setConflict(
        failure instanceof ApiClientError &&
          ['SESSION_CONFLICT', 'REVISION_CONFLICT'].includes(failure.code),
      );
      setError(messageOf(failure));
    } finally {
      setBusy(null);
    }
  }

  async function requestHint(targetId: string) {
    if (busy || microphoneBusy || ended) return;
    const previous = session.hints.filter((hint) => hint.targetId === targetId);
    const levels: Hint['level'][] = ['meaning', 'starter', 'example'];
    const level = levels.find((candidate) => !previous.some((hint) => hint.level === candidate));
    if (!level) return;
    setBusy('hint');
    setError('');
    try {
      const next = await requestPracticeHint(session, {
        operationId: operationId('hint', { targetId, level }),
        targetId,
        level,
      });
      onChange(next);
    } catch (failure) {
      if (failure instanceof ApiClientError && failure.retry === 'new-operation')
        operations.current.clear();
      setConflict(
        failure instanceof ApiClientError &&
          ['SESSION_CONFLICT', 'REVISION_CONFLICT'].includes(failure.code),
      );
      setError(messageOf(failure));
    } finally {
      setBusy(null);
    }
  }

  async function complete() {
    if (busy || microphoneBusy) return;
    setBusy('complete');
    setError('');
    stopAudio();
    try {
      const next = await finishPractice(
        session,
        operationId('complete', { revision: session.revision ?? 0 }),
      );
      onChange(next);
      onComplete(next);
    } catch (failure) {
      if (failure instanceof ApiClientError && failure.retry === 'new-operation')
        operations.current.clear();
      setConflict(
        failure instanceof ApiClientError &&
          ['SESSION_CONFLICT', 'REVISION_CONFLICT'].includes(failure.code),
      );
      setError(messageOf(failure));
    } finally {
      setBusy(null);
    }
  }

  async function reload() {
    setBusy('reload');
    setError('');
    stopAudio();
    try {
      const updated = await getPracticeSession(session.id, session.mode ?? 'live');
      onChange(updated);
      if (updated.status === 'completed') onComplete(updated);
      operations.current.clear();
      setConflict(false);
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(null);
    }
  }

  async function abandon() {
    if (
      !window.confirm(
        'Supprimer cette conversation inachevée ? Les expressions de votre collection seront conservées.',
      )
    )
      return;
    setBusy('abandon');
    setError('');
    stopAudio();
    try {
      await deletePracticeSession(session);
      onAbandon();
    } catch (failure) {
      if (failure instanceof ApiClientError && failure.retry === 'new-operation')
        operations.current.clear();
      setConflict(
        failure instanceof ApiClientError &&
          ['SESSION_CONFLICT', 'REVISION_CONFLICT'].includes(failure.code),
      );
      setError(messageOf(failure));
    } finally {
      if (mounted.current) setBusy(null);
    }
  }

  async function playReply(turn: ConversationTurn) {
    if (playingId === turn.id) {
      stopAudio();
      return;
    }
    if (loadingAudioId || microphoneBusy) return;
    stopAudio();
    const generation = audioGeneration.current;
    setLoadingAudioId(turn.id);
    setError('');
    try {
      let url = audioCache.current.get(turn.id);
      if (!url) {
        const response = await fetch('/api/speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id,
            turnId: turn.id,
            operationId: operationId('speech', { turnId: turn.id }),
          }),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(
            result?.error?.message ||
              'La lecture audio est indisponible. Le texte reste accessible.',
          );
        }
        const blob = await response.blob();
        if (!mounted.current || audioGeneration.current !== generation) return;
        url = URL.createObjectURL(blob);
        audioCache.current.set(turn.id, url);
      }
      if (!mounted.current || audioGeneration.current !== generation) return;
      const playback = new Audio(url);
      audio.current = playback;
      playback.onended = stopAudio;
      playback.onerror = () => {
        stopAudio();
        if (mounted.current) setError('Votre navigateur n’a pas pu lire cet audio.');
      };
      await playback.play();
      if (!mounted.current || audioGeneration.current !== generation) {
        playback.pause();
        return;
      }
      setPlayingId(turn.id);
    } catch (failure) {
      if (mounted.current) {
        stopAudio();
        setConflict(
          failure instanceof ApiClientError &&
            ['SESSION_CONFLICT', 'REVISION_CONFLICT'].includes(failure.code),
        );
        setError(messageOf(failure));
      }
    } finally {
      if (mounted.current) setLoadingAudioId(null);
    }
  }

  return (
    <section className="session-page">
      <div className="session-topline">
        <button className="text-button" onClick={onBack} disabled={!!busy || microphoneBusy}>
          <ArrowLeft size={17} /> Mes expressions
        </button>
        <div className="session-progress">
          <span className="status-dot" /> {local ? 'Entraînement local · sans IA' : 'Conversation'}{' '}
          · {learnerCount}/8 prises de parole{' '}
          <span className={ended ? 'time-over' : ''}>
            {Math.floor(Math.min(elapsed, 300) / 60)}:
            {String(Math.min(elapsed, 300) % 60).padStart(2, '0')} / 5:00
          </span>
        </div>
      </div>
      <div className="session-layout">
        <aside className="scene-panel">
          <span className="eyebrow">Votre situation</span>
          <h1>{session.setup.goal}</h1>
          <p className="scene-description">{session.scene}</p>
          <div className="scene-meta">
            <span>À qui vous parlez</span>
            <p>{relationLabels[session.setup.relationship]}</p>
            <span>Votre rythme</span>
            <p>
              {session.setup.level === 'beginner'
                ? 'Guidé · phrases courtes'
                : 'Plus autonome · conversation naturelle'}
            </p>
          </div>
          <div className="scene-note">
            <span className="small-number">한</span>
            <p>
              Faites passer votre message. Une autre façon de le dire peut aussi très bien
              fonctionner.
            </p>
          </div>
          <button
            className="button button-secondary button-full"
            onClick={() => setHelpOpen(!helpOpen)}
            aria-expanded={helpOpen}
          >
            <Lightbulb size={19} /> {helpOpen ? 'Masquer les indices' : 'Un coup de pouce ?'}
          </button>
          {helpOpen && (
            <div className="hints-panel">
              <p className="fine-print">
                Du sens à l’exemple complet. Chaque aide est conservée dans votre bilan.
              </p>
              {session.setup.targets.map((target, index) => {
                const hints = session.hints.filter((hint) => hint.targetId === target.id);
                const nextLevel = (['meaning', 'starter', 'example'] as const).find(
                  (level) => !hints.some((hint) => hint.level === level),
                );
                return (
                  <div className="hint-target" key={target.id}>
                    <strong>Expression {index + 1}</strong>
                    {hints.map((hint) => (
                      <div className="hint-answer" key={hint.id}>
                        <small>{hintLabels[hint.level]}</small>
                        <p>{hint.text}</p>
                      </div>
                    ))}
                    {nextLevel && (
                      <button
                        className="text-button"
                        disabled={!!busy || microphoneBusy || ended}
                        onClick={() => void requestHint(target.id)}
                      >
                        {hintLabels[nextLevel]} <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </aside>
        <div className="conversation-panel">
          <div className="conversation-heading">
            <div className="partner-avatar" lang="ko">
              말
            </div>
            <div>
              <h2>Votre partenaire de conversation</h2>
              <span>
                {local
                  ? 'Scène écrite à l’avance · aucune évaluation IA'
                  : 'Coréen · réponses générées par l’IA'}
              </span>
            </div>
          </div>
          <div className="conversation-messages" aria-live="polite" aria-relevant="additions text">
            {session.turns.map((turn) => (
              <div key={turn.id} className={`message message-${turn.role}`}>
                <span className="message-role">
                  {turn.role === 'learner'
                    ? `Vous · ${turn.inputMode === 'spoken' ? (turn.corrected ? 'transcription corrigée' : 'oral') : 'écrit'}`
                    : 'Votre partenaire'}
                </span>
                <p lang="ko">{turn.text}</p>
                {turn.role === 'partner' && status.speech && !local && (
                  <button
                    className="message-audio"
                    disabled={!!loadingAudioId || microphoneBusy}
                    onClick={() => void playReply(turn)}
                    aria-label={
                      playingId === turn.id ? 'Arrêter la lecture' : 'Écouter cette réponse'
                    }
                  >
                    {loadingAudioId === turn.id ? (
                      <CircleNotch size={16} className="spin" />
                    ) : playingId === turn.id ? (
                      <Stop size={16} />
                    ) : (
                      <SpeakerHigh size={16} />
                    )}
                    {playingId === turn.id ? 'Arrêter' : 'Écouter'}
                  </button>
                )}
              </div>
            ))}
            {busy === 'send' && (
              <div className="responding">
                <CircleNotch size={17} className="spin" /> Votre partenaire prépare sa réponse…
              </div>
            )}
            <div ref={end} />
          </div>
          <div className="conversation-controls">
            {recorder.state === 'requesting' && (
              <button
                className="text-button"
                onClick={() => {
                  recorder.cancelPermission();
                  requestAnimationFrame(() => draftInput.current?.focus());
                }}
              >
                Continuer à l’écrit
              </button>
            )}
            {conflict && (
              <button
                className="button button-secondary"
                disabled={!!busy || microphoneBusy}
                onClick={() => void reload()}
              >
                Recharger la conversation
              </button>
            )}
            {ended ? (
              <div className="session-ended">
                <Check size={24} />
                <div>
                  <h3>Une bonne pause pour faire le point.</h3>
                  <p>
                    {learnerCount >= 8
                      ? 'Vous avez effectué les huit prises de parole.'
                      : 'Votre session de cinq minutes est terminée.'}{' '}
                    Retrouvez les phrases qui ont fait avancer la conversation.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="record-row">
                  <button
                    className={`record-button ${recorder.state === 'recording' ? 'is-recording' : ''}`}
                    disabled={
                      !!busy ||
                      (!local && !status.speech) ||
                      recorder.state === 'requesting' ||
                      recorder.state === 'transcribing' ||
                      !!loadingAudioId
                    }
                    onClick={() => {
                      if (recorder.state === 'recording') recorder.stop();
                      else {
                        stopAudio();
                        void recorder.start();
                      }
                    }}
                  >
                    {recorder.state === 'recording' ? (
                      <Stop size={24} weight="fill" />
                    ) : recorder.state === 'transcribing' || recorder.state === 'requesting' ? (
                      <CircleNotch size={24} className="spin" />
                    ) : (
                      <Microphone size={25} />
                    )}
                    <span>
                      {recorder.state === 'recording'
                        ? `Terminer · ${recorder.seconds}s`
                        : recorder.state === 'transcribing'
                          ? local
                            ? 'Préparation de l’audio…'
                            : 'Transcription…'
                          : recorder.state === 'requesting'
                            ? 'Accès au micro…'
                            : 'À vous de parler'}
                    </span>
                  </button>
                  <span className="record-help">
                    {!local && !status.speech ? (
                      'Microphone disponible après configuration du service vocal.'
                    ) : (
                      <>
                        Une phrase à la fois.
                        <br />
                        30 secondes maximum.
                      </>
                    )}
                  </span>
                </div>
                {local && (
                  <p className="local-mode-note">
                    Enregistrez-vous, écoutez-vous puis saisissez votre réponse. Rien n’est envoyé à
                    un service vocal ; les répliques du partenaire suivent une scène fixe.
                  </p>
                )}
                {local && recorder.localRecordingUrl && (
                  <audio
                    ref={localAudio}
                    className="local-recording"
                    controls
                    src={recorder.localRecordingUrl}
                    aria-label="Écouter mon enregistrement local"
                  />
                )}
                <label className="field reply-field">
                  <span>
                    {transcribed
                      ? 'Vérifiez la transcription avant de l’envoyer'
                      : 'Ou écrivez votre réponse en coréen'}
                  </span>
                  <textarea
                    ref={draftInput}
                    lang="ko"
                    value={draft}
                    maxLength={2000}
                    rows={2}
                    disabled={!!busy || microphoneBusy}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        void sendTurn();
                      }
                    }}
                    placeholder="Votre réponse…"
                  />
                </label>
                <div className="reply-actions">
                  <span className="fine-print">
                    {transcribed
                      ? 'Corrigez librement : seule la version envoyée sera évaluée.'
                      : 'L’écrit reste disponible si votre micro ne fonctionne pas.'}
                  </span>
                  <button
                    className="button button-primary"
                    disabled={!draft.trim() || !!busy || microphoneBusy}
                    onClick={() => void sendTurn()}
                  >
                    {busy === 'send'
                      ? 'Réponse en cours…'
                      : transcribed
                        ? 'Confirmer et envoyer'
                        : 'Envoyer'}
                    <PaperPlaneTilt size={17} />
                  </button>
                </div>
              </>
            )}
            {(error || recorder.error) && (
              <p className="error-message" role="alert">
                <WarningCircle size={18} />
                {error || recorder.error}
              </p>
            )}
            <div className="end-session-row">
              <span>
                {local
                  ? 'Enregistrement local uniquement · aucune transcription automatique.'
                  : status.speech
                    ? 'Écoutez les réponses avec le bouton audio.'
                    : 'Lecture audio non configurée · les réponses restent lisibles.'}
              </span>
              <button
                className="text-button"
                disabled={!!busy || microphoneBusy || !learnerCount}
                onClick={() => void complete()}
              >
                {busy === 'complete' ? 'Préparation du bilan…' : 'Terminer et voir mon bilan'}
                <ArrowRight size={16} />
              </button>
            </div>
            <button
              className="text-button abandon-session"
              disabled={!!busy || microphoneBusy}
              onClick={() => void abandon()}
            >
              Supprimer cette conversation inachevée
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
