'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  DownloadSimple,
  ShieldCheck,
  Trash,
  UploadSimple,
} from '@phosphor-icons/react';
import type { ProviderStatus } from '@/lib/contracts';
import type { UsageSummary } from '@/lib/cloud-contracts';
import { api } from '@/lib/client-api';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { clearLocalPractice, restoreLocalPracticeSessions } from '@/lib/practice-client';
import {
  clearLocalLibrary,
  downloadLibrary,
  downloadRawLocalData,
  mergeLibraryBackup,
  readLibrary,
  writeLibrary,
} from '@/features/app/local-library';
import { RestoreDialog } from '@/features/vocabulary/restore-dialog';
import { messageOf } from '@/features/app/client';
export default function SettingsPage() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [account, setAccount] = useState<{
    id: string;
    email: string | null;
    deletionPending?: boolean;
  } | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [restore, setRestore] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [clearText, setClearText] = useState('');
  useEffect(() => {
    let alive = true;
    if (new URL(window.location.href).searchParams.get('auth') === 'error')
      setError('Ce lien de connexion est invalide ou expiré. Demandez-en un nouveau.');
    api<ProviderStatus>('/api/status')
      .then(async (value) => {
        if (!alive) return;
        setStatus(value);
        if (value.authenticated) {
          const [a, u] = await Promise.allSettled([
            api<{ id: string; email: string | null; deletionPending?: boolean }>('/api/account'),
            api<UsageSummary>('/api/usage'),
          ]);
          if (alive) {
            if (a.status === 'fulfilled') setAccount(a.value);
            if (u.status === 'fulfilled') setUsage(u.value);
            const failure =
              a.status === 'rejected' ? a.reason : u.status === 'rejected' ? u.reason : null;
            if (failure) setError(messageOf(failure));
          }
        }
      })
      .catch((failure) => {
        if (alive) setError(messageOf(failure));
      });
    return () => {
      alive = false;
    };
  }, []);
  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { error } = await createBrowserSupabase().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error)
        throw new Error('L’envoi du lien a échoué. Vérifiez la configuration Auth et réessayez.');
      setMessage(
        'Si cette adresse est autorisée, vous recevrez un lien de connexion. Ouvrez-le dans ce navigateur.',
      );
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }
  function clearAccountCache() {
    try {
      if (status?.userId) sessionStorage.removeItem(`language-speaking-active-${status.userId}`);
    } catch {
      /* Authentication has already been revoked; memory is cleared below. */
    }
    setAccount(null);
    setUsage(null);
    setStatus((value) => (value ? { ...value, authenticated: false, userId: undefined } : value));
  }
  async function signOut() {
    setBusy(true);
    setError('');
    try {
      const { error } = await createBrowserSupabase().auth.signOut();
      if (error) throw new Error('La déconnexion a échoué.');
      clearAccountCache();
      setMessage(
        'Vous êtes déconnecté. Vos collections et entraînements locaux restent sur cet appareil.',
      );
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }
  async function exportAccount() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/account/export');
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error?.message || 'L’export du compte a échoué.');
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'language-speaking-account.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        'L’archive privée du compte a été téléchargée. Elle ne contient pas la bibliothèque locale.',
      );
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }
  async function deleteAccount() {
    if (deleteText !== 'SUPPRIMER' || busy) return;
    setBusy(true);
    setError('');
    try {
      await api('/api/account', {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });
      clearAccountCache();
      try {
        await createBrowserSupabase().auth.signOut();
      } catch {
        /* The deleted account is no longer authorized by the server. */
      }
      setDeleteText('');
      setMessage(
        'Le compte et son contenu privé ont été supprimés. Les données locales sont gérées séparément ci-dessous.',
      );
    } catch (failure) {
      setError(messageOf(failure));
      try {
        setAccount(await api('/api/account'));
      } catch {
        /* Keep the failed operation visible for a deliberate retry. */
      }
    } finally {
      setBusy(false);
    }
  }
  function exportLocal() {
    setError('');
    try {
      downloadLibrary(readLibrary());
      setMessage('Votre archive locale est téléchargée. Conservez-la dans un emplacement privé.');
    } catch {
      try {
        downloadRawLocalData();
        setMessage(
          'Les données brutes ont été exportées pour récupération, car la bibliothèque est illisible.',
        );
      } catch (failure) {
        setError(messageOf(failure));
      }
    }
  }
  function clearDevice() {
    if (clearText !== 'EFFACER') return;
    setError('');
    try {
      clearLocalPractice();
      clearLocalLibrary();
      setClearText('');
      setMessage(
        'Les collections et entraînements locaux de cet appareil ont été effacés. Le compte distant n’est pas modifié.',
      );
    } catch (failure) {
      setError(messageOf(failure));
    }
  }
  const checks = status
    ? ([
        ['Supabase', status.storage],
        ['Meta Model API', status.meta],
        ['Azure Speech', status.speech],
        ['Appels IA activés', status.aiEnabled],
      ] as const)
    : [];
  return (
    <main className="settings-shell">
      <Link href="/" className="text-link">
        <ArrowLeft size={17} />
        Retour à mon vocabulaire
      </Link>
      <div className="settings-heading">
        <p className="eyebrow">MON ESPACE</p>
        <h1>Votre espace, vos données.</h1>
        <p>
          La bibliothèque et l’entraînement guidé fonctionnent sur cet appareil. Les conversations
          IA et la sauvegarde entre appareils utilisent votre compte.
        </p>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success-message" role="status">
          <CheckCircle size={18} />
          {message}
        </p>
      )}
      <section className="settings-card" aria-labelledby="account-heading">
        <div className="settings-card-heading">
          <ShieldCheck size={24} />
          <div>
            <span className="eyebrow">Espace privé</span>
            <h2 id="account-heading">Mon compte</h2>
          </div>
        </div>
        {status?.authenticated ? (
          <>
            <p>
              Connecté{account?.email ? ` avec ${account.email}` : ''}. Les collections du compte
              sont distinctes des collections de cet appareil.
            </p>
            {account?.deletionPending && (
              <div className="notice">
                Une suppression est en cours. Vos données ne peuvent plus être modifiées. Relancez
                la suppression ci-dessous pour terminer le nettoyage.
              </div>
            )}
            <div className="settings-actions">
              <button
                className="button button-secondary"
                disabled={busy}
                onClick={() => void exportAccount()}
              >
                <DownloadSimple size={17} />
                Exporter mon compte
              </button>
              <button
                className="button button-secondary"
                disabled={busy}
                onClick={() => void signOut()}
              >
                Se déconnecter
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={signIn}>
            <label className="field">
              <span>Adresse e-mail</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                disabled={!status?.storage || busy}
                placeholder="vous@exemple.fr"
              />
            </label>
            <button
              className="button button-primary"
              type="submit"
              disabled={!status?.storage || busy}
            >
              {busy ? 'Envoi…' : 'Recevoir un lien de connexion'}
            </button>
            {!status?.storage && (
              <p className="fine-print">
                La connexion sera disponible après configuration de Supabase. Vous pouvez déjà
                utiliser la bibliothèque et l’entraînement local.
              </p>
            )}
          </form>
        )}
      </section>
      <section className="settings-card" aria-labelledby="device-heading">
        <h2 id="device-heading">Sur cet appareil</h2>
        <p>
          Les collections et entraînements locaux sont visibles par toute personne utilisant ce
          profil du navigateur. Exportez une archive avant d’effacer les données du site.
        </p>
        <div className="settings-actions">
          <button className="button button-secondary" onClick={exportLocal}>
            <DownloadSimple size={17} />
            Exporter la bibliothèque locale
          </button>
          <button className="button button-secondary" onClick={() => setRestore(true)}>
            <UploadSimple size={17} />
            Restaurer une archive
          </button>
        </div>
        <details className="danger-details">
          <summary>Effacer les données de cet appareil</summary>
          <p>
            Cette action retire les collections et entraînements locaux. Les données enregistrées
            dans votre compte restent disponibles.
          </p>
          <label className="field">
            <span>Saisissez EFFACER pour confirmer</span>
            <input
              value={clearText}
              onChange={(event) => setClearText(event.target.value)}
              autoComplete="off"
            />
          </label>
          <button
            className="button button-danger"
            disabled={clearText !== 'EFFACER'}
            onClick={clearDevice}
          >
            <Trash size={16} />
            Effacer les données locales
          </button>
        </details>
      </section>
      {usage && (
        <section className="settings-card" aria-labelledby="usage-heading">
          <h2 id="usage-heading">Utilisation des services</h2>
          <p>
            Montants suivis par cette application. Le solde réel des comptes fournisseurs n’est pas
            vérifié ici.
          </p>
          <div className="usage-cards">
            {usage.providers.map((provider) => (
              <article key={provider.provider}>
                <h3>{provider.provider === 'meta' ? 'Meta Model API' : 'Azure Speech'}</h3>
                <dl>
                  <div>
                    <dt>Coût estimé</dt>
                    <dd>{provider.estimatedUsd.toFixed(4)} $</dd>
                  </div>
                  <div>
                    <dt>Réservations conservées</dt>
                    <dd>{provider.heldUsd.toFixed(2)} $</dd>
                  </div>
                  <div>
                    <dt>Opérations</dt>
                    <dd>{provider.operationCount}</dd>
                  </div>
                </dl>
                {provider.unresolvedCount > 0 && (
                  <p className="fine-print">
                    {provider.unresolvedCount} opération(s) à vérifier avant toute nouvelle
                    tentative.
                  </p>
                )}
                {provider.hasUnknownCharges && (
                  <p className="fine-print">
                    Certaines charges restent inconnues ; elles ne sont pas comptées comme
                    gratuites.
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="settings-card" aria-labelledby="services-heading">
        <h2 id="services-heading">Disponibilité des services</h2>
        {!status && <p>Vérification en cours…</p>}
        <ul className="service-checks">
          {checks.map(([name, configured]) => (
            <li key={name}>
              <span>{name}</span>
              <strong className={configured ? 'configured' : ''}>
                {configured ? 'Configuré' : 'À configurer'}
              </strong>
            </li>
          ))}
        </ul>
        <p className="fine-print">
          La présence des clés ne confirme pas l’accès aux modèles ou à la base de données. La
          configuration se fait dans <code>.env.local</code>, jamais dans cette page. Aucun service
          payant n’est activé automatiquement.
        </p>
      </section>
      {status?.authenticated && (
        <section className="settings-card danger-card" aria-labelledby="delete-account-heading">
          <h2 id="delete-account-heading">Supprimer mon compte</h2>
          <p>
            Cette action supprime les collections, conversations et images de votre compte. Les
            données de facturation minimales restent conservées pour réconcilier les dépenses.
            Exportez votre compte avant de continuer.
          </p>
          <label className="field">
            <span>Saisissez SUPPRIMER pour confirmer</span>
            <input
              value={deleteText}
              disabled={busy}
              onChange={(event) => setDeleteText(event.target.value)}
              autoComplete="off"
            />
          </label>
          <button
            className="button button-danger"
            disabled={busy || deleteText !== 'SUPPRIMER'}
            onClick={() => void deleteAccount()}
          >
            <Trash size={17} />
            {busy
              ? 'Suppression…'
              : account?.deletionPending
                ? 'Terminer la suppression du compte'
                : 'Supprimer définitivement mon compte'}
          </button>
        </section>
      )}
      {restore && (
        <RestoreDialog
          onClose={() => setRestore(false)}
          onRestore={(backup) => {
            const current = readLibrary();
            const next = mergeLibraryBackup(current, backup);
            writeLibrary(next);
            try {
              restoreLocalPracticeSessions(backup.history);
            } catch (failure) {
              writeLibrary(current);
              throw failure;
            }
            setMessage('Archive restaurée. Vos données précédentes sont conservées.');
          }}
        />
      )}
    </main>
  );
}
