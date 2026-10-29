'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChatCircleDots,
  Clock,
  Lightbulb,
  Quotes,
  Question,
  Repeat,
} from '@phosphor-icons/react';
import type { Observation, SpeakingSession } from '@/lib/contracts';
import type { OralReviewState } from '@/lib/review';

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
  onBack,
  onPractice,
}: {
  session: SpeakingSession;
  reviews: Record<string, OralReviewState>;
  onBack: () => void;
  onPractice: () => void;
}) {
  const feedback = session.feedback;
  if (!feedback)
    return <div className="notice">Le bilan de cette session n’est pas encore disponible.</div>;
  return (
    <section className="feedback-page">
      <button className="text-button" onClick={onBack}>
        <ArrowLeft size={17} /> Mes expressions
      </button>
      <div className="feedback-heading">
        <div>
          <span className="eyebrow">Après la conversation</span>
          <h1>
            Ce que vous avez
            <br />
            réussi à exprimer.
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
      <div className="goal-result">
        <span className="goal-icon">
          {feedback.goalAchieved === 'yes' ? <Check size={24} /> : <ChatCircleDots size={24} />}
        </span>
        <div>
          <span className="eyebrow">L’objectif de communication</span>
          <h2>{goalLabels[feedback.goalAchieved]}</h2>
          <p>{feedback.summary}</p>
        </div>
      </div>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Les expressions en contexte</span>
          <h2>Des observations, avec leurs preuves.</h2>
        </div>
        <p>
          Une paraphrase peut faire passer votre message.
          <br />
          Un mot non observé n’est pas un échec.
        </p>
      </div>
      <div className="feedback-grid">
        {feedback.observations.map((observation) => {
          const item = session.setup.targets.find((target) => target.id === observation.targetId);
          const review = reviews[observation.targetId];
          const Icon =
            observation.outcome === 'independent_use'
              ? Check
              : observation.outcome === 'assisted_use'
                ? Lightbulb
                : observation.outcome === 'needs_practice'
                  ? Repeat
                  : Question;
          return (
            <article className="observation-card" key={observation.targetId}>
              <div className={`outcome-label outcome-${observation.outcome}`}>
                <Icon size={16} />
                {outcomeLabels[observation.outcome]}
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
                  Aucune phrase ne permet une conclusion certaine pour cette expression.
                </div>
              )}
              <div className="next-practice">
                <span>Le prochain petit pas</span>
                <p>{observation.nextPractice}</p>
                {review && (
                  <small>
                    <Clock size={14} /> À reprendre{' '}
                    {new Date(review.dueAt).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </small>
                )}
              </div>
            </article>
          );
        })}
      </div>
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
