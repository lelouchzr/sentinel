'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, X } from '@phosphor-icons/react';
import type { VocabularyItem } from '@/lib/contracts';

export function RecallDialog({ items, onClose }: { items: VocabularyItem[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const item = items[index];
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog className="modal recall-modal" ref={dialog} onCancel={onClose}>
      <div className="modal-heading">
        <span className="eyebrow">Un instant pour se rappeler</span>
        <button className="icon-button" aria-label="Fermer le rappel" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <p className="muted">
        {index + 1} / {items.length} · Pensez à l’expression en coréen.
      </p>
      <div className="recall-card">
        <h2>{item.meaning}</h2>
        {revealed ? (
          <>
            <p className="recall-answer" lang="ko">
              {item.expression}
            </p>
            {item.example && <p lang="ko">{item.example}</p>}
          </>
        ) : (
          <button className="button button-secondary" onClick={() => setRevealed(true)}>
            Révéler l’expression
          </button>
        )}
      </div>
      {revealed && (
        <button
          className="button button-primary button-full"
          onClick={() => {
            if (index + 1 === items.length) onClose();
            else {
              setIndex(index + 1);
              setRevealed(false);
            }
          }}
        >
          {index + 1 === items.length ? (
            <>
              Terminer <Check size={18} />
            </>
          ) : (
            <>
              Expression suivante <ArrowRight size={18} />
            </>
          )}
        </button>
      )}
      <p className="fine-print">
        Ce rappel ne mesure pas votre capacité à utiliser ces mots à l’oral.
      </p>
    </dialog>
  );
}
