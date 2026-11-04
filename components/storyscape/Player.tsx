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
  MapPin,
  Volume2,
  VolumeX,
  Pause,
  Sparkles,
  Hand,
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
import { savedStorySlug } from "@/lib/story-links";
import HowToPlay from "./HowToPlay";
import SceneStage from "./SceneStage";
import StoryArrival from "./StoryArrival";
import { useSoundscape } from "./useSoundscape";
import type { ManipulationAttempt } from "@/lib/game";
import ObjectMotion from "./ObjectMotion";
import ManipulationBench from "./ManipulationBench";

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
    [notes, setNotes] = useState<string[]>([]),
    [arrival, setArrival] = useState(false),
    [motion, setMotion] = useState(false),
    [longEdition, setLongEdition] = useState<string>(),
    [bench, setBench] = useState<string>();
  const sound = useSoundscape(room?.ambience);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotion(!preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  const discoveryRef = useRef<HTMLDivElement>(null);
  // Preserve the original capability keys for games already in progress.
  const storageKey = `frame-play-${savedStorySlug(slug ?? draftId ?? "")}`;
  useEffect(() => {
    const media = window.matchMedia("(max-width: 950px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!message || busy || bench || arrival || session?.state.complete) return;
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
  }, [message, busy, compact, bench, arrival]);
  useEffect(() => {
    let alive = true;
    async function init() {
      try {
        if (draftId) {
          const r = await post<PlayData>("play", { draftId });
          if (alive) {
            setRoom(r.room);
            setSession(r);
            setArrival(!!r.room.chapters);
          }
        } else {
          const r = await api(`rooms/${slug}`);
          if (alive) {
            setRoom(r.room);
            setLongEdition(r.longEdition?.slug);
          }
          const fresh =
            ["new", "nouvelle"].some((key) => new URLSearchParams(window.location.search).get(key) === "1");
          if (r.longEdition) {
            const saved = JSON.parse(
              localStorage.getItem(storageKey) ?? "null",
            );
            if (!saved || fresh) {
              window.location.replace(`/play/${r.longEdition.slug}`);
              return;
            }
          }
          if (fresh) return;
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
                setRoom(restored.room);
                if (restored.state.moves === 0 && r.longEdition) {
                  window.location.replace(`/play/${r.longEdition.slug}`);
                  return;
                }
                if (
                  (!restored.room.chapters && r.room.chapters) ||
                  restored.room.totalObjects !== r.room.totalObjects ||
                  (!restored.room.interactive && r.room.interactive)
                )
                  setLongEdition(slug);
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
      setBench(undefined);
      setMessage("");
      setNotes([]);
      setResumed(false);
      setOutcome("");
      setArrival(!!r.room.chapters);
      if (r.room.chapters) setLongEdition(undefined);
      const address = new URL(window.location.href);
      address.searchParams.delete("new");
      address.searchParams.delete("nouvelle");
      history.replaceState(null, "", address.pathname + address.search);
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ id: r.id, token: r.token }),
        );
      } catch {
        setError(
          "This part works, but this browser cannot keep progress after closing.",
        );
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function interact(
    id: string,
    answer?: string,
    hint = false,
    choiceId?: string,
    attempt?: ManipulationAttempt,
  ) {
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
          choiceId,
          attempt,
          revision: session.revision,
        }),
      });
      setSession({
        ...session,
        state: result.state,
        revision: result.revision,
      });
      setRoom(result.room);
      setMessage(result.message);
      setOutcome(result.outcome);
      if (
        [
          "needs_code",
          "wrong_code",
          "needs_manipulation",
          "wrong_manipulation",
          "needs_item",
        ].includes(result.outcome)
      )
        setBench(id);
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
          setRoom(current.room);
          setNotes(current.journal ?? []);
        } catch {}
      }
    } finally {
      setBusy(false);
    }
  }
  async function travel(chapterId: string) {
    if (
      !session ||
      busy ||
      session.state.complete ||
      chapterId === room?.chapterId
    )
      return;
    const firstVisit = !session.state.visited?.includes(chapterId);
    setBusy(true);
    setError("");
    try {
      const result = await api(`play/${session.id}`, {
        method: "POST",
        headers: { "X-Play-Token": session.token },
        body: JSON.stringify({ chapterId, revision: session.revision }),
      });
      setSession({
        ...session,
        state: result.state,
        revision: result.revision,
      });
      setRoom(result.room);
      setSelected(undefined);
      setBench(undefined);
      setMessage("");
      setOutcome("");
      setCode("");
      setArrival(firstVisit);
    } catch (e) {
      setError(errorText(e));
      if (e instanceof RequestError && e.status === 409) {
        const current = await api<PlayData>(`play/${session.id}`, {
          headers: { "X-Play-Token": session.token },
        }).catch(() => null);
        if (current) {
          setSession({ ...current, token: session.token });
          setRoom(current.room);
          setNotes(current.journal ?? []);
        }
      }
    } finally {
      setBusy(false);
    }
  }
  const object = room?.objects.find((o) => o.id === selected);
  const chapter = room?.chapters?.find((c) => c.id === room.chapterId);
  const newPlaces =
    session && !session.state.complete
      ? (room?.chapters?.filter((c) => c.unlocked && !c.visited) ?? [])
      : [];

  if (loading) return <Loading>The room is getting ready…</Loading>;
  if (!room)
    return (
      <div className="page-width error-page">
        <Notice message={error || "This adventure cannot be found."} />
        <a href="/" className="button secondary">
          Back to the gallery
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
          {object.speaker && (
            <span className="discovery-speaker">{object.speaker}</span>
          )}
          <div
            className="discovery-prose"
            key={`${selected}-${outcome}-${message.slice(0, 24)}`}
          >
            {message.split(/\n\s*\n/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {object.action === "choose" &&
            !session?.state.resolved.includes(object.id) &&
            (outcome === "needs_choice" || outcome === "hint") && (
              <div className="story-choices">
                <p>This choice will determine the ending of your story.</p>
                {object.choices?.map((choice) => (
                  <button
                    className="button secondary"
                    key={choice.id}
                    disabled={busy}
                    onClick={() =>
                      void interact(object.id, undefined, false, choice.id)
                    }
                  >
                    {choice.label}
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
            )}
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
              <label htmlFor="puzzle-code">The padlock code</label>
              <div>
                <input
                  id="puzzle-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="off"
                  maxLength={16}
                  placeholder="Your code"
                />
                <button
                  className="button primary"
                  disabled={busy || !code.trim()}
                  type="submit"
                >
                  <ArrowRight size={18} />
                  <span className="sr-only">Try the code</span>
                </button>
              </div>
            </form>
          )}
          {session &&
            (object.puzzle ||
              object.animation ||
              object.needsItem ||
              object.action === "code") && (
              <button
                className="button secondary bench-reopen"
                disabled={busy}
                onClick={() => {
                  if (session.state.resolved.includes(object.id))
                    setBench(object.id);
                  else void interact(object.id);
                }}
              >
                Manipulate this object <Hand size={16} />
              </button>
            )}
          {!session?.state.complete && (
            <button
              className="text-link hint-link"
              disabled={busy}
              onClick={() => void interact(selected, undefined, true)}
            >
              <Lightbulb size={15} />
              A little hint
            </button>
          )}
        </>
      ) : (
        <div className="first-discovery">
          <MousePointer2 size={24} />
          <p>
            A detail, a lock, an object…
            <br />
            Exploration begins with a click.
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
            Back to the studio
          </button>
        ) : (
          <a className="text-link" href="/">
            <ArrowLeft size={16} />
            The gallery
          </a>
        )}
        <span>{draftId ? "TEST PLAY" : themeName[room.theme]}</span>
        <div className="player-utilities">
          <button className="text-link" onClick={() => setHelp(true)}>
            <CircleHelp size={15} />
            How to play
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
            Restart
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
      {longEdition && (
        <div className="edition-note">
          <BookOpen size={18} />
          <p>
            A fuller, animated version of this story is available. Your current playthrough is kept.
          </p>
          <a
            className="button secondary"
            href={`/play/${longEdition}?new=1`}
          >
            Discover the new version <ArrowRight size={16} />
          </a>
        </div>
      )}
      {(error || sound.error) && (
        <Notice message={error || sound.error} onClose={() => setError("")} />
      )}
      {resumed && !session?.state.complete && (
        <p className="resume-note">
          <BookOpen size={15} />
          Playthrough resumed · Your objects and discoveries have been kept.
        </p>
      )}
      <div className="game-layout">
        <div className="game-main">
          {chapter && (
            <div className="chapter-current">
              <div>
                <span className="section-kicker">
                  Chapter{" "}
                  {(room.chapters?.findIndex((c) => c.id === room.chapterId) ??
                    0) + 1}{" "}
                  / {room.chapters?.length}
                </span>
                <h2>{chapter.title}</h2>
                <p>{room.objective}</p>
              </div>
              <button className="text-link" onClick={() => setArrival(true)}>
                <BookOpen size={16} />
                Re-read the scene
              </button>
            </div>
          )}
          <SceneStage
            key={room.image}
            image={room.image}
            title={chapter?.title ?? room.title}
            ambience={room.ambience}
            motion={motion}
            overlay={
              <>
                {!session && (
                  <div className="start-curtain">
                    <div className="start-content">
                      <span className="eyebrow">
                        {room.chapters
                          ? `${room.chapters.length} chapters · Two endings`
                          : "A short escape"}
                      </span>
                      <h2>
                        {room.chapters
                          ? "A story awaits you."
                          : "Find your exit."}
                      </h2>
                      <p>
                        {room.chapters
                          ? "Explore several places, find traces of the past and choose how the story continues."
                          : "Explore the objects in the image, connect the clues and open the door."}
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
                        Start the adventure
                      </button>
                      <p className="start-reassurance">
                        No timer · Progress saved
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
                      <span className="eyebrow">Adventure complete</span>
                      <h2>{room.ending?.title ?? "The door is open."}</h2>
                      <div className="ending-prose">
                        {(
                          room.ending?.text ||
                          message ||
                          "You found your way to the exit."
                        )
                          .split(/\n\s*\n/)
                          .map((p, i) => (
                            <p key={i}>{p}</p>
                          ))}
                      </div>
                      <div className="win-stats">
                        <span>{session.state.moves} actions</span>
                        <span>
                          {session.state.hints} clue
                          {session.state.hints > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="button-row">
                        {onBack ? (
                          <button className="button primary" onClick={onBack}>
                            Return to the studio <ArrowRight size={16} />
                          </button>
                        ) : (
                          <a className="button primary" href="/#gallery">
                            Play another story <ArrowRight size={16} />
                          </a>
                        )}
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={start}
                        >
                          Play again
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            }
          >
            {session && (
              <ObjectMotion
                room={room}
                resolved={session.state.resolved}
                motion={motion}
              />
            )}
            {session && !session.state.complete && (
              <Hotspots
                room={room}
                selected={selected}
                show={show}
                resolved={session.state.resolved}
                disabled={busy || arrival}
                onSelect={(id) => void interact(id)}
              />
            )}
          </SceneStage>
          <div className="scene-toolbar">
            <span>
              <MousePointer2 size={14} />
              Touch an object to explore it.
            </span>
            <button
              className={`text-link ${show ? "accent" : ""}`}
              aria-pressed={show}
              onClick={() => setShow(!show)}
            >
              <ScanLine size={15} />
              {show ? "Hide the markers" : "Show the markers"}
            </button>
          </div>
          {room.chapters && (
            <div className="atmosphere-controls">
              <button
                className="text-link"
                aria-pressed={motion}
                onClick={() => setMotion(!motion)}
              >
                {motion ? <Pause size={15} /> : <Sparkles size={15} />}
                Animations {motion ? "enabled" : "paused"}
              </button>
              <button
                className="text-link"
                aria-pressed={sound.enabled}
                onClick={() => void sound.toggle()}
              >
                {sound.enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                Background audio {sound.enabled ? "enabled" : "disabled"}
              </button>
            </div>
          )}
          {newPlaces.length > 0 && (
            <div className="new-place" role="status">
              <MapPin size={19} />
              <div>
                <span>A new place awaits you</span>
                {newPlaces.map((c) => (
                  <button
                    key={c.id}
                    className="text-link"
                    disabled={busy}
                    onClick={() => void travel(c.id)}
                  >
                    {c.title}
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {compact && discovery}
          {room.chapters && (
            <nav className="chapter-map" aria-label="Story map">
              {room.chapters.map((c, i) => (
                <button
                  key={c.id}
                  className={c.id === room.chapterId ? "current" : ""}
                  aria-current={
                    c.id === room.chapterId ? "location" : undefined
                  }
                  disabled={
                    !session || !c.unlocked || busy || session.state.complete
                  }
                  onClick={() => void travel(c.id)}
                >
                  <span className="chapter-number">
                    {c.unlocked ? i + 1 : <LockKeyhole size={14} />}
                  </span>
                  <span>
                    <strong>{c.title}</strong>
                    <small>
                      {!c.unlocked
                        ? "To discover"
                        : c.id === room.chapterId
                          ? "You are here"
                          : c.visited
                            ? "Return to this place"
                            : "New place"}
                    </small>
                  </span>
                  {c.unlocked && <ArrowRight size={16} />}
                </button>
              ))}
            </nav>
          )}

          <div className="inventory">
            <div className="inventory-title">
              <KeyRound size={17} />
              <h3>Your inventory</h3>
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
                  Choose an object from your inventory when a lock or manipulation asks you to.
                </p>
              )}
            </div>
          </div>
          <div className="art-credit">
            {room.image === "/stories/kitchen-base.png" && (
              <span>
                Empty bowl layer:{" "}
                <a href="https://openai.com" target="_blank" rel="noreferrer">
                  OpenAI Imagegen
                </a>{" "}
                ·{" "}
              </span>
            )}
            Illustration:{" "}
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
            <h2>The notebook</h2>
            <span>
              {session
                ? `${session.state.resolved.length} / ${room.totalObjects ?? room.objects.length}`
                : "Your turn to play"}
            </span>
          </div>
          <div className="story">
            <span className="section-kicker">
              {chapter ? "In this chapter" : "The story"}
            </span>
            {room.story.split(/\n\s*\n/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {!compact && discovery}
          <details className="object-access">
            <summary>Explore objects with the keyboard</summary>
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
              <summary>Your discoveries ({notes.length})</summary>
              {[...notes].reverse().map((n, i) => (
                <p key={i}>{n}</p>
              ))}
            </details>
          )}
        </aside>
      </div>
      {bench && session && room.objects.find((o) => o.id === bench) && (
        <ManipulationBench
          key={bench}
          room={room}
          object={room.objects.find((o) => o.id === bench)!}
          state={session.state}
          busy={busy}
          outcome={outcome}
          message={message}
          motion={motion}
          onClose={() => setBench(undefined)}
          onSubmit={(answer, attempt) =>
            interact(bench, answer, false, undefined, attempt)
          }
        />
      )}
      {arrival && session && room.chapters && (
        <StoryArrival room={room} onContinue={() => setArrival(false)} />
      )}
      {help && (
        <Modal title="How to play?" onClose={() => setHelp(false)}>
          <HowToPlay />
          <button
            className="button primary full"
            onClick={() => setHelp(false)}
          >
            Got it <Check size={16} />
          </button>
        </Modal>
      )}
      {restart && (
        <Modal
          title="Restart this story?"
          onClose={() => setRestart(false)}
        >
          <p className="modal-intro">
            Your current progress will be replaced by a new game.
          </p>
          <div className="button-row">
            <button
              className="button secondary"
              onClick={() => setRestart(false)}
            >
              Continue my game
            </button>
            <button
              className="button primary"
              onClick={() => {
                setRestart(false);
                void start();
              }}
            >
              Restart
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
