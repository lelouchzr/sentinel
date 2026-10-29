'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import type { ProviderStatus } from '@/lib/contracts';
import { api } from '@/lib/client-api';
import { createBrowserSupabase } from '@/lib/supabase/browser';

export default function SettingsPage() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (new URL(window.location.href).searchParams.get('auth') === 'error')
      setMessage('Ce lien de connexion est invalide ou expiré. Demandez-en un nouveau.');
    api<ProviderStatus>('/api/status')
      .then(setStatus)
      .catch(() => setMessage('Impossible de vérifier la configuration.'));
  }, []);
  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Connexion indisponible.');
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    try {
      const { error } = await createBrowserSupabase().auth.signOut();
      if (error) throw error;
      sessionStorage.removeItem('language-speaking-active-session');
      setStatus((value) => (value ? { ...value, authenticated: false } : value));
      setMessage('Vous êtes déconnecté. Le vocabulaire local reste dans ce navigateur.');
    } catch {
      setMessage('La déconnexion a échoué. Réessayez.');
    } finally {
      setBusy(false);
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
    <main
      className="settings-shell"
      style={{ maxWidth: 780, margin: '0 auto', padding: '48px 24px' }}
    >
      <Link href="/" className="text-link">
        ← Retour à mon vocabulaire
      </Link>
      <p className="eyebrow" style={{ marginTop: 40 }}>
        MON ESPACE
      </p>
      <h1 style={{ fontSize: 'clamp(2rem,5vw,3rem)', margin: '10px 0' }}>Connexion et services</h1>
      <p style={{ lineHeight: 1.7, marginBottom: 32 }}>
        Les imports fonctionnent dans ce navigateur. Une connexion est nécessaire pour enregistrer
        les conversations et utiliser les services IA.
      </p>
      <section
        aria-labelledby="services-heading"
        style={{ border: '1px solid #dce2dc', borderRadius: 18, padding: 24, marginBottom: 24 }}
      >
        <h2 id="services-heading">Disponibilité</h2>
        {!status && <p>Vérification en cours…</p>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {checks.map(([name, ready]) => (
            <li
              key={name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                padding: '12px 0',
                borderBottom: '1px solid #e7ebe7',
              }}
            >
              <span>{name}</span>
              <strong style={{ color: ready ? '#28654b' : '#6c706a' }}>
                {ready ? 'Configuré' : 'À configurer'}
              </strong>
            </li>
          ))}
        </ul>
        <p style={{ lineHeight: 1.6, fontSize: 14 }}>
          La présence des clés ne confirme pas l’accès aux modèles. Les essais réels et la migration
          de base de données restent nécessaires. Les clés se configurent dans{' '}
          <code>.env.local</code>, jamais dans cette page.
        </p>
      </section>
      <section
        aria-labelledby="account-heading"
        style={{ border: '1px solid #dce2dc', borderRadius: 18, padding: 24 }}
      >
        <h2 id="account-heading">Mon compte</h2>
        {status?.authenticated ? (
          <>
            <p>Vous êtes connecté.</p>
            <button className="button button-secondary" disabled={busy} onClick={signOut}>
              Se déconnecter
            </button>
          </>
        ) : (
          <form onSubmit={signIn}>
            <label htmlFor="email" style={{ display: 'block', margin: '20px 0 8px' }}>
              Adresse e-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              disabled={!status?.storage || busy}
              placeholder="vous@exemple.fr"
              style={{
                display: 'block',
                padding: 12,
                border: '1px solid #b7c3b9',
                borderRadius: 8,
                width: '100%',
                marginBottom: 16,
              }}
            />
            <button
              className="button button-primary"
              type="submit"
              disabled={!status?.storage || busy}
            >
              {busy ? 'Envoi…' : 'Recevoir un lien de connexion'}
            </button>
            {!status?.storage && (
              <p style={{ fontSize: 14, marginTop: 16 }}>
                La connexion sera disponible après configuration de Supabase.
              </p>
            )}
          </form>
        )}
        <p role="status" style={{ marginTop: 16 }}>
          {message}
        </p>
      </section>
    </main>
  );
}
