'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  CalendarBlank,
  ChatCircleDots,
  Check,
  CheckCircle,
  Clock,
  DownloadSimple,
  GearSix,
  HandWaving,
  Microphone,
  Plus,
  Repeat,
  Trash,
  WarningCircle,
  Wrench,
} from '@phosphor-icons/react';
import {
  sessionSchema,
  type ProviderStatus,
  type SessionSetup,
  type SpeakingSession,
  type VocabularyItem,
} from '@/lib/contracts';
import {
  observationHasSpokenEvidence,
  scheduleOralReview,
  type OralReviewState,
} from '@/lib/review';
import { ImportDialog } from '@/features/imports/import-dialog';
import { SessionPanel } from '@/features/speaking/session-panel';
import { FeedbackPanel } from '@/features/feedback/feedback-panel';
import { RecallDialog } from '@/features/vocabulary/recall-dialog';
import {
  addCollection,
  downloadLibrary,
  emptyLibrary,
  readLibrary,
  saveCompletedSession,
  writeLibrary,
  type LocalLibrary,
} from './local-library';
import { messageOf, request } from './client';

const inactiveStatus: ProviderStatus = {
  aiEnabled: false,
  meta: false,
  speech: false,
  storage: false,
  authenticated: false,
};
const scenarios = [
  {
    id: 'request',
    label: 'Demander quelque chose',
    description: 'Un service, un objet, un renseignement.',
    icon: HandWaving,
    goal: 'Demander à emprunter un chargeur et convenir du moment pour le rendre.',
  },
  {
    id: 'appointment',
    label: 'Prévoir un rendez-vous',
    description: 'Trouver le bon jour et la bonne heure.',
    icon: CalendarBlank,
    goal: 'Prendre rendez-vous et confirmer l’heure qui me convient.',
  },
  {
    id: 'problem',
    label: 'Expliquer un problème',
    description: 'Décrire la situation et trouver de l’aide.',
    icon: Wrench,
    goal: 'Expliquer que ma connexion Internet ne fonctionne plus et demander de l’aide.',
  },
] as const;
const activeSessionKey = 'language-speaking-active-session';

