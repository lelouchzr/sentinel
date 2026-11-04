"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Clock,
  MousePointer2,
  Eye,
  KeyRound,
  Lightbulb,
  LockKeyhole,
  Check,
  Play,
  LoaderCircle,
  RotateCcw,
  ScanLine,
  BookOpen,
  DoorOpen,
  CircleHelp,
} from "lucide-react";
import {
  api,
  post,
  errorText,
  themeName,
  difficultyName,
  RequestError,
} from "@/lib/client";
import {
  Loading,
  Notice,
  Hotspots,
  Modal,
  type PublicRoom,
  type PlayData,
} from "./shared";
import HowToPlay from "./HowToPlay";

export default function Player({
  slug,
  draftId,
  onBack,
  onComplete,
}: {
  slug?: string;
  draftId?: string;
  onBack?: () => void;
  onComplete?: () => void;
}) {
  const [room, setRoom] = useState<PublicRoom | null>(null),
    [session, setSession] = useState<PlayData | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [show, setShow] = useState(true),
    [compact, setCompact] = useState(false),
    [help, setHelp] = useState(false),
    [restart, setRestart] = useState(false),
    [resumed, setResumed] = useState(false),
    [selected, setSelected] = useState<string>(),
    [message, setMessage] = useState(""),
    [outcome, setOutcome] = useState(""),
    [code, setCode] = useState(""),
    [notes, setNotes] = useState<string[]>([]);
  const discoveryRef = useRef<HTMLDivElement>(null);
  const storageKey = `frame-play-${slug ?? draftId}`;
  useEffect(() => {
    const media = window.matchMedia("(max-width: 950px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!message || busy || session?.state.complete) return;
    const target = discoveryRef.current;
    if (!target) return;
    (target.querySelector<HTMLInputElement>("input") ?? target).focus({
      preventScroll: true,
    });
    if (compact)
      target.scrollIntoView({
        block: "nearest",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }, [message, busy, compact]);
  useEffect(() => {
    let alive = true;
    async function init() {
      try {
        if (draftId) {
          const r = await post<PlayData>("play", { draftId });
          if (alive) {
            setRoom(r.room);
            setSession(r);
          }
        } else {
          const r = await api(`rooms/${slug}`);
          if (alive) setRoom(r.room);
          try {
            const saved = JSON.parse(
              localStorage.getItem(storageKey) ?? "null",
            );
            if (saved?.id && saved?.token) {
              const restored = await api<PlayData>(`play/${saved.id}`, {
                headers: { "X-Play-Token": saved.token },
              });
              if (alive) {
                setSession({ ...restored, token: saved.token });
                setNotes(restored.journal ?? []);
                if (restored.state.complete)
                  setMessage(restored.journal?.at(-1) ?? "");
                setResumed(true);
              }
            }
          } catch {
            localStorage.removeItem(storageKey);
          }
        }
      } catch (e) {
        if (alive) setError(errorText(e));
      } finally {
        if (alive) setLoading(false);
      }
    }
    void init();
    return () => {
      alive = false;
    };
  }, [slug, draftId, storageKey]);
  async function start() {
    setBusy(true);
    setError("");
    try {
      const r = await post<PlayData>("play", draftId ? { draftId } : { slug });
      setSession(r);
      setRoom(r.room);
      setSelected(undefined);
      setMessage("");
      setNotes([]);
      setResumed(false);
      setOutcome("");
      localStorage.setItem(
        storageKey,
        JSON.stringify({ id: r.id, token: r.token }),
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function interact(id: string, answer?: string, hint = false) {
    if (!session || busy || session.state.complete) return;
    setSelected(id);
    if (id !== selected) {
      setMessage("");
      setOutcome("");
    }
    if (!hint) setCode("");
    setBusy(true);
    setError("");
    try {
      const result = await api(`play/${session.id}`, {
        method: "POST",
        headers: { "X-Play-Token": session.token },
        body: JSON.stringify({
          objectId: id,
          code: answer,
          hint,
          revision: session.revision,
        }),
      });
      setSession({
        ...session,
        state: result.state,
        revision: result.revision,
      });
      setMessage(result.message);
      setOutcome(result.outcome);
      setNotes(result.journal ?? []);
      if (result.state.complete) onComplete?.();
    } catch (e) {
      setError(errorText(e));
      if (e instanceof RequestError && e.status === 409) {
        try {
          const current = await api<PlayData>(`play/${session.id}`, {
            headers: { "X-Play-Token": session.token },
          });
          setSession({ ...current, token: session.token });
          setNotes(current.journal ?? []);
        } catch {}
      }
    } finally {
      setBusy(false);
    }
  }
  const object = room?.objects.find((o) => o.id === selected);
  if (loading) return <Loading>La pièce se prépare…</Loading>;
  if (!room)
    return (
      <div className="page-width error-page">
        <Notice message={error || "Cette aventure est introuvable."} />
        <a href="/" className="button secondary">
          Retour à la galerie
        </a>
      </div>
    );
  const discovery = (
    <div
      className="discovery"
      aria-live="polite"
      aria-busy={busy}
      ref={discoveryRef}
      tabIndex={-1}
    >
      {selected && object ? (
        <>
          <div className="discovery-label">
            {outcome === "locked" ? (
              <LockKeyhole size={16} />
            ) : (
              <Eye size={16} />
            )}
            <h3>{object.name}</h3>
            {busy && <LoaderCircle className="spin" size={15} />}
          </div>
          <p>{message}</p>
          {(outcome === "needs_code" ||
            outcome === "wrong_code" ||
            (outcome === "hint" && object.action === "code")) && (
            <form
              className="code-form"
              onSubmit={(e) => {
                e.preventDefault();
                void interact(selected, code);
              }}
            >
              <label htmlFor="puzzle-code">Le code du cadenas</label>
              <div>
                <input
                  id="puzzle-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="off"
                  maxLength={16}
                  placeholder="Votre code"
                />
                <button
                  className="button primary"
                  disabled={busy || !code.trim()}
                  type="submit"
                >
                  <ArrowRight size={18} />
                  <span className="sr-only">Essayer le code</span>
                </button>
              </div>
            </form>
          )}
          {!session?.state.complete && (
            <button
              className="text-link hint-link"
              disabled={busy}
              onClick={() => void interact(selected, undefined, true)}
            >
              <Lightbulb size={15} />
              Un petit indice
            </button>
          )}
        </>
      ) : (
        <div className="first-discovery">
          <MousePointer2 size={24} />
          <p>
            Un détail, une serrure, un objet…
            <br />
            L’exploration commence par un clic.
          </p>
        </div>
      )}
    </div>
  );
  return (
    <div className="player-shell">
      <div className="player-topline">
        {onBack ? (
          <button className="text-link" onClick={onBack}>
            <ArrowLeft size={16} />
            Retour à l’atelier
          </button>
        ) : (
          <a className="text-link" href="/">
            <ArrowLeft size={16} />
            La galerie
          </a>
        )}
        <span>{draftId ? "PARTIE DE TEST" : themeName[room.theme]}</span>
        <div className="player-utilities">
          <button className="text-link" onClick={() => setHelp(true)}>
            <CircleHelp size={15} />
            Comment jouer
          </button>
          <button
            className="text-link"
            disabled={busy || !session}
            onClick={() =>
              session && session.state.moves > 0 && !session.state.complete
                ? setRestart(true)
                : void start()
            }
          >
            <RotateCcw size={14} />
            Recommencer
          </button>
        </div>
      </div>
      <div className="game-heading">
        <div>
          <h1>{room.title}</h1>
          <p>{room.description}</p>
        </div>
        <div className="game-spec">
          <span>
            <Clock size={15} />
            {room.duration} min
          </span>
          <span>{difficultyName[room.difficulty]}</span>
        </div>
      </div>
      {error && <Notice message={error} onClose={() => setError("")} />}
      {resumed && !session?.state.complete && (
        <p className="resume-note">
          <BookOpen size={15} />
          Partie reprise · Vos objets et vos découvertes ont été conservés.
        </p>
      )}
      <div className="game-layout">
        <div className="game-main">
          <div className="scene-player">
            <img
              src={room.image}
              alt={`La scène de ${room.title}`}
              draggable={false}
            />
            {session && !session.state.complete && (
              <Hotspots
                room={room}
                selected={selected}
                show={show}
                resolved={session.state.resolved}
                disabled={busy}
                onSelect={(id) => void interact(id)}
              />
            )}
            {!session && (
              <div className="start-curtain">
                <div className="start-content">
                  <span className="eyebrow">Une courte évasion</span>
                  <h2>Trouvez votre sortie.</h2>
                  <p>
                    Explorez les objets de l’image, reliez les indices et ouvrez
                    la porte.
                  </p>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={start}
                  >
                    {busy ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <Play size={17} />
                    )}
                    Commencer l’aventure
                  </button>
                  <p className="start-reassurance">
                    Sans chronomètre · Progression conservée
                  </p>
                </div>
              </div>
            )}
            {session?.state.complete && (
              <div className="win-curtain">
                <div className="win-content">
                  <div className="win-icon">
                    <DoorOpen size={34} />
                  </div>
                  <span className="eyebrow">Aventure terminée</span>
                  <h2>La porte est ouverte.</h2>
                  <p>
                    {message ||
                      "Vous avez trouvé votre chemin jusqu’à la sortie."}
                  </p>
                  <div className="win-stats">
                    <span>{session.state.moves} actions</span>
                    <span>
                      {session.state.hints} indice
                      {session.state.hints > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="button-row">
                    {onBack ? (
                      <button className="button primary" onClick={onBack}>
                        Retourner à l’atelier <ArrowRight size={16} />
                      </button>
                    ) : (
                      <a className="button primary" href="/#galerie">
                        Jouer une autre histoire <ArrowRight size={16} />
                      </a>
                    )}
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={start}
                    >
                      Rejouer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="scene-toolbar">
            <span>
              <MousePointer2 size={14} />
              Touchez un objet pour l’explorer.
            </span>
            <button
              className={`text-link ${show ? "accent" : ""}`}
              aria-pressed={show}
              onClick={() => setShow(!show)}
            >
              <ScanLine size={15} />
              {show ? "Masquer les repères" : "Afficher les repères"}
            </button>
          </div>
          {compact && discovery}
          <div className="inventory">
            <div className="inventory-title">
              <KeyRound size={17} />
              <h3>Votre inventaire</h3>
              <span>{session?.state.inventory.length ?? 0}</span>
            </div>
            <div className="inventory-items">
              {session?.state.inventory.length ? (
                session.state.inventory.map((item) => (
                  <div className="inventory-item" key={item.id}>
                    <KeyRound size={18} />
                    <span>{item.name}</span>
                    <Check size={13} />
                  </div>
                ))
              ) : (
                <p>
                  Les objets trouvés sont utilisés automatiquement au bon
                  endroit.
                </p>
              )}
            </div>
          </div>
          <div className="art-credit">
            Illustration :{" "}
            {room.credits.map((c, i) => (
              <span key={i}>
                <a href={c.url} target="_blank" rel="noreferrer">
                  {c.author}
                </a>{" "}
                · {c.license}
              </span>
            ))}
          </div>
        </div>
        <aside className="game-aside">
          <div className="notebook-header">
            <BookOpen size={19} />
            <h2>Le carnet</h2>
            <span>
              {session
                ? `${session.state.resolved.length} / ${room.objects.length}`
                : "À vous de jouer"}
            </span>
          </div>
          <div className="story">
            <span className="section-kicker">L’histoire</span>
            <p>{room.story}</p>
          </div>
          {!compact && discovery}
          <details className="object-access">
            <summary>Explorer les objets au clavier</summary>
            <div>
              {room.objects.map((o) => (
                <button
                  disabled={busy || !session || session.state.complete}
                  key={o.id}
                  onClick={() => void interact(o.id)}
                >
                  <span>
                    {session?.state.resolved.includes(o.id) && (
                      <Check size={13} />
                    )}
                    {o.name}
                  </span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </div>
          </details>
          {notes.length > 0 && (
            <details className="notes">
              <summary>Vos découvertes ({notes.length})</summary>
              {[...notes].reverse().map((n, i) => (
                <p key={i}>{n}</p>
              ))}
            </details>
          )}
        </aside>
      </div>
      {help && (
        <Modal title="Comment jouer ?" onClose={() => setHelp(false)}>
          <HowToPlay />
          <button
            className="button primary full"
            onClick={() => setHelp(false)}
          >
            J’ai compris <Check size={16} />
          </button>
        </Modal>
      )}
      {restart && (
        <Modal
          title="Recommencer cette histoire ?"
          onClose={() => setRestart(false)}
        >
          <p className="modal-intro">
            Votre progression actuelle sera remplacée par une nouvelle partie.
          </p>
          <div className="button-row">
            <button
              className="button secondary"
              onClick={() => setRestart(false)}
            >
              Continuer ma partie
            </button>
            <button
              className="button primary"
              onClick={() => {
                setRestart(false);
                void start();
              }}
            >
              Recommencer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
