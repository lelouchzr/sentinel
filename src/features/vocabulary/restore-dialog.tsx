'use client';
import { useEffect, useRef, useState } from 'react';
import { UploadSimple, X } from '@phosphor-icons/react';
import { parseLibraryBackup, type LocalLibrary } from '@/features/app/local-library';
import { messageOf } from '@/features/app/client';
export function RestoreDialog({
  onClose,
  onRestore,
}: {
  onClose: () => void;
  onRestore: (backup: LocalLibrary) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [backup, setBackup] = useState<LocalLibrary | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const opener = document.activeElement;
    ref.current?.showModal();
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);
  async function read(file?: File) {
    if (!file) return;
    setBusy(true);
    setError('');
    setBackup(null);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('L’archive doit faire moins de 10 Mo.');
      setBackup(
        parseLibraryBackup(
          new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()),
        ),
      );
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="modal restore-dialog"
      onCancel={onClose}
      aria-labelledby="restore-title"
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">Retrouver votre bibliothèque</span>
          <h2 id="restore-title">Restaurer une archive.</h2>
        </div>
        <button className="icon-button" aria-label="Fermer la restauration" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <p>
        Ajoutez vos collections et entraînements locaux à ce navigateur. Vos données actuelles sont
        conservées et les collections identiques sont regroupées.
      </p>
      <label className="field">
        <span>Archive Language Speaking · JSON, 10 Mo maximum</span>
        <input
          type="file"
          accept="application/json,.json"
          disabled={busy}
          onChange={(event) => void read(event.target.files?.[0])}
        />
      </label>
      {backup && (
        <div className="notice">
          <UploadSimple size={22} />
          <span>
            {backup.collections.length} collections et {backup.history.length} entraînements locaux
            à vérifier. Les conversations connectées se retrouvent depuis leur compte et ne sont pas
            restaurées ici.
          </span>
        </div>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <div className="modal-footer">
        <button className="button button-secondary" onClick={onClose}>
          Annuler
        </button>
        <button
          className="button button-primary"
          disabled={!backup || busy}
          onClick={() => {
            if (!backup) return;
            try {
              onRestore(backup);
              onClose();
            } catch (failure) {
              setError(messageOf(failure));
            }
          }}
        >
          Confirmer la restauration
        </button>
      </div>
    </dialog>
  );
}