export default function LanguageApp() {
  const [library, setLibrary] = useState<LocalLibrary>(emptyLibrary);
  const [loaded, setLoaded] = useState(false);
  const [storageHealthy, setStorageHealthy] = useState(true);
  const [status, setStatus] = useState<ProviderStatus>(inactiveStatus);
  const [statusLoading, setStatusLoading] = useState(true);
  const [collectionId, setCollectionId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'new' | 'sample' | null>(null);
  const [recall, setRecall] = useState(false);
  const [view, setView] = useState<'practice' | 'history' | 'session' | 'feedback'>('practice');
  const [session, setSession] = useState<SpeakingSession | null>(null);
  const [displaySession, setDisplaySession] = useState<SpeakingSession | null>(null);
  const [scenario, setScenario] = useState<SessionSetup['scenario']>('request');
  const [goal, setGoal] = useState<string>(scenarios[0].goal);
  const [level, setLevel] = useState<SessionSetup['level']>('beginner');
  const [relationship, setRelationship] = useState<SessionSetup['relationship']>('stranger');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const startOperation = useRef<{ key: string; id: string } | null>(null);
  const currentCollection =
    library.collections.find((collection) => collection.id === collectionId) ??
    library.collections[0];
  const selectedItems =
    currentCollection?.items.filter((item) => selectedIds.includes(item.id)) ?? [];
  const ready = status.aiEnabled && status.meta && status.storage && status.authenticated;
  const totalWords = library.collections.reduce(
    (total, collection) => total + collection.items.length,
    0,
  );
  const reviews = useMemo(() => {
    const result: Record<string, OralReviewState> = {};
    [...library.history]
      .sort(
        (a, b) =>
          Date.parse(a.turns.at(-1)?.createdAt ?? a.createdAt) -
          Date.parse(b.turns.at(-1)?.createdAt ?? b.createdAt),
      )
      .forEach((entry) => {
        const observedAt = new Date(entry.turns.at(-1)?.createdAt ?? entry.createdAt);
        entry.feedback?.observations.forEach((observation) => {
          if (!observationHasSpokenEvidence(observation, entry)) return;
          const next = scheduleOralReview(
            observation,
            entry.id,
            observedAt,
            result[observation.targetId],
          );
          if (next) result[observation.targetId] = next;
        });
      });
    return result;
  }, [library.history]);

  useEffect(() => {
    try {
      const saved = readLibrary();
      setLibrary(saved);
      if (saved.collections[0]) {
        setCollectionId(saved.collections[0].id);
        setSelectedIds(saved.collections[0].items.slice(0, 3).map((item) => item.id));
      }
      const active = sessionStorage.getItem(activeSessionKey);
      if (active) {
        const parsed = sessionSchema.safeParse(JSON.parse(active));
        if (parsed.success && parsed.data.status === 'active') setSession(parsed.data);
      }
    } catch (failure) {
      setStorageHealthy(false);
      setError(messageOf(failure));
    }
    setLoaded(true);
    request<ProviderStatus>('/api/status')
      .then(setStatus)
      .catch(() =>
        setError(
          'Impossible de vérifier la connexion aux services. Les imports locaux restent disponibles.',
        ),
      )
      .finally(() => setStatusLoading(false));
  }, []);

  function persist(next: LocalLibrary) {
    writeLibrary(next);
    setLibrary(next);
  }

  function confirmImport(title: string, items: VocabularyItem[]) {
    const next = addCollection(library, title, items);
    persist(next);
    const created = next.collections.at(-1)!;
    setCollectionId(created.id);
    setSelectedIds(created.items.slice(0, 3).map((item) => item.id));
    setImportMode(null);
    setView('practice');
    setNotice(
      `${created.items.length} expressions ajoutées. Choisissez maintenant une situation pour les utiliser.`,
    );
  }

  function chooseCollection(id: string) {
    const collection = library.collections.find((candidate) => candidate.id === id);
    setCollectionId(id);
    setSelectedIds(collection?.items.slice(0, 3).map((item) => item.id) ?? []);
  }

  function changeSession(next: SpeakingSession) {
    setSession(next);
    try {
      if (next.status === 'active') sessionStorage.setItem(activeSessionKey, JSON.stringify(next));
      else sessionStorage.removeItem(activeSessionKey);
    } catch {
      setNotice(
        'La session fonctionne, mais le navigateur ne peut pas conserver sa reprise après rechargement.',
      );
    }
  }

  async function startSession() {
    if (!ready || selectedItems.length !== 3 || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const setup = {
        scenario,
        goal,
        level,
        relationship,
        targets: selectedItems,
        targetLanguage: 'ko',
        explanationLanguage: 'fr',
      };
      const key = JSON.stringify(setup);
      if (!startOperation.current || startOperation.current.key !== key)
        startOperation.current = { key, id: crypto.randomUUID() };
      const next = await request<SpeakingSession>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ operationId: startOperation.current.id, setup }),
      });
      startOperation.current = null;
      changeSession(next);
      setView('session');
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }

  async function resumeSession() {
    if (!session) return;
    setBusy(true);
    setError('');
    try {
      const current = await request<SpeakingSession>(`/api/sessions/${session.id}`);
      changeSession(current);
      if (current.status === 'completed') completeSession(current);
      else setView('session');
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }

  function completeSession(completed: SpeakingSession) {
    try {
      persist(saveCompletedSession(library, completed));
    } catch {
      setError(
        'Votre bilan est disponible, mais il n’a pas pu être enregistré dans ce navigateur.',
      );
    }
    setDisplaySession(completed);
    setSession(null);
    try {
      sessionStorage.removeItem(activeSessionKey);
    } catch {
      /* The visible result remains usable without browser storage. */
    }
    setView('feedback');
  }

  function deleteCollection(id: string) {
    if (
      !window.confirm(
        'Supprimer cette collection de ce navigateur ? Les bilans de conversation seront conservés séparément.',
      )
    )
      return;
    try {
      const next = {
        ...library,
        collections: library.collections.filter((collection) => collection.id !== id),
      };
      persist(next);
      if (id === collectionId) {
        setCollectionId(next.collections[0]?.id ?? '');
        setSelectedIds(next.collections[0]?.items.slice(0, 3).map((item) => item.id) ?? []);
      }
    } catch (failure) {
      setError(messageOf(failure));
    }
  }

  async function deleteHistory(entry: SpeakingSession) {
    if (
      !window.confirm(
        'Supprimer cette conversation et son bilan du serveur et de ce navigateur ? Cette action est définitive.',
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/sessions/${entry.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message || 'Impossible de supprimer la conversation.');
      }
      persist({
        ...library,
        history: library.history.filter((previous) => previous.id !== entry.id),
      });
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a href="/" className="wordmark" aria-label="Language Speaking, accueil">
          <span className="brand-symbol">
            <ChatCircleDots size={25} weight="fill" />
          </span>
          <span>
            language<span className="wordmark-light">speaking</span>
            <small>Nom de travail</small>
          </span>
        </a>
        <nav className="main-nav" aria-label="Navigation principale">
          <button
            className={view !== 'history' ? 'active' : ''}
            onClick={() => setView('practice')}
          >
            Pratiquer
          </button>
          <button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}>
            Mes conversations{library.history.length > 0 && <span>{library.history.length}</span>}
          </button>
        </nav>
        <a className="settings-link" href="/settings">
          <span className={`status-dot ${ready ? '' : 'is-muted'}`} />
          {statusLoading ? 'Connexion…' : ready ? 'Connecté' : 'Configuration'}
          <GearSix size={19} />
        </a>
      </header>
      <main className="main-content">
        {error && (
          <div className="error-message page-alert" role="alert">
            <WarningCircle size={20} />
            <span>{error}</span>
            <button className="text-button" onClick={() => setError('')}>
              Fermer
            </button>
          </div>
        )}
        {notice && (
          <div className="success-message page-alert" role="status">
            <CheckCircle size={20} />
            <span>{notice}</span>
            <button className="text-button" onClick={() => setNotice('')}>
              Fermer
            </button>
          </div>
        )}
        {!loaded ? (
          <div className="loading-state" role="status">
            Ouverture de votre espace…
          </div>
        ) : view === 'session' && session ? (
          <SessionPanel
            session={session}
            status={status}
            onChange={changeSession}
            onBack={() => setView('practice')}
            onComplete={completeSession}
            onAbandon={() => {
              setSession(null);
              try {
                sessionStorage.removeItem(activeSessionKey);
              } catch {
                /* Storage may be unavailable. */
              }
              setView('practice');
              setNotice(
                'La conversation a été supprimée. Vous pouvez préparer une autre situation.',
              );
            }}
          />
        ) : view === 'feedback' && displaySession ? (
          <FeedbackPanel
            session={displaySession}
            reviews={reviews}
            onBack={() => setView('practice')}
            onPractice={() => {
              setView('practice');
              setNotice(
                'Essayez un autre contexte avec ces expressions. Une répétition immédiate ne compte pas comme une nouvelle maîtrise.',
              );
            }}
          />
        ) : view === 'history' ? (
          <>
            <section className="page-heading">
              <span className="eyebrow">Votre chemin à l’oral</span>
              <h1>
                Chaque conversation
                <br />
                laisse une petite trace.
              </h1>
              <p>Vos phrases, les indices utilisés et ce que vous pourrez réessayer.</p>
              <p className="history-privacy-note">
                Les bilans ci-dessous sont aussi conservés dans ce navigateur. Toute personne
                utilisant ce profil du navigateur peut les voir. Les réponses écrites et les
                transcriptions corrigées ne modifient pas votre calendrier de révision orale.
              </p>
            </section>
            {!library.history.length ? (
              <div className="empty-history">
                <ChatCircleDots size={42} weight="light" />
                <h2>Votre première conversation vous attend.</h2>
                <p>Après une session, retrouvez ici son bilan et vos prochains pas.</p>
                <button className="button button-primary" onClick={() => setView('practice')}>
                  Préparer ma conversation <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <div className="history-list">
                {library.history.map((entry) => (
                  <article className="history-card" key={entry.id}>
                    <span className="history-icon">
                      <ChatCircleDots size={24} />
                    </span>
                    <div>
                      <span className="eyebrow">
                        {new Date(entry.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                        })}{' '}
                        · {entry.turns.filter((turn) => turn.role === 'learner').length} prises de
                        parole
                      </span>
                      <h2>{entry.setup.goal}</h2>
                      <p>{entry.setup.targets.map((target) => target.expression).join(' · ')}</p>
                    </div>
                    <button
                      className="button button-secondary"
                      onClick={() => {
                        setDisplaySession(entry);
                        setView('feedback');
                      }}
                    >
                      Voir le bilan <ArrowRight size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Supprimer la conversation ${entry.setup.goal}`}
                      disabled={busy}
                      onClick={() => void deleteHistory(entry)}
                    >
                      <Trash size={18} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <section className="home-heading">
              <div>
                <div className="eyebrow">
                  <span className="mini-line" /> DU CORÉEN DANS VOTRE QUOTIDIEN
                </div>
                <h1>
                  Vos mots.
                  <br />
                  <span>De vraies conversations.</span>
                </h1>
                <p>
                  Ce vocabulaire que vous connaissez déjà,
                  <br className="desktop-break" /> apprenez à le retrouver quand vous en avez
                  besoin.
                </p>
              </div>
              <div className="home-note">
                <span className="note-korean" lang="ko">
                  말해 볼까요?
                </span>
                <span className="note-translation">Et si on en parlait ?</span>
                <div className="note-rule" />
                <p>
                  3 expressions.
                  <br />
                  Une situation.
                  <br />
                  <strong>À vous la parole.</strong>
                </p>
                <span className="note-mark">KO → FR</span>
              </div>
            </section>
            <div className="workspace-heading">
              <div className="workspace-label">
                <span className="step-pill">01</span>
                <h2>Vos mots, pour commencer.</h2>
                <span className="count-pill">{totalWords}</span>
              </div>
              <button
                className="button button-secondary"
                disabled={!storageHealthy}
                onClick={() => setImportMode('new')}
              >
                <Plus size={18} /> Importer du vocabulaire
              </button>
            </div>
            {session && (
              <div className="resume-banner">
                <ChatCircleDots size={21} />
                <div>
                  <strong>Une conversation est en cours.</strong>
                  <p>{session.setup.goal}</p>
                </div>
                <button
                  className="button button-secondary"
                  onClick={() => void resumeSession()}
                  disabled={busy || !ready}
                >
                  Reprendre <ArrowRight size={17} />
                </button>
              </div>
            )}
            <div className="workspace-grid">
              <section className="vocabulary-panel" aria-label="Bibliothèque de vocabulaire">
                {currentCollection ? (
                  <>
                    <div className="collection-toolbar">
                      <label className="collection-selector">
                        <span className="visually-hidden">Collection de vocabulaire</span>
                        <BookOpen size={20} />
                        <select
                          value={currentCollection.id}
                          onChange={(event) => chooseCollection(event.target.value)}
                        >
                          {library.collections.map((collection) => (
                            <option key={collection.id} value={collection.id}>
                              {collection.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="icon-button"
                        aria-label="Supprimer cette collection"
                        onClick={() => deleteCollection(currentCollection.id)}
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                    <div className="selection-instruction">
                      <span>
                        Sélectionnez <strong>3 expressions liées</strong> pour votre conversation.
                      </span>
                      <span
                        className={
                          selectedItems.length === 3
                            ? 'selection-count complete'
                            : 'selection-count'
                        }
                      >
                        {selectedItems.length}/3 <Check size={14} />
                      </span>
                    </div>
                    <div className="vocabulary-list">
                      {currentCollection.items.map((item) => {
                        const selected = selectedIds.includes(item.id);
                        const due = reviews[item.id];
                        return (
                          <label
                            key={item.id}
                            className={`vocabulary-row ${selected ? 'selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={!selected && selectedIds.length >= 3}
                              onChange={() =>
                                setSelectedIds((previous) =>
                                  selected
                                    ? previous.filter((id) => id !== item.id)
                                    : [...previous, item.id],
                                )
                              }
                            />
                            <span className="vocabulary-expression">
                              <strong lang="ko">{item.expression}</strong>
                              {item.example && <small lang="ko">{item.example}</small>}
                            </span>
                            <span className="vocabulary-meaning">
                              {item.meaning}
                              {due && (
                                <small>
                                  <Clock size={12} />{' '}
                                  {Date.parse(due.dueAt) <= Date.now()
                                    ? 'À reprendre'
                                    : `À revoir le ${new Date(due.dueAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                                </small>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="library-footer">
                      <button
                        className="text-button"
                        onClick={() => setRecall(true)}
                        disabled={!selectedItems.length}
                      >
                        <Repeat size={17} /> Un petit rappel avant de parler
                      </button>
                      <span>{currentCollection.items.length} expressions</span>
                    </div>
                  </>
                ) : (
                  <div className="empty-library">
                    <div className="empty-library-icon">
                      <BookOpen size={35} weight="light" />
                    </div>
                    <h3>
                      Vos mots ont déjà
                      <br />
                      une histoire.
                    </h3>
                    <p>
                      Un deck de flashcards, les mots d’un livre,
                      <br />
                      une liste que vous avez gardée.
                      <br />
                      Commencez par ce qui compte pour vous.
                    </p>
                    <button
                      className="button button-primary"
                      onClick={() => setImportMode('new')}
                      disabled={!storageHealthy}
                    >
                      <Plus size={18} /> Importer mes mots
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setImportMode('sample')}
                      disabled={!storageHealthy}
                    >
                      Ou essayer 5 expressions d’exemple <ArrowRight size={16} />
                    </button>
                    <div className="supported-sources">
                      <span>Anki</span>
                      <span>Quizlet</span>
                      <span>FlashCardStudy</span>
                      <span>CSV</span>
                      <span>Photo</span>
                    </div>
                  </div>
                )}
                <div className="local-storage-note">
                  <span className="status-dot is-muted" />
                  <p>
                    Collections enregistrées dans ce navigateur.{' '}
                    <strong>Pas encore de synchronisation entre appareils.</strong>
                  </p>
                  {library.collections.length > 0 && (
                    <button
                      className="icon-button"
                      title="Télécharger une archive locale"
                      aria-label="Télécharger une archive des données locales"
                      onClick={() => downloadLibrary(library)}
                    >
                      <DownloadSimple size={16} />
                    </button>
                  )}
                </div>
              </section>
              <section className="preparation-panel" aria-label="Préparer une conversation">
                <div className="panel-heading">
                  <span className="step-pill">02</span>
                  <div>
                    <h2>Où allez-vous les utiliser ?</h2>
                    <p>Une petite situation. Un vrai besoin.</p>
                  </div>
                </div>
                <div className="scenario-options" role="group" aria-label="Type de situation">
                  {scenarios.map((option) => (
                    <button
                      key={option.id}
                      className={`scenario-option ${scenario === option.id ? 'active' : ''}`}
                      aria-pressed={scenario === option.id}
                      onClick={() => {
                        setScenario(option.id);
                        setGoal(option.goal);
                      }}
                    >
                      <option.icon size={22} weight="regular" />
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                      <span className="radio-indicator" />
                    </button>
                  ))}
                </div>
                <label className="field">
                  <span>Ce que vous voulez réussir à dire</span>
                  <textarea
                    rows={3}
                    value={goal}
                    maxLength={500}
                    onChange={(event) => setGoal(event.target.value)}
                  />
                </label>
                <div className="field-row">
                  <label className="field">
                    <span>Votre niveau</span>
                    <select
                      value={level}
                      onChange={(event) => setLevel(event.target.value as SessionSetup['level'])}
                    >
                      <option value="beginner">Débutant · guidé</option>
                      <option value="intermediate">Intermédiaire</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Votre interlocuteur</span>
                    <select
                      value={relationship}
                      onChange={(event) =>
                        setRelationship(event.target.value as SessionSetup['relationship'])
                      }
                    >
                      <option value="stranger">Une personne inconnue</option>
                      <option value="colleague">Un collègue</option>
                      <option value="friend">Un ami</option>
                    </select>
                  </label>
                </div>
                <div className="session-promise">
                  <Microphone size={17} />
                  <span>En coréen · jusqu’à 5 minutes · à votre rythme</span>
                </div>
                <button
                  className="button button-primary button-full start-session"
                  disabled={
                    !ready ||
                    selectedItems.length !== 3 ||
                    goal.trim().length < 3 ||
                    busy ||
                    !!session
                  }
                  onClick={() => void startSession()}
                >
                  {busy ? 'Préparation de votre situation…' : 'Entrer dans la conversation'}
                  <ArrowRight size={19} />
                </button>
                {!ready && (
                  <p className="configuration-hint">
                    {statusLoading ? (
                      'Vérification des services…'
                    ) : (
                      <>
                        Les imports sont prêts.{' '}
                        <a href="/settings">Configurez les services et connectez-vous</a> pour
                        parler avec l’IA.
                      </>
                    )}
                  </p>
                )}
                {ready && selectedItems.length !== 3 && (
                  <p className="configuration-hint">
                    Sélectionnez trois expressions dans votre collection.
                  </p>
                )}
                {session && (
                  <p className="configuration-hint">
                    Reprenez votre conversation en cours avant d’en commencer une autre.
                  </p>
                )}
              </section>
            </div>
            <section className="learning-strip">
              <div>
                <span className="strip-number">01</span>
                <p>
                  <strong>Retrouvez vos mots.</strong>
                  <span>Importez, vérifiez et choisissez.</span>
                </p>
              </div>
              <ArrowRight size={18} className="strip-arrow" />
              <div>
                <span className="strip-number">02</span>
                <p>
                  <strong>Faites passer votre message.</strong>
                  <span>Parlez, cherchez, demandez un indice.</span>
                </p>
              </div>
              <ArrowRight size={18} className="strip-arrow" />
              <div>
                <span className="strip-number">03</span>
                <p>
                  <strong>Essayez à nouveau.</strong>
                  <span>Un retour concret. Une autre occasion.</span>
                </p>
              </div>
            </section>
          </>
        )}
      </main>
      <footer className="site-footer">
        <span>Des mots que l’on apprend aux conversations que l’on vit.</span>
        <span>
          Coréen <span lang="ko">한국어</span>
          <ArrowDown size={12} /> Français
        </span>
      </footer>
      {importMode && (
        <ImportDialog
          useSample={importMode === 'sample'}
          canExtract={ready}
          onClose={() => setImportMode(null)}
          onConfirm={confirmImport}
        />
      )}
      {recall && selectedItems.length > 0 && (
        <RecallDialog items={selectedItems} onClose={() => setRecall(false)} />
      )}
    </div>
  );
}
