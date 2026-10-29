'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  CalendarBlank,
  ChatCircleDots,
  CheckCircle,
  Cloud,
  DeviceMobile,
  GearSix,
  HandWaving,
  Microphone,
  Plus,
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
import type { CloudCollection } from '@/lib/cloud-contracts';
import { ApiClientError } from '@/lib/client-api';
import {
  startPractice,
  getPracticeSession,
  deletePracticeSession,
  restoreLocalPracticeSessions,
} from '@/lib/practice-client';
import {
  observationHasSpokenEvidence,
  scheduleOralReview,
  type OralReviewState,
} from '@/lib/review';
import { ImportDialog } from '@/features/imports/import-dialog';
import { SessionPanel } from '@/features/speaking/session-panel';
import { FeedbackPanel } from '@/features/feedback/feedback-panel';
import { RecallDialog } from '@/features/vocabulary/recall-dialog';
import { LibraryPanel } from '@/features/vocabulary/library-panel';
import { CollectionEditor } from '@/features/vocabulary/collection-editor';
import { RestoreDialog } from '@/features/vocabulary/restore-dialog';
import {
  addCollection,
  canonicalItems,
  downloadLibrary,
  emptyLibrary,
  mergeLibraryBackup,
  readLibrary,
  saveCompletedSession,
  updateCollection,
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
  localPractice: false,
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
const localActiveKey = 'language-speaking-active-session';
const activeKey = (userId?: string) =>
  userId ? `language-speaking-active-${userId}` : localActiveKey;

export default function LanguageApp() {
  const [library, setLibrary] = useState<LocalLibrary>(emptyLibrary);
  const [cloudCollections, setCloudCollections] = useState<CloudCollection[]>([]);
  const [cloudHistory, setCloudHistory] = useState<SpeakingSession[]>([]);
  const [cloudHistoryComplete, setCloudHistoryComplete] = useState(false);
  const [scope, setScope] = useState<'device' | 'account'>('device');
  const [loaded, setLoaded] = useState(false);
  const [storageHealthy, setStorageHealthy] = useState(true);
  const [status, setStatus] = useState<ProviderStatus>(inactiveStatus);
  const [statusLoading, setStatusLoading] = useState(true);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [collectionId, setCollectionId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'new' | 'sample' | null>(null);
  const [editor, setEditor] = useState<'new' | 'edit' | null>(null);
  const [restore, setRestore] = useState(false);
  const [recall, setRecall] = useState(false);
  const [view, setView] = useState<'practice' | 'history' | 'session' | 'feedback'>('practice');
  const [session, setSession] = useState<SpeakingSession | null>(null);
  const [displaySession, setDisplaySession] = useState<SpeakingSession | null>(null);
  const [mode, setMode] = useState<'local' | 'live'>('live');
  const [scenario, setScenario] = useState<SessionSetup['scenario']>('request');
  const [goal, setGoal] = useState<string>(scenarios[0].goal);
  const [level, setLevel] = useState<SessionSetup['level']>('beginner');
  const [relationship, setRelationship] = useState<SessionSetup['relationship']>('stranger');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const startOperation = useRef<{ key: string; id: string } | null>(null);
  const accountGeneration = useRef(0);
  const collectionCreation = useRef<{ key: string; id: string } | null>(null);
  const collections = scope === 'device' ? library.collections : cloudCollections;
  const history = scope === 'device' ? library.history : cloudHistory;
  const currentCollection =
    collections.find((collection) => collection.id === collectionId) ?? collections[0];
  const selectedItems =
    currentCollection?.items.filter((item) => selectedIds.includes(item.id)) ?? [];
  const ready = status.aiEnabled && status.meta && status.storage && status.authenticated;
  const practiceReady = mode === 'local' ? status.localPractice : ready;
  const totalWords = collections.reduce((total, collection) => total + collection.items.length, 0);
  const reviews = useMemo(() => {
    const result: Record<string, OralReviewState> = {};
    if (!cloudHistoryComplete) return result;
    [...cloudHistory]
      .sort(
        (a, b) =>
          Date.parse(a.turns.at(-1)?.createdAt ?? a.createdAt) -
          Date.parse(b.turns.at(-1)?.createdAt ?? b.createdAt),
      )
      .forEach((entry) => {
        if (entry.mode === 'local') return;
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
  }, [cloudHistory, cloudHistoryComplete]);

  useEffect(() => {
    try {
      const saved = readLibrary();
      setLibrary(saved);
      if (saved.collections[0]) {
        setCollectionId(saved.collections[0].id);
        setSelectedIds(saved.collections[0].items.slice(0, 3).map((item) => item.id));
      }
      const active = sessionStorage.getItem(localActiveKey);
      if (active) {
        const parsed = sessionSchema.safeParse(JSON.parse(active));
        if (parsed.success && parsed.data.mode === 'local' && parsed.data.status === 'active') {
          setSession(parsed.data);
          setMode('local');
          setView('session');
        } else sessionStorage.removeItem(localActiveKey);
      }
    } catch (failure) {
      setStorageHealthy(false);
      setError(messageOf(failure));
    }
    setLoaded(true);
    let mounted = true;
    request<ProviderStatus>('/api/status')
      .then((value) => {
        if (!mounted) return;
        setStatus(value);
        if (value.authenticated && value.userId) {
          try {
            const raw = sessionStorage.getItem(activeKey(value.userId));
            if (raw) {
              const parsed = sessionSchema.safeParse(JSON.parse(raw));
              if (
                parsed.success &&
                parsed.data.status === 'active' &&
                parsed.data.mode !== 'local'
              ) {
                setSession(parsed.data);
                setMode('live');
                setView('practice');
                sessionStorage.removeItem(localActiveKey);
              }
            }
          } catch {
            /* Account fetch remains authoritative. */
          }
          void refreshCloud();
        }
      })
      .catch(() =>
        setError(
          'Impossible de vérifier les services. Votre bibliothèque locale reste accessible.',
        ),
      )
      .finally(() => setStatusLoading(false));
    return () => {
      mounted = false;
      accountGeneration.current++;
    };
  }, []);
  async function refreshCloud() {
    const generation = ++accountGeneration.current;
    setCloudLoading(true);
    setCloudHistoryComplete(false);
    try {
      const [collectionResult, firstPage] = await Promise.all([
        request<{ collections: CloudCollection[] }>('/api/collections'),
        request<{ sessions: SpeakingSession[]; nextCursor?: string | null }>('/api/sessions'),
      ]);
      if (accountGeneration.current !== generation) return;
      setCloudCollections(collectionResult.collections);
      const sessions = new Map(firstPage.sessions.map((entry) => [entry.id, entry]));
      const cursors = new Set<string>();
      let cursor = firstPage.nextCursor;
      // Bound malformed/repeated cursors and long histories; partial data cannot drive review dates.
      while (cursor && sessions.size < 1000 && cursors.size < 20) {
        if (cursors.has(cursor))
          throw new Error(
            'La pagination des conversations est incohérente. Actualisez votre compte.',
          );
        cursors.add(cursor);
        const page = await request<{ sessions: SpeakingSession[]; nextCursor?: string | null }>(
          `/api/sessions?before=${encodeURIComponent(cursor)}`,
        );
        if (accountGeneration.current !== generation) return;
        page.sessions.forEach((entry) => sessions.set(entry.id, entry));
        cursor = page.nextCursor;
      }
      setCloudHistory([...sessions.values()]);
      setCloudHistoryComplete(!cursor);
      if (cursor)
        setNotice(
          'Les 1 000 conversations les plus récentes sont affichées. Le calendrier oral est suspendu car cet historique est incomplet. Vous pouvez télécharger votre historique complet dans les réglages.',
        );
    } catch (failure) {
      if (accountGeneration.current === generation) setError(messageOf(failure));
    } finally {
      if (accountGeneration.current === generation) setCloudLoading(false);
    }
  }
  function persist(next: LocalLibrary) {
    writeLibrary(next);
    setLibrary(next);
  }
  function chooseCollection(id: string) {
    const collection = collections.find((candidate) => candidate.id === id);
    setCollectionId(id);
    setSelectedIds(collection?.items.slice(0, 3).map((item) => item.id) ?? []);
  }
  function changeScope(next: 'device' | 'account') {
    setScope(next);
    const list = next === 'device' ? library.collections : cloudCollections;
    setCollectionId(list[0]?.id ?? '');
    setSelectedIds(list[0]?.items.slice(0, 3).map((item) => item.id) ?? []);
    setError('');
    if (next === 'account') void refreshCloud();
  }
  async function saveCollection(title: string, items: VocabularyItem[], editExisting = false) {
    const validated = canonicalItems(items);
    setError('');
    if (scope === 'device') {
      const next =
        editExisting && currentCollection
          ? updateCollection(library, currentCollection.id, title, validated)
          : addCollection(library, title, validated);
      persist(next);
      const chosen = editExisting
        ? next.collections.find((entry) => entry.id === currentCollection?.id)!
        : next.collections.at(-1)!;
      setCollectionId(chosen.id);
      setSelectedIds(chosen.items.slice(0, 3).map((item) => item.id));
    } else {
      const current = editExisting
        ? cloudCollections.find((entry) => entry.id === currentCollection?.id)
        : undefined;
      const creationKey = JSON.stringify({ title, items: validated });
      if (!current && collectionCreation.current?.key !== creationKey)
        collectionCreation.current = { key: creationKey, id: crypto.randomUUID() };
      const saved = await request<CloudCollection>(
        current ? `/api/collections/${current.id}` : '/api/collections',
        {
          method: current ? 'PATCH' : 'POST',
          body: JSON.stringify(
            current
              ? { revision: current.revision, title, items: validated }
              : { id: collectionCreation.current!.id, title, items: validated },
          ),
        },
      );
      collectionCreation.current = null;
      setCloudCollections((previous) =>
        current
          ? previous.map((entry) => (entry.id === saved.id ? saved : entry))
          : [...previous.filter((entry) => entry.id !== saved.id), saved],
      );
      setCollectionId(saved.id);
      setSelectedIds(saved.items.slice(0, 3).map((item) => item.id));
    }
    setNotice(
      `${validated.length} expressions enregistrées. Les anciennes conversations restent inchangées.`,
    );
  }
  async function confirmImport(title: string, items: VocabularyItem[]) {
    setBusy(true);
    try {
      await saveCollection(title, items);
      setImportMode(null);
      setView('practice');
    } finally {
      setBusy(false);
    }
  }
  async function removeCollection() {
    if (
      !currentCollection ||
      !window.confirm(
        `Supprimer « ${currentCollection.title} » ${scope === 'device' ? 'de ce navigateur' : 'de votre compte'} ? Les conversations sont conservées séparément.`,
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      if (scope === 'device') {
        const next = {
          ...library,
          collections: library.collections.filter((entry) => entry.id !== currentCollection.id),
        };
        persist(next);
        setCollectionId(next.collections[0]?.id ?? '');
        setSelectedIds(next.collections[0]?.items.slice(0, 3).map((item) => item.id) ?? []);
      } else {
        const current = cloudCollections.find((entry) => entry.id === currentCollection.id)!;
        await deleteJson(`/api/collections/${current.id}`, { revision: current.revision });
        const next = cloudCollections.filter((entry) => entry.id !== current.id);
        setCloudCollections(next);
        setCollectionId(next[0]?.id ?? '');
        setSelectedIds(next[0]?.items.slice(0, 3).map((item) => item.id) ?? []);
      }
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }
  async function publishCollection() {
    if (!currentCollection || !status.authenticated) return;
    setBusy(true);
    setError('');
    try {
      const saved = await request<CloudCollection>('/api/collections', {
        method: 'POST',
        body: JSON.stringify({
          id: currentCollection.id,
          title: currentCollection.title,
          items: currentCollection.items,
        }),
      });
      setCloudCollections((previous) => [
        ...previous.filter((entry) => entry.id !== saved.id),
        saved,
      ]);
      setNotice(
        'Cette collection est copiée dans votre compte. Les deux bibliothèques restent distinctes ; aucune modification ne sera écrasée automatiquement.',
      );
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }
  function changeSession(next: SpeakingSession) {
    setSession(next);
    try {
      const key = next.mode === 'local' ? localActiveKey : activeKey(status.userId);
      if (next.mode !== 'local') sessionStorage.removeItem(localActiveKey);
      else if (status.userId) sessionStorage.removeItem(activeKey(status.userId));
      if (next.status === 'active') sessionStorage.setItem(key, JSON.stringify(next));
      else sessionStorage.removeItem(key);
    } catch {
      setNotice('La reprise automatique ne peut pas être conservée dans ce navigateur.');
    }
  }
  async function startSession() {
    if (!practiceReady || selectedItems.length !== 3 || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const setup: SessionSetup = {
        scenario,
        goal,
        level,
        relationship,
        targets: selectedItems,
        targetLanguage: 'ko',
        explanationLanguage: 'fr',
      };
      const key = JSON.stringify({ setup, mode });
      if (!startOperation.current || startOperation.current.key !== key)
        startOperation.current = { key, id: crypto.randomUUID() };
      const next = await startPractice(setup, mode, startOperation.current.id);
      startOperation.current = null;
      changeSession(next);
      setView('session');
    } catch (failure) {
      if (failure instanceof ApiClientError && failure.retry === 'new-operation')
        startOperation.current = null;
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
      const current = await getPracticeSession(session.id, session.mode ?? 'live');
      changeSession(current);
      if (current.status === 'completed') completeSession(current);
      else setView('session');
    } catch (failure) {
      if (failure instanceof ApiClientError && failure.status === 404) {
        setSession(null);
        try {
          sessionStorage.removeItem(
            session.mode === 'local' ? localActiveKey : activeKey(status.userId),
          );
        } catch {}
      }
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }
  function updateSavedSession(next: SpeakingSession) {
    if (next.mode === 'local') {
      persist(saveCompletedSession(library, next));
    } else
      setCloudHistory((previous) => [next, ...previous.filter((entry) => entry.id !== next.id)]);
    setDisplaySession(next);
  }
  function completeSession(completed: SpeakingSession) {
    try {
      updateSavedSession(completed);
    } catch {
      setError('Le bilan est disponible, mais sa copie locale n’a pas pu être conservée.');
    }
    setDisplaySession(completed);
    setScope(completed.mode === 'local' ? 'device' : 'account');
    setSession(null);
    try {
      sessionStorage.removeItem(
        completed.mode === 'local' ? localActiveKey : activeKey(status.userId),
      );
    } catch {
      /* Render the result even without storage. */
    }
    setView('feedback');
  }
  async function deleteHistory(entry: SpeakingSession) {
    if (
      !window.confirm(
        `Supprimer cette conversation ${entry.mode === 'local' ? 'locale' : 'de votre compte'} et son bilan ? Cette action est définitive.`,
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      await deletePracticeSession(entry);
      if (session?.id === entry.id) {
        setSession(null);
        try {
          sessionStorage.removeItem(
            entry.mode === 'local' ? localActiveKey : activeKey(status.userId),
          );
        } catch {}
      }
      if (entry.mode === 'local')
        persist({
          ...library,
          history: library.history.filter((previous) => previous.id !== entry.id),
        });
      else setCloudHistory((previous) => previous.filter((item) => item.id !== entry.id));
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }
  async function openHistory(entry: SpeakingSession) {
    setBusy(true);
    setError('');
    try {
      const current = await getPracticeSession(entry.id, entry.mode ?? 'live');
      if (current.status === 'active' && !current.amendments?.length) {
        changeSession(current);
        setView('session');
      } else {
        setDisplaySession(current);
        setView('feedback');
      }
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }
  const scopeControls = (
    <div className="library-scope" role="group" aria-label="Emplacement de la bibliothèque">
      <button
        className={scope === 'device' ? 'active' : ''}
        aria-pressed={scope === 'device'}
        onClick={() => changeScope('device')}
      >
        <DeviceMobile size={16} />
        Sur cet appareil
      </button>
      <button
        className={scope === 'account' ? 'active' : ''}
        aria-pressed={scope === 'account'}
        disabled={!status.authenticated}
        onClick={() => changeScope('account')}
      >
        <Cloud size={16} />
        Mon compte
      </button>
      {cloudLoading && <span role="status">Chargement…</span>}
    </div>
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Aller au contenu
      </a>
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
            Mes conversations{history.length > 0 && <span>{history.length}</span>}
          </button>
        </nav>
        <a className="settings-link" href="/settings">
          <span className={`status-dot ${ready ? '' : 'is-muted'}`} />
          {statusLoading ? 'Connexion…' : status.authenticated ? 'Mon compte' : 'Configuration'}
          <GearSix size={19} />
        </a>
      </header>
      <main className="main-content" id="main-content" tabIndex={-1}>
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
                sessionStorage.removeItem(
                  session.mode === 'local' ? localActiveKey : activeKey(status.userId),
                );
              } catch {}
              setView('practice');
              setNotice('La conversation a été supprimée. Vos expressions sont conservées.');
            }}
          />
        ) : view === 'feedback' && displaySession ? (
          <FeedbackPanel
            session={displaySession}
            reviews={reviews}
            onChange={updateSavedSession}
            onBack={() => setView('practice')}
            onPractice={() => {
              setView('practice');
              setNotice(
                'Choisissez un autre contexte. Une répétition immédiate ne prouve pas une maîtrise durable.',
              );
            }}
          />
        ) : view === 'history' ? (
          <>
            <section className="page-heading">
              <span className="eyebrow">Vos conversations</span>
              <h1>
                Chaque conversation
                <br />
                laisse une petite trace.
              </h1>
              <p>Vos phrases, les indices utilisés et ce que vous pourrez réessayer.</p>
              {scopeControls}
              <p className="history-privacy-note">
                {scope === 'device'
                  ? 'Les entraînements locaux sont conservés dans ce navigateur et restent visibles sur ce profil. Ils ne produisent pas d’évaluation IA.'
                  : 'Vos conversations connectées sont chargées depuis votre compte, sans copie persistante dans la bibliothèque anonyme.'}{' '}
                Les réponses écrites et les transcriptions corrigées ne modifient pas le calendrier
                oral.
              </p>
            </section>
            {!history.length ? (
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
                {history.map((entry) => (
                  <article className="history-card" key={entry.id}>
                    <span className="history-icon">
                      <ChatCircleDots size={24} />
                    </span>
                    <div>
                      <span className="eyebrow">
                        {entry.mode === 'local'
                          ? 'Entraînement local · sans IA'
                          : 'Conversation connectée'}{' '}
                        ·{' '}
                        {new Date(entry.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </span>
                      <h2>{entry.setup.goal}</h2>
                      <p>{entry.setup.targets.map((target) => target.expression).join(' · ')}</p>
                    </div>
                    <button
                      className="button button-secondary"
                      disabled={busy}
                      onClick={() => void openHistory(entry)}
                    >
                      {entry.feedback
                        ? 'Voir le bilan'
                        : entry.amendments?.length
                          ? 'Bilan à recalculer'
                          : 'Reprendre'}
                      <ArrowRight size={16} />
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
                  <span className="mini-line" />
                  DU CORÉEN DANS VOTRE QUOTIDIEN
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
                disabled={!storageHealthy || busy}
                onClick={() => setImportMode('new')}
              >
                <Plus size={18} />
                Importer du vocabulaire
              </button>
            </div>
            {scopeControls}
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
                  disabled={busy || (session.mode !== 'local' && !status.authenticated)}
                >
                  Reprendre <ArrowRight size={17} />
                </button>
              </div>
            )}
            <div className="workspace-grid">
              <LibraryPanel
                key={`${scope}:${currentCollection?.id ?? 'empty'}`}
                collections={collections}
                current={currentCollection}
                selectedIds={selectedIds}
                reviews={reviews}
                scope={scope}
                healthy={storageHealthy}
                busy={busy || cloudLoading}
                canPublish={status.authenticated}
                onChoose={chooseCollection}
                onSelect={setSelectedIds}
                onImport={() => setImportMode('new')}
                onSample={() => setImportMode('sample')}
                onEdit={() => setEditor('edit')}
                onNew={() => setEditor('new')}
                onDelete={() => void removeCollection()}
                onRecall={() => setRecall(true)}
                onRestore={() => setRestore(true)}
                onExport={() =>
                  downloadLibrary(
                    scope === 'device'
                      ? library
                      : { version: 1, collections: cloudCollections, history: [] },
                  )
                }
                onPublish={() => void publishCollection()}
              />
              <section className="preparation-panel" aria-label="Préparer une conversation">
                <div className="panel-heading">
                  <span className="step-pill">02</span>
                  <div>
                    <h2>Où allez-vous les utiliser ?</h2>
                    <p>Une petite situation. Un vrai besoin.</p>
                  </div>
                </div>
                <div className="practice-mode" role="group" aria-label="Mode de conversation">
                  <button
                    aria-pressed={mode === 'live'}
                    className={mode === 'live' ? 'active' : ''}
                    onClick={() => setMode('live')}
                  >
                    <strong>Conversation IA</strong>
                    <small>Adaptée à vos réponses</small>
                  </button>
                  <button
                    aria-pressed={mode === 'local'}
                    className={mode === 'local' ? 'active' : ''}
                    disabled={!status.localPractice}
                    onClick={() => setMode('local')}
                  >
                    <strong>Entraînement local</strong>
                    <small>Guidé · sans IA ni connexion</small>
                  </button>
                </div>
                {mode === 'local' && (
                  <div className="local-mode-note">
                    Trois scènes écrites à l’avance pour découvrir le parcours. Les réponses ne sont
                    pas évaluées et le suivi oral reste inchangé.
                  </div>
                )}
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
                      <option.icon size={22} />
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
                    !practiceReady ||
                    selectedItems.length !== 3 ||
                    goal.trim().length < 3 ||
                    busy ||
                    !!session
                  }
                  onClick={() => void startSession()}
                >
                  {busy
                    ? 'Préparation de votre situation…'
                    : mode === 'local'
                      ? 'Commencer l’entraînement local'
                      : 'Entrer dans la conversation'}
                  <ArrowRight size={19} />
                </button>
                {mode === 'live' && !ready && (
                  <p className="configuration-hint">
                    {statusLoading ? (
                      'Vérification des services…'
                    ) : (
                      <>
                        Les imports sont prêts.{' '}
                        <a href="/settings">Configurez les services et connectez-vous</a> pour
                        parler avec l’IA.
                        {status.localPractice && ' Vous pouvez aussi choisir l’entraînement local.'}
                      </>
                    )}
                  </p>
                )}
                {practiceReady && selectedItems.length !== 3 && (
                  <p className="configuration-hint">
                    Sélectionnez trois expressions dans votre collection.
                  </p>
                )}
                {session && (
                  <p className="configuration-hint">
                    Reprenez ou supprimez votre conversation en cours avant d’en commencer une
                    autre.
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
          <ArrowDown size={12} />
          Français
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
      {editor && (
        <CollectionEditor
          collection={editor === 'edit' ? currentCollection : undefined}
          onClose={() => setEditor(null)}
          onSave={(title, items) => saveCollection(title, items, editor === 'edit')}
        />
      )}
      {restore && (
        <RestoreDialog
          onClose={() => setRestore(false)}
          onRestore={(backup) => {
            const next = mergeLibraryBackup(library, backup);
            writeLibrary(next);
            try {
              restoreLocalPracticeSessions(backup.history);
            } catch (failure) {
              writeLibrary(library);
              throw failure;
            }
            setLibrary(next);
            setNotice('Archive restaurée. Les données existantes ont été conservées.');
            if (!currentCollection && next.collections[0]) {
              setCollectionId(next.collections[0].id);
              setSelectedIds(next.collections[0].items.slice(0, 3).map((item) => item.id));
            }
          }}
        />
      )}
      {recall && selectedItems.length > 0 && (
        <RecallDialog items={selectedItems} onClose={() => setRecall(false)} />
      )}
    </div>
  );
}
async function deleteJson(path: string, body: unknown) {
  const response = await fetch(path, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error?.message || 'La suppression a échoué.');
  }
}
