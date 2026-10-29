'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  ImageSquare,
  UploadSimple,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { vocabularySchema, type VocabularyItem } from '@/lib/contracts';
import { extractPhoto } from '@/lib/photo-import';
import { messageOf } from '@/features/app/client';
import { previewImport } from './parser';

type Source = VocabularyItem['source'];
type Preview = ReturnType<typeof previewImport>;
const sample =
  'expression\tmeaning\n빌리다\temprunter\n빌려주다\tprêter\n돌려주다\trendre\n충전기\tchargeur\n잠깐\tun instant';
const sourceNames: Record<string, string> = {
  csv: 'CSV / TSV',
  anki: 'Anki · export texte',
  quizlet: 'Quizlet · texte de mon set',
  flashcardstudy: 'FlashCardStudy · JSON',
};

export function ImportDialog({
  useSample,
  canExtract,
  onClose,
  onConfirm,
}: {
  useSample?: boolean;
  canExtract: boolean;
  onClose: () => void;
  onConfirm: (title: string, items: VocabularyItem[]) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'text' | 'photo'>('text');
  const [source, setSource] = useState<Source>('csv');
  const [text, setText] = useState(useSample ? sample : '');
  const [title, setTitle] = useState(useSample ? 'Petits services · exemple original' : '');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [rows, setRows] = useState<VocabularyItem[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [hasHeader, setHasHeader] = useState(true);
  const [expressionColumn, setExpressionColumn] = useState(0);
  const [meaningColumn, setMeaningColumn] = useState(1);
  const [exampleColumn, setExampleColumn] = useState(-1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const selectedRows = rows.filter((row) => !excluded.has(row.id));

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  function parse(
    overrides: {
      hasHeader?: boolean;
      expressionColumn?: number;
      meaningColumn?: number;
      exampleColumn?: number;
    } = {},
  ) {
    setError('');
    try {
      const options = {
        source,
        hasHeader,
        expressionColumn,
        meaningColumn,
        exampleColumn: exampleColumn < 0 ? undefined : exampleColumn,
        ...overrides,
      };
      if (options.exampleColumn !== undefined && options.exampleColumn < 0)
        options.exampleColumn = undefined;
      const next = previewImport(text, options);
      if (!next.rows.length && !next.columns.length)
        throw new Error('Aucune expression à importer. Vérifiez le séparateur et les colonnes.');
      setPreview(next);
      setRows(next.rows);
      setExcluded(new Set());
      if (!title.trim())
        setTitle(
          source === 'flashcardstudy' ? 'Mon import FlashCardStudy' : 'Mon vocabulaire coréen',
        );
    } catch (failure) {
      setRows([]);
      setError(messageOf(failure));
    }
  }

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    if (/\.(apkg|colpkg)$/i.test(file.name)) {
      setError(
        'Exportez vos notes Anki au format texte. Les paquets .apkg et .colpkg ne sont pas pris en charge.',
      );
      return;
    }
    if (file.size > 1024 * 1024) {
      setError('Le fichier doit faire moins de 1 Mo.');
      return;
    }
    try {
      const content = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      setText(content);
      setTitle(file.name.replace(/\.[^.]+$/, '').slice(0, 100));
      if (/\.json$/i.test(file.name)) setSource('flashcardstudy');
      setPreview(null);
    } catch {
      setError('Impossible de lire ce fichier. Utilisez un export texte encodé en UTF-8.');
    }
  }

  async function extract() {
    if (!image) return;
    setBusy(true);
    setError('');
    try {
      const result = await extractPhoto(image);
      if (!result.rows.length)
        throw new Error('Aucun vocabulaire lisible n’a été trouvé. Essayez une photo plus nette.');
      setSource('photo');
      setRows(result.rows);
      setPreview({ ...result, columns: [], rawRows: [] });
      setExcluded(new Set());
      if (!title.trim()) setTitle('Vocabulaire de mon livre');
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }

  function edit(id: string, field: 'expression' | 'meaning' | 'example', value: string) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? { ...row, [field]: value, provenance: { ...row.provenance, [field]: 'edited' } }
          : row,
      ),
    );
  }

  function confirm() {
    setError('');
    if (!title.trim()) {
      setError('Donnez un nom à cette collection.');
      return;
    }
    const invalid = selectedRows.findIndex((row) => !vocabularySchema.safeParse(row).success);
    if (invalid !== -1) {
      setError(
        `Vérifiez l’expression et le sens de la ligne ${invalid + 1}. Les deux champs sont obligatoires.`,
      );
      return;
    }
    try {
      onConfirm(title.trim(), selectedRows);
    } catch (failure) {
      setError(messageOf(failure));
    }
  }

  return (
    <dialog
      className="modal import-modal"
      ref={dialog}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">Votre vocabulaire, votre point de départ</span>
          <h2>{preview ? 'Vérifiez vos expressions.' : 'Qu’allez-vous mettre en pratique ?'}</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Fermer l’import"
          disabled={busy}
          onClick={onClose}
        >
          <X size={22} />
        </button>
      </div>
      {!preview ? (
        <>
          <div className="segmented-control" aria-label="Type d’import">
            <button
              aria-pressed={tab === 'text'}
              className={tab === 'text' ? 'active' : ''}
              disabled={busy}
              onClick={() => {
                setTab('text');
                if (source === 'photo') setSource('csv');
                setError('');
              }}
            >
              <FileText size={18} /> Fichier ou texte
            </button>
            <button
              aria-pressed={tab === 'photo'}
              className={tab === 'photo' ? 'active' : ''}
              disabled={busy}
              onClick={() => {
                setTab('photo');
                setError('');
              }}
            >
              <ImageSquare size={18} /> Page de livre
            </button>
          </div>
          {tab === 'text' ? (
            <>
              <div className="field-row">
                <label className="field">
                  <span>Source du vocabulaire</span>
                  <select
                    value={source}
                    onChange={(event) => setSource(event.target.value as Source)}
                  >
                    {Object.entries(sourceNames).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="field file-field">
                  <span>Déjà un fichier ?</span>
                  <button
                    className="button button-secondary"
                    onClick={() => fileInput.current?.click()}
                  >
                    <UploadSimple size={18} /> Choisir un fichier
                  </button>
                  <input
                    ref={fileInput}
                    className="visually-hidden"
                    type="file"
                    accept=".csv,.tsv,.txt,.json"
                    onChange={loadFile}
                    aria-label="Fichier de vocabulaire"
                  />
                </div>
              </div>
              <label className="field">
                <span>Collez votre export</span>
                <textarea
                  className="import-text"
                  rows={7}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={'expression\tmeaning\n빌리다\temprunter\n돌려주다\trendre'}
                  spellCheck={false}
                  maxLength={1048576}
                />
              </label>
              <div className="import-notes">
                <span>CSV, TSV ou JSON · 1 Mo · 500 lignes maximum</span>
                <button
                  className="text-button"
                  onClick={() => {
                    setText(sample);
                    setTitle('Petits services · exemple original');
                    setSource('csv');
                    setHasHeader(true);
                  }}
                >
                  Essayer l’exemple original
                </button>
              </div>
              {source !== 'flashcardstudy' && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={hasHeader}
                    onChange={(event) => setHasHeader(event.target.checked)}
                  />{' '}
                  La première ligne contient les noms des colonnes
                </label>
              )}
              <p className="fine-print">
                Anki : « Notes en texte brut ». Quizlet : export texte de votre propre set. Il
                s’agit d’un import, sans synchronisation avec l’application d’origine.
              </p>
            </>
          ) : (
            <div className="photo-import">
              <div className="photo-instruction">
                <ImageSquare size={38} weight="light" />
                <h3>Une page. De nouvelles conversations.</h3>
                <p>
                  Prenez une photo nette d’une page de vocabulaire imprimé. Vous pourrez corriger
                  chaque mot avant de l’ajouter.
                </p>
              </div>
              <label className="field">
                <span>Photo de vocabulaire</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={!canExtract || busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setError('');
                    if (file && file.size > 5 * 1024 * 1024) {
                      setError('La photo doit faire moins de 5 Mo.');
                      setImage(null);
                    } else setImage(file ?? null);
                  }}
                />
              </label>
              <p className="fine-print">
                JPG, PNG ou WebP · 5 Mo maximum · une seule page. Les images sont traitées pour cet
                import, sans entraînement de modèle.
              </p>
              {!canExtract && (
                <div className="notice">
                  <WarningCircle size={20} />
                  <span>
                    La lecture de photos nécessite une connexion, un stockage privé et l’IA activée.{' '}
                    <a href="/settings">Voir la configuration</a>.
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="preview-top">
            <label className="field">
              <span>Nom de la collection</span>
              <input
                value={title}
                maxLength={100}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <div className="language-pair">
              <span>
                Coréen <b lang="ko">한국어</b>
              </span>
              <ArrowRight size={18} />
              <span>
                Explications <b>Français</b>
              </span>
            </div>
          </div>
          {source !== 'photo' && preview.columns.length > 1 && (
            <fieldset className="mapping-fields">
              <legend>Associer les colonnes</legend>
              <label className="field">
                <span>Expression en coréen</span>
                <select
                  value={expressionColumn}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setExpressionColumn(value);
                    parse({ expressionColumn: value });
                  }}
                >
                  {preview.columns.map((column, index) => (
                    <option value={index} key={index}>
                      {column || `Colonne ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Sens en français</span>
                <select
                  value={meaningColumn}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setMeaningColumn(value);
                    parse({ meaningColumn: value });
                  }}
                >
                  {preview.columns.map((column, index) => (
                    <option value={index} key={index}>
                      {column || `Colonne ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Exemple facultatif</span>
                <select
                  value={exampleColumn}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setExampleColumn(value);
                    parse({ exampleColumn: value });
                  }}
                >
                  <option value={-1}>Aucun</option>
                  {preview.columns.map((column, index) => (
                    <option value={index} key={index}>
                      {column || `Colonne ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
          )}
          {preview.warnings.length > 0 && (
            <div className="notice">
              <WarningCircle size={20} />
              <div>
                {preview.warnings.slice(0, 5).map((warning, index) => (
                  <p key={index}>{warning}</p>
                ))}
              </div>
            </div>
          )}
          <p className="preview-count">
            {selectedRows.length} expression{selectedRows.length > 1 ? 's' : ''} sélectionnée
            {selectedRows.length > 1 ? 's' : ''}{' '}
            <span>· Modifiez les cellules pour corriger l’import.</span>
          </p>
          <div className="preview-table-wrap">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>
                    <span className="visually-hidden">Inclure</span>
                  </th>
                  <th>Expression</th>
                  <th>Sens</th>
                  <th>Exemple et origine</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className={excluded.has(row.id) ? 'excluded' : ''}>
                    <td>
                      <input
                        aria-label={`Inclure la ligne ${index + 1}`}
                        type="checkbox"
                        checked={!excluded.has(row.id)}
                        onChange={() =>
                          setExcluded((previous) => {
                            const next = new Set(previous);
                            if (next.has(row.id)) next.delete(row.id);
                            else next.add(row.id);
                            return next;
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        lang="ko"
                        aria-label={`Expression ${index + 1}`}
                        value={row.expression}
                        maxLength={300}
                        onChange={(event) => edit(row.id, 'expression', event.target.value)}
                      />
                      <small>{provenanceLabel(row.provenance.expression)}</small>
                    </td>
                    <td>
                      <input
                        aria-label={`Sens ${index + 1}`}
                        value={row.meaning}
                        maxLength={600}
                        onChange={(event) => edit(row.id, 'meaning', event.target.value)}
                      />
                      <small>{provenanceLabel(row.provenance.meaning)}</small>
                    </td>
                    <td>
                      <input
                        aria-label={`Exemple ${index + 1}`}
                        value={row.example}
                        maxLength={600}
                        placeholder="Facultatif"
                        onChange={(event) => edit(row.id, 'example', event.target.value)}
                      />
                      <small>
                        {row.example ? provenanceLabel(row.provenance.example) : 'Aucun exemple'}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fine-print">
            Les paires identiques sont regroupées. Vos données de révision dans les autres
            applications restent indépendantes.
          </p>
        </>
      )}
      {error && (
        <p className="error-message" role="alert">
          <WarningCircle size={18} />
          {error}
        </p>
      )}
      <div className="modal-footer">
        {preview ? (
          <>
            <button
              className="button button-ghost"
              onClick={() => {
                setPreview(null);
                setError('');
              }}
            >
              <ArrowLeft size={17} /> Revenir
            </button>
            <button
              className="button button-primary"
              disabled={!selectedRows.length}
              onClick={confirm}
            >
              <Check size={18} /> Confirmer {selectedRows.length} expression
              {selectedRows.length > 1 ? 's' : ''}
            </button>
          </>
        ) : (
          <>
            <span className="fine-print">Vous gardez le dernier mot.</span>
            <button
              className="button button-primary"
              disabled={busy || (tab === 'text' ? !text.trim() : !image || !canExtract)}
              onClick={() => (tab === 'text' ? parse() : void extract())}
            >
              {busy ? 'Lecture de la page…' : 'Vérifier le vocabulaire'}
              <ArrowRight size={18} />
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}

function provenanceLabel(provenance: VocabularyItem['provenance']['expression']) {
  return {
    imported: 'Importé',
    extracted: 'Lu sur la page',
    generated: 'Proposé par l’IA',
    edited: 'Modifié par vous',
  }[provenance];
}
