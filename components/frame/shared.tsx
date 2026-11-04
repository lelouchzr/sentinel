"use client";

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import {
  Frame,
  ArrowUpRight,
  ArrowRight,
  Eye,
  KeyRound,
  Lightbulb,
  LockKeyhole,
  X,
  LoaderCircle,
  DoorOpen,
} from "lucide-react";
import type { Room, GameState, playerRoom } from "@/lib/game";

export type Viewer = { displayName: string } | null;
export type Card = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  theme: string;
  difficulty: string;
  duration: number;
  author: string;
  builtin?: boolean;
};
export type PublicRoom = ReturnType<typeof playerRoom>;
export type PlayData = {
  id: string;
  token: string;
  state: GameState;
  revision: number;
  room: PublicRoom;
};
export type Props = {
  view: "gallery" | "editor" | "player" | "mine";
  slug?: string;
  draftId?: string;
};
export const icons = {
  inspect: Eye,
  collect: KeyRound,
  code: LockKeyhole,
  unlock: KeyRound,
  exit: DoorOpen,
};
export const actionNames = {
  inspect: "Observer",
  collect: "Récupérer",
  code: "Ouvrir avec un code",
  unlock: "Déverrouiller",
  exit: "Sortir",
};

export function Loading({
  children = "Chargement…",
}: {
  children?: ReactNode;
}) {
  return (
    <div className="loading">
      <LoaderCircle className="spin" size={20} />
      {children}
    </div>
  );
}
export function Notice({
  message,
  onClose,
}: {
  message: string;
  onClose?: () => void;
}) {
  return (
    <div className="notice" role="alert">
      <Lightbulb size={18} />
      <span>{message}</span>
      {onClose && (
        <button
          className="icon-button"
          aria-label="Fermer le message"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
export function SignIn({ what = "créer votre aventure" }: { what?: string }) {
  return (
    <div className="signin-panel">
      <div className="large-icon">
        <Frame size={32} />
      </div>
      <h2>Votre atelier vous attend.</h2>
      <p>
        Connectez-vous pour {what}, enregistrer vos brouillons et publier vos
        jeux.
      </p>
      <a
        className="button primary"
        href="/signin-with-chatgpt?return_to=/atelier"
        target="_top"
      >
        Se connecter avec ChatGPT <ArrowUpRight size={17} />
      </a>
      <a className="text-link" href="/">
        Explorer les aventures <ArrowRight size={15} />
      </a>
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current
      ?.querySelector<HTMLElement>("button,input,select,textarea,a[href]")
      ?.focus();
    return () => {
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Tab") {
            const nodes = ref.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled),input:not(:disabled),select,textarea,a[href]",
            );
            if (!nodes?.length) return;
            const first = nodes[0],
              last = nodes[nodes.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="modal-title">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Fermer" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Hotspots({
  room,
  selected,
  show,
  onSelect,
  drawing = false,
}: {
  room: PublicRoom | Room;
  selected?: string;
  show: boolean;
  onSelect: (id: string) => void;
  drawing?: boolean;
}) {
  return (
    <div
      className={`hotspots ${show ? "show-zones" : ""}`}
      style={drawing ? { pointerEvents: "none" } : undefined}
    >
      {room.objects.map((object, index) => {
        const { x, y, w, h } = object.region;
        const style: CSSProperties = {
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          width: `${w * 100}%`,
          height: `${h * 100}%`,
        };
        return object.mask ? (
          <svg
            key={object.id}
            className={`mask-hotspot ${selected === object.id ? "chosen" : ""}`}
            style={style}
            viewBox={`0 0 ${object.mask.width} ${object.mask.height}`}
            preserveAspectRatio="none"
          >
            <path
              d={object.mask.path}
              role="button"
              tabIndex={drawing ? -1 : 0}
              aria-label={object.name}
              onClick={() => onSelect(object.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(object.id);
                }
              }}
            />
          </svg>
        ) : (
          <button
            key={object.id}
            style={style}
            className={`hotspot ${selected === object.id ? "chosen" : ""}`}
            aria-label={object.name}
            onClick={() => onSelect(object.id)}
            tabIndex={drawing ? -1 : 0}
          >
            <span>{index + 1}</span>
          </button>
        );
      })}
    </div>
  );
}
