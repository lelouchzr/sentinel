'use client';
import { useState } from 'react';
import {
  BookOpen,
  Check,
  Clock,
  CloudArrowUp,
  DownloadSimple,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Repeat,
  Trash,
  UploadSimple,
} from '@phosphor-icons/react';
import type { Collection } from '@/features/app/local-library';
import type { OralReviewState } from '@/lib/review';
export function LibraryPanel({
  collections,
  current,
  selectedIds,
  reviews,
  scope,
  healthy,
  busy,
  canPublish,
  onChoose,
  onSelect,
  onImport,
  onSample,
  onEdit,
  onNew,
  onDelete,
  onRecall,
  onRestore,
  onExport,
  onPublish,
}: {
  collections: Collection[];
  current?: Collection;
  selectedIds: string[];
  reviews: Record<string, OralReviewState>;
  scope: 'device' | 'account';
  healthy: boolean;
  busy: boolean;
  canPublish: boolean;
  onChoose: (id: string) => void;
  onSelect: (ids: string[]) => void;
  onImport: () => void;
  onSample: () => void;
  onEdit: () => void;
  onNew: () => void;
  onDelete: () => void;
  onRecall: () => void;
  onRestore: () => void;
  onExport: () => void;
  onPublish: () => void;
}) {
  const [query, setQuery] = useState('');
  const [onlyDue, setOnlyDue] = useState(false);
  const isDue = (id: string) => reviews[id] && Date.parse(reviews[id].dueAt) <= Date.now();
  const visible =
    current?.items.filter(
      (item) =>
        (!onlyDue || isDue(item.id)) &&
        `${item.expression} ${item.meaning} ${item.example}`
          .normalize('NFC')
          .toLocaleLowerCase()
          .includes(query.normalize('NFC').trim().toLocaleLowerCase()),
    ) ?? [];
  const dueItems = current?.items.filter((item) => isDue(item.id)) ?? [];
  return (
    <section className="vocabulary-panel" aria-label="Bibliothèque de vocabulaire">
      {current ? (
        <>
          <div className="collection-toolbar">
            <label className="collection-selector">
              <span className="visually-hidden">Collection de vocabulaire</span>
              <BookOpen size={20} />
              <select
                value={current.id}
                disabled={busy}
                onChange={(event) => {
                  onChoose(event.target.value);
                  setQuery('');
                  setOnlyDue(false);
                }}
              >
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="icon-button"
              aria-label="Modifier cette collection"
              onClick={onEdit}
              disabled={busy}
            >
              <PencilSimple size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="Supprimer cette collection"
              onClick={onDelete}
              disabled={busy}
            >
              <Trash size={18} />
            </button>
          </div>
          <div className="library-search">
            <label>
              <MagnifyingGlass size={18} />
              <span className="visually-hidden">Rechercher une expression</span>
              <input
                type="search"
                placeholder="Un mot, un sens…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button
              className={`filter-pill ${onlyDue ? 'active' : ''}`}
              aria-pressed={onlyDue}
              onClick={() => setOnlyDue(!onlyDue)}
            >
              À revoir ({dueItems.length})
            </button>
          </div>
          {dueItems.length > 0 && (
            <div className="due-banner">
              <Clock size={16} />
              <span>
                {dueItems.length} expression{dueItems.length > 1 ? 's' : ''} à retrouver.
              </span>
              <button
                className="text-button"
                onClick={() => onSelect(dueItems.slice(0, 3).map((item) => item.id))}
              >
                Les sélectionner
              </button>
            </div>
          )}
          <div className="selection-instruction">
            <span>
              Sélectionnez <strong>3 expressions liées</strong> pour votre conversation.
            </span>
            <span
              className={selectedIds.length === 3 ? 'selection-count complete' : 'selection-count'}
            >
              {selectedIds.length}/3 <Check size={14} />
            </span>
          </div>
          <div className="vocabulary-list">
            {visible.map((item) => {
              const selected = selectedIds.includes(item.id);
              const due = reviews[item.id];
              return (
                <label key={item.id} className={`vocabulary-row ${selected ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={!selected && selectedIds.length >= 3}
                    onChange={() =>
                      onSelect(
                        selected
                          ? selectedIds.filter((id) => id !== item.id)
                          : [...selectedIds, item.id],
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
                        <Clock size={12} />
                        {isDue(item.id)
                          ? 'À reprendre'
                          : `À revoir le ${new Date(due.dueAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                      </small>
                    )}
                  </span>
                </label>
              );
            })}
            {!visible.length && (
              <div className="library-no-results">
                <MagnifyingGlass size={26} />
                <p>
                  {onlyDue
                    ? 'Aucune expression à revoir avec ce filtre.'
                    : 'Aucune expression ne correspond à cette recherche.'}
                </p>
                <button
                  className="text-button"
                  onClick={() => {
                    setQuery('');
                    setOnlyDue(false);
                  }}
                >
                  Afficher toute la collection
                </button>
              </div>
            )}
          </div>
          <div className="library-footer">
            <button className="text-button" onClick={onRecall} disabled={!selectedIds.length}>
              <Repeat size={17} />
              Un petit rappel avant de parler
            </button>
            <span>{current.items.length} expressions</span>
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
          <button className="button button-primary" onClick={onImport} disabled={!healthy || busy}>
            <Plus size={18} />
            Importer mes mots
          </button>
          <button className="text-button" onClick={onSample} disabled={!healthy || busy}>
            Ou essayer 5 expressions d’exemple
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
      <div className="library-management">
        <button className="text-button" onClick={onNew} disabled={!healthy || busy}>
          <Plus size={16} />
          Créer une collection
        </button>
        {scope === 'device' && (
          <button className="text-button" onClick={onRestore} disabled={!healthy || busy}>
            <UploadSimple size={16} />
            Restaurer une archive
          </button>
        )}
        {current && scope === 'device' && canPublish && (
          <button className="text-button" onClick={onPublish} disabled={busy}>
            <CloudArrowUp size={16} />
            Copier vers mon compte
          </button>
        )}
      </div>
      <div className="local-storage-note">
        <span className="status-dot is-muted" />
        <p>
          {scope === 'device' ? (
            <>
              Collections enregistrées dans ce navigateur.{' '}
              <strong>Exportez une archive pour les conserver.</strong>
            </>
          ) : (
            <>
              Collections privées enregistrées dans votre compte.{' '}
              <strong>Les modifications sont confirmées par le serveur.</strong>
            </>
          )}
        </p>
        {collections.length > 0 && (
          <button
            className="icon-button"
            title="Télécharger une archive"
            aria-label="Télécharger une archive des données locales"
            onClick={onExport}
          >
            <DownloadSimple size={16} />
          </button>
        )}
      </div>
    </section>
  );
}
