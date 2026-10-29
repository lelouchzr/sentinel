'use client';
import { useEffect, useRef, useState } from 'react';
import { Plus, Trash, X, Check } from '@phosphor-icons/react';
import { type VocabularyItem } from '@/lib/contracts';
import { canonicalItems, type Collection } from '@/features/app/local-library';
import { messageOf } from '@/features/app/client';

export function CollectionEditor({
  collection,
  onClose,
  onSave,
}: {
  collection?: Pick<Collection, 'title' | 'items'>;
  onClose: () => void;
  onSave: (title: string, items: VocabularyItem[]) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(collection?.title ?? '');
  const [items, setItems] = useState<VocabularyItem[]>(collection?.items ?? [newItem()]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const opener = document.activeElement;
    dialog.current?.showModal();
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);
  function edit(id: string, field: 'expression' | 'meaning' | 'example', value: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, [field]: value, provenance: { ...item.provenance, [field]: 'edited' } }
          : item,
      ),
    );
  }
  async function save() {
    setError('');
    setBusy(true);
    try {
      if (!title.trim()) throw new Error('Donnez un nom à la collection.');
      const validated = canonicalItems(items);
      await onSave(title.trim(), validated);
      onClose();
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="modal collection-editor"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      aria-labelledby="editor-title"
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">Votre collection</span>
          <h2 id="editor-title">
            {collection ? 'Faire évoluer vos mots.' : 'Ajouter vos propres mots.'}
          </h2>
        </div>
        <button
          className="icon-button"
          aria-label="Fermer l’édition"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <label className="field">
        <span>Nom de la collection</span>
        <input
          autoFocus
          value={title}
          maxLength={100}
          disabled={busy}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <p className="fine-print">
        Coréen → Français. Modifier une expression ou son sens crée une nouvelle entrée de révision
        ; vos anciennes conversations conservent leur texte d’origine.
      </p>
      <div className="editor-rows">
        {items.map((item, index) => (
          <div key={item.id} className="editor-row">
            <span className="editor-row-number">{index + 1}</span>
            <label className="field">
              <span>Expression {index + 1}</span>
              <input
                lang="ko"
                value={item.expression}
                maxLength={300}
                disabled={busy}
                onChange={(event) => edit(item.id, 'expression', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Sens {index + 1}</span>
              <input
                value={item.meaning}
                maxLength={600}
                disabled={busy}
                onChange={(event) => edit(item.id, 'meaning', event.target.value)}
              />
            </label>
            <label className="field editor-example">
              <span>Exemple {index + 1} · facultatif</span>
              <input
                lang="ko"
                value={item.example}
                maxLength={600}
                disabled={busy}
                onChange={(event) => edit(item.id, 'example', event.target.value)}
              />
            </label>
            <button
              className="icon-button"
              aria-label={`Retirer l’expression ${index + 1}`}
              disabled={busy || items.length === 1}
              onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))}
            >
              <Trash size={18} />
            </button>
          </div>
        ))}
      </div>
      <button
        className="text-button"
        disabled={busy || items.length >= 500}
        onClick={() => setItems((current) => [...current, newItem()])}
      >
        <Plus size={18} />
        Ajouter une expression
      </button>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <div className="modal-footer">
        <button className="button button-secondary" disabled={busy} onClick={onClose}>
          Annuler
        </button>
        <button className="button button-primary" disabled={busy} onClick={() => void save()}>
          <Check size={18} />
          {busy ? 'Enregistrement…' : 'Enregistrer la collection'}
        </button>
      </div>
    </dialog>
  );
}
function newItem(): VocabularyItem {
  return {
    id: crypto.randomUUID(),
    expression: '',
    meaning: '',
    example: '',
    source: 'manual',
    provenance: { expression: 'edited', meaning: 'edited', example: 'edited' },
  };
}
