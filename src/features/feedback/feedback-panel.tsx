'use client';
import { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChatCircleDots,
  Clock,
  Flag,
  Lightbulb,
  PencilSimple,
  Quotes,
  Question,
  Repeat,
  WarningCircle,
} from '@phosphor-icons/react';
import type { Observation, SpeakingSession } from '@/lib/contracts';
import type { OralReviewState } from '@/lib/review';
import {
  amendPracticeTurn,
  flagPracticeFeedback,
  finishPractice,
  getPracticeSession,
} from '@/lib/practice-client';
import { ApiClientError } from '@/lib/client-api';
import { messageOf } from '@/features/app/client';
export const outcomeLabels: Record<Observation['outcome'], string> = {
  independent_use: 'Utilisé sans aide',
  assisted_use: 'Utilisé avec un indice',
  needs_practice: 'À remettre en pratique',
  not_observed: 'Pas encore observé',
  uncertain: 'Observation incertaine',
};
const goalLabels = {
  yes: 'Votre message est passé.',
  partly: 'Votre objectif est en partie atteint.',
  no: 'Votre objectif reste à travailler.',
  uncertain: 'Votre objectif n’a pas pu être évalué.',
};
export function FeedbackPanel({
  session,
  reviews,
  onChange,
  onBack,
  onPractice,
}: {
  session: SpeakingSession;
  reviews: Record<string, OralReviewState>;
  onChange: (session: SpeakingSession) => void;
  onBack: () => void;
  onPractice: () => void;
}) {
  const feedback = session.feedback;
  const local = session.mode === 'local';
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  const operations = useRef(new Map<string, string>());
  function id(action: string, payload: unknown) {
    const key = JSON.stringify({ action, payload, revision: session.revision ?? 0 });
    let value = operations.current.get(key);
    if (!value) {
      value = crypto.randomUUID();
      operations.current.set(key, value);
    }
    return value;
  }
  async function amend() {
    if (!editing || !text.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const updated = await amendPracticeTurn(session, {
        operationId: id('amend', { editing, text: text.trim() }),
        turnId: editing,
        text: text.trim(),
      });
      onChange(updated);
      setEditing(null);
      setNotice(
        'La phrase est corrigée. L’ancien bilan et ses révisions ont été retirés ; vous pouvez demander un nouveau bilan.',
      );
    } catch (failure) {
      setConflict(
        failure instanceof ApiClientError &&
          ['SESSION_CONFLICT', 'REVISION_CONFLICT'].includes(failure.code),
      );
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }
  async function flag(targetId: string) {
    setBusy(true);
    setError('');
    try {
      const updated = await flagPracticeFeedback(session, {
        operationId: id('flag', targetId),
        targetId,
      });
      onChange(updated);
      setNotice(
        'Ce retour est marqué comme incertain et ne contribue plus à la révision orale. Aucun appel IA supplémentaire.',
      );
    } catch (failure) {
      setConflict(
        failure instanceof ApiClientError &&
          ['SESSION_CONFLICT', 'REVISION_CONFLICT'].includes(failure.code),
      );
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }
  async function reevaluate() {
    setBusy(true);
    setError('');
    try {
      const updated = await finishPractice(session, id('reevaluate', {}));
      onChange(updated);
      setNotice(
        local ? 'Le récapitulatif local a été actualisé.' : 'Le nouveau bilan est disponible.',
      );
    } catch (failure) {
      if (failure instanceof ApiClientError && failure.retry === 'new-operation')
        operations.current.clear();
      setConflict(
        failure instanceof ApiClientError &&
          ['SESSION_CONFLICT', 'REVISION_CONFLICT'].includes(failure.code),
      );
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }
  async function reload() {
    setBusy(true);
    setError('');
    try {
      onChange(await getPracticeSession(session.id, session.mode ?? 'live'));
      operations.current.clear();
      setConflict(false);
      setEditing(null);
      setNotice('La conversation et son bilan sont à jour.');
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="feedback-page">
      <button className="text-button" onClick={onBack}>
        <ArrowLeft size={17} />
        Mes expressions
      </button>
      <div className="feedback-heading">
        <div>
          <span className="eyebrow">
            {local ? 'Entraînement local guidé · sans IA' : 'Après la conversation'}
          </span>
          <h1>
            {local ? (
              <>
                Votre parcours, <br />à votre rythme.
              </>
            ) : (
              <>
                Ce que vous avez
                <br />
                réussi à exprimer.
              </>
            )}
          </h1>
          <p>{session.setup.goal}</p>
        </div>
        <div className="feedback-seal">
          <ChatCircleDots size={38} weight="light" />
          <span>
            Une vraie tentative.
            <br />
            Un prochain pas.
          </span>
        </div>
      </div>
      {local && (
        <div className="notice">
          <ChatCircleDots size={22} />
          <p>
            Ce parcours utilise des répliques écrites à l’avance. Aucune IA n’a évalué vos réponses
            et aucune réussite orale n’est ajoutée à votre suivi.
          </p>
        </div>
      )}
      {error && (
        <p className="error-message" role="alert">
          <WarningCircle size={18} />
          {error}
        </p>
      )}
      {conflict && (
        <button className="button button-secondary" disabled={busy} onClick={() => void reload()}>
          Recharger la conversation
        </button>
      )}
      {notice && (
        <p className="success-message" role="status">
          {notice}
        </p>
      )}
      {feedback ? (
        <>
          <div className="goal-result">
            <span className="goal-icon">
              {!local && feedback.goalAchieved === 'yes' ? (
                <Check size={24} />
              ) : (
                <ChatCircleDots size={24} />
              )}
            </span>
            <div>
              <span className="eyebrow">
                {local ? 'Récapitulatif sans évaluation' : 'L’objectif de communication'}
              </span>
              <h2>
                {local ? 'Vous avez exploré la situation.' : goalLabels[feedback.goalAchieved]}
              </h2>
              <p>{feedback.summary}</p>
            </div>
          </div>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Les expressions en contexte</span>
              <h2>
                {local ? 'Des idées pour continuer.' : 'Des observations, avec leurs preuves.'}
              </h2>
            </div>
            <p>
              Une paraphrase peut faire passer votre message.
              <br />
              Un mot non observé n’est pas un échec.
            </p>
          </div>
          <div className="feedback-grid">
            {feedback.observations.map((observation) => {
              const item = session.setup.targets.find(
                (target) => target.id === observation.targetId,
              );
              const review = !local ? reviews[observation.targetId] : undefined;
              const Icon =
                observation.outcome === 'independent_use'
                  ? Check
                  : observation.outcome === 'assisted_use'
                    ? Lightbulb
                    : observation.outcome === 'needs_practice'
                      ? Repeat
                      : Question;
              const flagged = session.feedbackFlags?.some(
                (flag) => flag.targetId === observation.targetId,
              );
              return (
                <article className="observation-card" key={observation.targetId}>
                  <div className={`outcome-label outcome-${observation.outcome}`}>
                    <Icon size={16} />
                    {local ? 'Non évalué' : outcomeLabels[observation.outcome]}
                  </div>
                  <h3 lang="ko">{item?.expression}</h3>
                  <p className="meaning">{item?.meaning}</p>
                  <p className="observation-explanation">{observation.explanation}</p>
                  {observation.evidence.length ? (
                    <div className="evidence-list">
                      {observation.evidence.map((evidence, index) => (
                        <blockquote key={`${evidence.turnId}-${index}`}>
                          <Quotes size={18} />
                          <p lang="ko">{evidence.quote}</p>
                          <cite>{evidenceLabel(session, evidence.turnId)}</cite>
                        </blockquote>
                      ))}
                    </div>
                  ) : (
                    <div className="no-evidence">
                      {local
                        ? 'Pas d’analyse automatique dans ce mode.'
                        : 'Aucune phrase ne permet une conclusion certaine pour cette expression.'}
                    </div>
                  )}
                  <div className="next-practice">
                    <span>Le prochain petit pas</span>
                    <p>{observation.nextPractice}</p>
                    {review && (
                      <small>
                        <Clock size={14} />À reprendre{' '}
                        {new Date(review.dueAt).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </small>
                    )}
                  </div>
                  {!local && (
                    <button
                      className="text-button feedback-flag"
                      disabled={busy || flagged}
                      onClick={() => void flag(observation.targetId)}
                    >
                      <Flag size={15} />
                      {flagged ? 'Retour signalé' : 'Ce retour me semble incorrect'}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <div className="reevaluate-panel">
          <WarningCircle size={26} />
          <div>
            <h2>Votre bilan doit être recalculé.</h2>
            <p>
              Une transcription a été corrigée. L’ancien bilan est invalidé et ne contribue plus au
              calendrier oral.
            </p>
            <p className="fine-print">
              {local
                ? 'Le récapitulatif local sera actualisé sans service externe.'
                : 'Demander un nouveau bilan déclenche un appel Meta dans la limite du budget configuré.'}
            </p>
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() => void reevaluate()}
            >
              {busy
                ? 'Préparation…'
                : local
                  ? 'Actualiser le récapitulatif'
                  : 'Recalculer le bilan'}
            </button>
          </div>
        </div>
      )}
      <details className="transcript-review" open={!feedback}>
        <summary>Relire la conversation et corriger une transcription</summary>
        <p className="fine-print">
          Corriger une phrase invalide le bilan entier. Le texte corrigé ne sera pas utilisé comme
          preuve d’une réussite orale indépendante.
        </p>
        {session.turns.map((turn) => (
          <div key={turn.id} className={`review-turn review-turn-${turn.role}`}>
            <div>
              <strong>{turn.role === 'learner' ? 'Vous' : 'Votre partenaire'}</strong>
              <span>
                {turn.role === 'learner'
                  ? evidenceLabel(session, turn.id)
                  : local
                    ? 'Réplique du scénario'
                    : 'Réponse IA'}
              </span>
            </div>
            {editing === turn.id ? (
              <>
                <label className="field">
                  <span>Corriger ma phrase</span>
                  <textarea
                    lang="ko"
                    rows={3}
                    value={text}
                    maxLength={2000}
                    disabled={busy}
                    onChange={(event) => setText(event.target.value)}
                  />
                </label>
                <div className="edit-actions">
                  <button
                    className="button button-secondary"
                    disabled={busy}
                    onClick={() => setEditing(null)}
                  >
                    Annuler
                  </button>
                  <button
                    className="button button-primary"
                    disabled={busy || !text.trim() || text.trim() === turn.text}
                    onClick={() => void amend()}
                  >
                    Enregistrer et invalider le bilan
                  </button>
                </div>
              </>
            ) : (
              <>
                <p lang="ko">{turn.text}</p>
                {turn.role === 'learner' && (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      setEditing(turn.id);
                      setText(turn.text);
                      setError('');
                    }}
                  >
                    <PencilSimple size={15} />
                    Corriger cette phrase
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </details>
      <div className="feedback-bottom">
        <p>
          Ce bilan porte sur cette conversation. Il ne constitue ni un score de prononciation, ni
          une mesure de maîtrise durable.
        </p>
        <button className="button button-primary" onClick={onPractice}>
          Préparer une autre situation <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}
function evidenceLabel(session: SpeakingSession, turnId: string) {
  const turn = session.turns.find((item) => item.id === turnId);
  return turn?.inputMode === 'spoken'
    ? turn.corrected
      ? 'Votre transcription corrigée · exclue du suivi oral'
      : 'Votre phrase prononcée pendant cette conversation'
    : 'Votre réponse écrite · exclue du suivi oral';
}
