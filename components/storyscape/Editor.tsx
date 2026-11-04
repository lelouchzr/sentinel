"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Plus,
  Sparkles,
  MousePointer2,
  Check,
  Save,
  Play,
  Globe,
  Link2,
  Upload,
  CheckCircle2,
  LoaderCircle,
  ScanLine,
  Copy,
  Image as ImageIcon,
  Pencil,
} from "lucide-react";
import type { Room, GameObject } from "@/lib/game";
import { replaceIllustration } from "@/lib/game";
import { api, post, errorText, themeName, difficultyName } from "@/lib/client";
import {
  Loading,
  Notice,
  SignIn,
  Modal,
  Hotspots,
  actionNames,
  icons,
  type Viewer,
} from "./shared";
import Player from "./Player";
import IllustrationMaker from "./IllustrationMaker";

export default function Editor({
  viewer,
  draftId,
}: {
  viewer: Viewer | undefined;
  draftId?: string;
}) {
  const [room, setRoom] = useState<Room | null>(null),
    [chapterId, setChapterId] = useState<string>(),
    [id, setId] = useState(draftId),
    [revision, setRevision] = useState(0),
    [dirty, setDirty] = useState(false),
    [selected, setSelected] = useState<string>(),
    [busy, setBusy] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [brief, setBrief] = useState(
      "A short adventure with observation puzzles suited to the objects in this image, consistent clues and an exit to unlock.",
    ),
    [metaReady, setMetaReady] = useState(false),
    [proposal, setProposal] = useState<Room | null>(null),
    [pendingMask, setPendingMask] = useState<any>(null),
    [drawing, setDrawing] = useState(false),
    [drag, setDrag] = useState<{ x: number; y: number } | null>(null),
    [box, setBox] = useState<GameObject["region"] | null>(null),
    [testing, setTesting] = useState(false),
    [tested, setTested] = useState(false),
    [publish, setPublish] = useState(false),
    [visibility, setVisibility] = useState("public"),
    [rights, setRights] = useState(false),
    [published, setPublished] = useState<string>();
  const canvasRef = useRef<HTMLDivElement>(null),
    uploadRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!viewer) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api(draftId ? `drafts/${draftId}` : "templates/kitchen")
      .then((r) => {
        setRoom(r.room);
        setChapterId(r.room.chapters?.[0]?.id);
        setSelected(r.room.objects[0]?.id);
        if (r.id) {
          setId(r.id);
          setRevision(r.revision);
          setTested(r.tested === true);
          if (new URLSearchParams(window.location.search).get("test") === "1")
            setTesting(true);
        }
      })
      .catch((e) => setNotice(errorText(e)))
      .finally(() => setLoading(false));
    api("health")
      .then((r) => setMetaReady(r.metaConfigured))
      .catch(() => {});
  }, [viewer, draftId]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  function change(next: Room) {
    setRoom(next);
    setDirty(true);
    setTested(false);
    setPendingMask(null);
    setPublished(undefined);
  }
  function patchObject(patch: Partial<GameObject>) {
    if (!room || !selected) return;
    change({
      ...room,
      objects: room.objects.map((o) =>
        o.id === selected ? { ...o, ...patch } : o,
      ),
    });
  }
  async function save() {
    if (!room) throw new Error("Scenario unavailable.");
    if (id && !dirty) return { id, revision };
    const result = id
      ? await api(`drafts/${id}`, {
          method: "PUT",
          body: JSON.stringify({ room, revision }),
        })
      : await post("drafts", { room });
    setId(result.id);
    setRevision(result.revision);
    setDirty(false);
    setTested(false);
    if (!id) history.replaceState(null, "", `/studio/${result.id}`);
    return result;
  }
  async function saveButton() {
    setBusy("save");
    setNotice("");
    try {
      await save();
      setNotice("Draft saved. Your adventure stays private.");
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setBusy("");
    }
  }
  async function testGame() {
    setBusy("test");
    setNotice("");
    try {
      await save();
      setTesting(true);
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setBusy("");
    }
  }
  async function generate() {
    setBusy("generate");
    setNotice("");
    try {
      const result = await post("meta/generate", { room, brief });
      setProposal(result.room);
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setBusy("");
    }
  }
  async function segment() {
    setBusy("segment");
    setNotice("");
    try {
      const result = await post("meta/segment", { room, objectId: selected });
      setPendingMask({ ...result, objectId: selected });
      setNotice("SAM suggested an outline. Check it before keeping it.");
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setBusy("");
    }
  }
  async function loadTemplate(template: string) {
    if (
      dirty &&
      !window.confirm(
        "Load this illustration and replace unsaved changes?",
      )
    )
      return;
    setBusy("template");
    try {
      const result = await api(`templates/${template}`);
      setId(undefined);
      setRevision(0);
      setRoom(result.room);
      setChapterId(result.room.chapters?.[0]?.id);
      setSelected(result.room.objects[0]?.id);
      setDirty(false);
      setTested(false);
      setPublished(undefined);
      history.replaceState(null, "", "/studio");
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setBusy("");
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy("upload");
    setNotice("");
    try {
      if (file.size > 5_000_000)
        throw new Error("Choose a PNG under 5 MB.");
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("Unable to read this image."));
        r.readAsDataURL(file);
      });
      const result = await post("assets", { dataUrl });
      if (room)
        change(
          replaceIllustration(
            room,
            {
              image: result.image,
              credits: [
                {
                  title: file.name,
                  author: viewer?.displayName ?? "Creator",
                  license: "Illustration provided by the creator",
                  url: "https://frame-escape-atelier.lelouchrz.chatgpt.site",
                },
              ],
              imageProvenance: undefined,
            },
            chapterId,
          ),
        );
      setNotice(
        "Illustration imported. Generate a matching scenario or adjust the objects and their zones.",
      );
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setBusy("");
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }
  async function publishGame() {
    setBusy("publish");
    setNotice("");
    try {
      const saved = await save();
      const result = await post(`drafts/${saved.id}/publish`, {
        visibility,
        rightsConfirmed: rights,
      });
      setPublished(result.url);
      setPublish(false);
      setNotice(
        visibility === "public"
          ? "Your adventure is published in the gallery."
          : "Your adventure is accessible only with its link.",
      );
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setBusy("");
    }
  }
  function point(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }
  if (viewer === undefined) return <Loading />;
  if (!viewer) return <SignIn />;
  if (testing && id)
    return (
      <Player
        draftId={id}
        onBack={() => {
          history.replaceState(null, "", `/studio/${id}`);
          setTesting(false);
        }}
        onComplete={() => setTested(true)}
      />
    );
  if (loading) return <Loading>Opening your studio…</Loading>;
  if (!room)
    return (
      <div className="page-width error-page">
        <Notice message={notice || "The draft could not be loaded."} />
        <a className="button secondary" href="/studio">
          New Adventure
        </a>
      </div>
    );
  const object = room.objects.find((o) => o.id === selected);
  const chapter =
    room.chapters?.find((c) => c.id === chapterId) ?? room.chapters?.[0];
  const sceneObjects = room.objects.filter(
    (o) => !room.chapters || o.chapterId === chapter?.id,
  );
  const sceneRoom = {
    ...room,
    ...(chapter ? { image: chapter.image, credits: chapter.credits } : {}),
    objects: sceneObjects,
  };
  const shownRoom = pendingMask
    ? {
        ...sceneRoom,
        objects: sceneObjects.map((o) =>
          o.id === pendingMask.objectId
            ? { ...o, region: pendingMask.region, mask: pendingMask.mask }
            : o,
        ),
      }
    : sceneRoom;
  return (
    <div className="editor-shell">
      <div className="editor-heading">
        <div>
          <div className="section-kicker">The Studio</div>
          <h1>Bring your image to life.</h1>
          <span className="save-status">
            {dirty
              ? "Unsaved changes"
              : id
                ? "Draft saved"
                : "Your first adventure"}
            {room.provenance.method === "meta" && (
              <span> · Scenario suggested by Meta</span>
            )}
          </span>
        </div>
        <div className="button-row">
          <button
            className="button secondary"
            disabled={!!busy}
            onClick={saveButton}
          >
            <Save size={16} />
            <span>Save</span>
          </button>
          <button
            className="button secondary"
            disabled={!!busy}
            onClick={testGame}
          >
            <Play size={16} />
            Test
          </button>
          <button
            className="button primary"
            disabled={!!busy}
            onClick={() => setPublish(true)}
          >
            <Globe size={16} />
            Publish
          </button>
        </div>
      </div>
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      {published && (
        <div className="published-banner">
          <CheckCircle2 size={21} />
          <div>
            <strong>Your game has its address.</strong>
            <a href={published}>
              {new URL(published, window.location.origin).href}
            </a>
          </div>
          <button
            className="button secondary small"
            onClick={() => {
              void navigator.clipboard
                .writeText(new URL(published, location.origin).href)
                .then(() => setNotice("Link copied."))
                .catch(() => setNotice("Copy the link shown above."));
            }}
          >
            <Copy size={15} />
            Copy
          </button>
          <a href={published} className="button primary small">
            Play <ArrowUpRight size={15} />
          </a>
        </div>
      )}
      <div className="editor-layout">
        <aside className="object-panel">
          <div className="panel-heading">
            <h2>Objects in this place</h2>
            <span>{sceneObjects.length}</span>
          </div>
          {room.chapters && (
            <label className="editor-chapter-select">
              Chapter to edit
              <select
                value={chapter?.id}
                onChange={(e) => {
                  setChapterId(e.target.value);
                  setSelected(
                    room.objects.find((o) => o.chapterId === e.target.value)
                      ?.id,
                  );
                  setPendingMask(null);
                  setDrawing(false);
                }}
              >
                {room.chapters.map((c, i) => (
                  <option key={c.id} value={c.id}>
                    {i + 1}. {c.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="object-list">
            {sceneObjects.map((o, i) => {
              const Icon = icons[o.action];
              return (
                <button
                  disabled={!!busy}
                  className={selected === o.id ? "selected" : ""}
                  key={o.id}
                  onClick={() => {
                    setSelected(o.id);
                    setPendingMask(null);
                    setDrawing(false);
                  }}
                >
                  <span className="object-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    {o.name}
                    <small>{actionNames[o.action]}</small>
                  </span>
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
          <button
            className="add-object"
            disabled={room.objects.length >= 32 || !!busy}
            onClick={() => {
              const objectId = `objet-${crypto.randomUUID().slice(0, 6)}`;
              change({
                ...room,
                objects: [
                  ...room.objects,
                  {
                    id: objectId,
                    ...(chapter ? { chapterId: chapter.id } : {}),
                    name: "New object",
                    prompt: "object",
                    action: "inspect",
                    region: { x: 0.4, y: 0.4, w: 0.15, h: 0.15 },
                    requires: [],
                    code: null,
                    itemName: null,
                    message: "Describe what the player discovers.",
                    lockedMessage: "Something is still missing.",
                    hint: "Look at the details of the room.",
                  },
                ],
              });
              setSelected(objectId);
            }}
          >
            <Plus size={15} />
            Add an object
          </button>
          <div className="object-panel-note">
            <MousePointer2 size={17} />
            <p>
              Select an object to edit its rules and its zone in the image.
            </p>
          </div>
          <div className={`test-status ${tested ? "is-tested" : ""}`}>
            <CheckCircle2 size={18} />
            <div>
              <strong>
                {tested
                  ? "Test playthrough complete"
                  : "To test before publishing"}
              </strong>
              <p>
                {tested
                  ? "This version was played through to the exit."
                  : "Play your adventure to check the clues."}
              </p>
            </div>
          </div>
        </aside>
        <div className="editor-center">
          <div className="canvas-bar">
            <span>
              <ImageIcon size={15} />
              The illustration
            </span>
            <div>
              <button
                className="text-link"
                disabled={!!busy}
                onClick={() => void loadTemplate("kitchen")}
              >
                Kitchen
              </button>
              <button
                className="text-link"
                disabled={!!busy}
                onClick={() => void loadTemplate("japanese")}
              >
                Japanese room
              </button>
              <IllustrationMaker
                room={sceneRoom}
                disabled={!!busy || !metaReady}
                onApply={(proposal) => {
                  change(replaceIllustration(room, proposal, chapter?.id));
                  setNotice(
                    "Meta illustration applied. Adapt the objects and generate a scenario for this new room.",
                  );
                }}
              />
              <button
                className="icon-button"
                disabled={!!busy}
                aria-label="Import a PNG illustration"
                onClick={() => uploadRef.current?.click()}
              >
                <Upload size={16} />
              </button>
              <input
                className="sr-only"
                ref={uploadRef}
                type="file"
                accept="image/png"
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </div>
          </div>
          <div
            className={`editor-canvas ${drawing ? "drawing" : ""}`}
            ref={canvasRef}
            onPointerDown={(e) => {
              if (!drawing) return;
              const p = point(e);
              setDrag(p);
              setBox({ x: p.x, y: p.y, w: 0, h: 0 });
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!drag) return;
              const p = point(e);
              setBox({
                x: Math.min(drag.x, p.x),
                y: Math.min(drag.y, p.y),
                w: Math.abs(drag.x - p.x),
                h: Math.abs(drag.y - p.y),
              });
            }}
            onPointerUp={(e) => {
              if (!drag) return;
              const p = point(e);
              const r = {
                x: Math.min(drag.x, p.x),
                y: Math.min(drag.y, p.y),
                w: Math.abs(drag.x - p.x),
                h: Math.abs(drag.y - p.y),
              };
              if (r.w >= 0.008 && r.h >= 0.008)
                patchObject({ region: r, mask: undefined });
              else setNotice("Draw a slightly larger zone.");
              setDrag(null);
              setBox(null);
              setDrawing(false);
            }}
          >
            <img
              src={sceneRoom.image}
              alt="Illustration of your escape game with interactive zones"
              draggable={false}
            />
            <Hotspots
              room={shownRoom}
              selected={selected}
              show
              onSelect={setSelected}
              drawing={drawing}
            />
            {box && (
              <div
                className="drawing-box"
                style={{
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.w * 100}%`,
                  height: `${box.h * 100}%`,
                }}
              />
            )}
          </div>
          <div className="canvas-footer">
            <span>
              {drawing
                ? "Draw the object's zone in the image."
                : "The numbered zones are the objects the player can explore."}
            </span>
            <span>{sceneObjects.length} objects in this place</span>
          </div>
          <section className="meta-studio">
            <div className="meta-heading">
              <div className="meta-mark">
                <Sparkles size={19} />
              </div>
              <div>
                <h2>A boost for the imagination.</h2>
                <p>
                  Muse Spark suggests the story, the puzzles and their connections.
                </p>
              </div>
              <span className={`model-status ${metaReady ? "ready" : ""}`}>
                {metaReady ? "Meta connected" : "Meta to set up"}
              </span>
            </div>
            <label className="sr-only" htmlFor="adventure-brief">
              Describe the adventure to generate
            </label>
            <textarea
              id="adventure-brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="The mood, the puzzles, what you imagine…"
            />
            <div className="meta-bottom">
              <p>
                {room.chapters
                  ? "This story has several chapters. Edit the places and their objects below; a new Meta suggestion replaces the entire scenario."
                  : "You have the final word on every suggestion."}
              </p>
              <button
                className="button primary"
                disabled={
                  !!busy ||
                  brief.trim().length < 10 ||
                  !metaReady ||
                  !!room.chapters
                }
                onClick={generate}
              >
                {busy === "generate" ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Sparkles size={16} />
                )}{" "}
                {busy === "generate"
                  ? "Muse Spark is writing…"
                  : "Imagine with Meta"}
              </button>
            </div>
          </section>
          {chapter && (
            <section className="room-settings">
              <h2>This chapter</h2>
              <label>
                Place title
                <input
                  value={chapter.title}
                  maxLength={100}
                  onChange={(e) =>
                    change({
                      ...room,
                      chapters: room.chapters!.map((c) =>
                        c.id === chapter.id
                          ? { ...c, title: e.target.value }
                          : c,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Objective
                <textarea
                  value={chapter.objective}
                  maxLength={300}
                  rows={2}
                  onChange={(e) =>
                    change({
                      ...room,
                      chapters: room.chapters!.map((c) =>
                        c.id === chapter.id
                          ? { ...c, objective: e.target.value }
                          : c,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Story on arrival
                <textarea
                  value={chapter.story}
                  maxLength={2400}
                  rows={8}
                  onChange={(e) =>
                    change({
                      ...room,
                      chapters: room.chapters!.map((c) =>
                        c.id === chapter.id
                          ? { ...c, story: e.target.value }
                          : c,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Objects to solve to access this place
                <select
                  multiple
                  disabled={room.chapters?.[0].id === chapter.id}
                  value={chapter.requires}
                  onChange={(e) =>
                    change({
                      ...room,
                      chapters: room.chapters!.map((c) =>
                        c.id === chapter.id
                          ? {
                              ...c,
                              requires: Array.from(
                                e.target.selectedOptions,
                                (o) => o.value,
                              ),
                            }
                          : c,
                      ),
                    })
                  }
                >
                  {room.objects
                    .filter(
                      (o) => o.action !== "exit" && o.chapterId !== chapter.id,
                    )
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                </select>
              </label>
            </section>
          )}
          {room.ending && (
            <section className="room-settings">
              <h2>The endings</h2>
              {room.ending.variants.map((v, i) => (
                <div key={v.choiceId}>
                  <label>
                    Ending title {i + 1}
                    <input
                      value={v.title}
                      maxLength={120}
                      onChange={(e) =>
                        change({
                          ...room,
                          ending: {
                            ...room.ending!,
                            variants: room.ending!.variants.map((a, n) =>
                              n === i ? { ...a, title: e.target.value } : a,
                            ),
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    Ending
                    <textarea
                      value={v.text}
                      maxLength={3000}
                      rows={8}
                      onChange={(e) =>
                        change({
                          ...room,
                          ending: {
                            ...room.ending!,
                            variants: room.ending!.variants.map((a, n) =>
                              n === i ? { ...a, text: e.target.value } : a,
                            ),
                          },
                        })
                      }
                    />
                  </label>
                </div>
              ))}
            </section>
          )}
          <section className="room-settings">
            <h2>Your adventure</h2>
            <label>
              Title
              <input
                maxLength={80}
                value={room.title}
                onChange={(e) => change({ ...room, title: e.target.value })}
              />
            </label>
            <label>
              Overview
              <textarea
                rows={2}
                maxLength={400}
                value={room.description}
                onChange={(e) =>
                  change({ ...room, description: e.target.value })
                }
              />
            </label>
            <label>
              Start of the story
              <textarea
                rows={3}
                maxLength={2400}
                value={room.story}
                onChange={(e) => change({ ...room, story: e.target.value })}
              />
            </label>
            <div className="field-row">
              <label>
                Theme
                <select
                  value={room.theme}
                  onChange={(e) =>
                    change({ ...room, theme: e.target.value as Room["theme"] })
                  }
                >
                  {Object.entries(themeName).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Difficulty
                <select
                  value={room.difficulty}
                  onChange={(e) =>
                    change({
                      ...room,
                      difficulty: e.target.value as Room["difficulty"],
                    })
                  }
                >
                  {Object.entries(difficultyName).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Duration (min)
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={room.duration}
                  onChange={(e) =>
                    change({ ...room, duration: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          </section>
        </div>
        <aside className="inspector">
          {object ? (
            <>
              <div className="panel-heading">
                <h2>The object's rules</h2>
                <Pencil size={15} />
              </div>
              <fieldset disabled={!!busy}>
                <label>
                  Object name
                  <input
                    value={object.name}
                    maxLength={80}
                    onChange={(e) => patchObject({ name: e.target.value })}
                  />
                </label>
                <label>
                  Interaction
                  <select
                    value={object.action}
                    onChange={(e) =>
                      patchObject({
                        action: e.target.value as GameObject["action"],
                        code: e.target.value === "code" ? "00" : null,
                        puzzle: ["code", "choose", "exit"].includes(
                          e.target.value,
                        )
                          ? undefined
                          : object.puzzle,
                        useItem:
                          e.target.value === "code"
                            ? undefined
                            : object.useItem,
                        choices:
                          e.target.value === "choose"
                            ? [
                                {
                                  id: "option-a",
                                  label: "First choice",
                                  reply: "The first path opens.",
                                },
                                {
                                  id: "option-b",
                                  label: "Second choice",
                                  reply: "The second path opens.",
                                },
                              ]
                            : undefined,
                        ...(e.target.value === "exit"
                          ? { itemName: null }
                          : {}),
                      })
                    }
                  >
                    {Object.entries(actionNames).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Object animation
                  <select
                    value={object.animation ?? ""}
                    onChange={(e) =>
                      patchObject({
                        animation: (e.target.value ||
                          undefined) as GameObject["animation"],
                      })
                    }
                  >
                    <option value="">None</option>
                    {[
                      ["drawer", "Drawer opening"],
                      ["fruits", "Fruits moved"],
                      ["door", "Door opening"],
                      ["lid", "Lid lifted"],
                      ["page", "Page turned"],
                      ["lever", "Lever pulled"],
                      ["light", "Light turned on"],
                    ].map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Manipulation
                  <select
                    value={object.puzzle?.kind ?? ""}
                    disabled={
                      ["code", "choose", "exit"].includes(object.action) ||
                      !!object.useItem
                    }
                    onChange={(e) =>
                      patchObject({
                        puzzle: e.target.value
                          ? {
                              kind: e.target.value as "move" | "sequence",
                              instruction:
                                "Handle the elements using the clues.",
                              pieces: [
                                { id: "premier", label: "First element" },
                                { id: "deuxieme", label: "Second element" },
                                { id: "troisieme", label: "Third element" },
                              ],
                              ...(e.target.value === "sequence"
                                ? {
                                    solution: [
                                      "premier",
                                      "deuxieme",
                                      "troisieme",
                                    ],
                                  }
                                : {}),
                            }
                          : undefined,
                      })
                    }
                  >
                    <option value="">None</option>
                    <option value="move">Move to discover</option>
                    <option value="sequence">Put back in order</option>
                  </select>
                </label>
                {object.puzzle && (
                  <div className="editor-puzzle">
                    <label>
                      Instruction
                      <textarea
                        rows={3}
                        maxLength={300}
                        value={object.puzzle.instruction}
                        onChange={(e) =>
                          patchObject({
                            puzzle: {
                              ...object.puzzle!,
                              instruction: e.target.value,
                            },
                          })
                        }
                      />
                    </label>
                    {object.puzzle.pieces.map((piece, i) => (
                      <label key={piece.id}>
                        Element {i + 1}
                        <input
                          maxLength={80}
                          value={piece.label}
                          onChange={(e) =>
                            patchObject({
                              puzzle: {
                                ...object.puzzle!,
                                pieces: object.puzzle!.pieces.map((p, n) =>
                                  n === i ? { ...p, label: e.target.value } : p,
                                ),
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                    {object.puzzle.kind === "sequence" && (
                      <div className="sequence-order-editor">
                        <span>Expected order</span>
                        {object.puzzle.solution?.map((id, i) => (
                          <label key={i}>
                            Position {i + 1}
                            <select
                              value={id}
                              onChange={(e) => {
                                const solution = [...object.puzzle!.solution!],
                                  other = solution.indexOf(e.target.value);
                                [solution[i], solution[other]] = [
                                  solution[other],
                                  solution[i],
                                ];
                                patchObject({
                                  puzzle: { ...object.puzzle!, solution },
                                });
                              }}
                            >
                              {object.puzzle!.pieces.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <label>
                  Object to use here
                  <select
                    value={object.useItem ?? ""}
                    disabled={!!object.puzzle || object.action === "code"}
                    onChange={(e) =>
                      patchObject({
                        useItem: e.target.value || undefined,
                        requires: e.target.value
                          ? [...new Set([...object.requires, e.target.value])]
                          : object.requires,
                      })
                    }
                  >
                    <option value="">None</option>
                    {room.objects
                      .filter((o) => o.id !== object.id && o.itemName)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.itemName}
                        </option>
                      ))}
                  </select>
                </label>
                {object.action === "code" && (
                  <label>
                    Code to find
                    <input
                      value={object.code ?? ""}
                      maxLength={16}
                      onChange={(e) => patchObject({ code: e.target.value })}
                    />
                  </label>
                )}
                {object.choices && (
                  <div className="editor-choices">
                    <h3>Suggested answers</h3>
                    {object.choices.map((c, i) => (
                      <div key={c.id}>
                        <label>
                          Answer {i + 1}
                          <input
                            value={c.label}
                            maxLength={120}
                            onChange={(e) =>
                              patchObject({
                                choices: object.choices!.map((v, n) =>
                                  n === i ? { ...v, label: e.target.value } : v,
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          Consequence
                          <textarea
                            value={c.reply}
                            rows={4}
                            maxLength={1800}
                            onChange={(e) =>
                              patchObject({
                                choices: object.choices!.map((v, n) =>
                                  n === i ? { ...v, reply: e.target.value } : v,
                                ),
                              })
                            }
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                <div className="form-label">To solve before this object</div>
                <div className="dependency-list">
                  {room.objects
                    .filter((o) => o.id !== object.id)
                    .map((o) => (
                      <label key={o.id}>
                        <input
                          type="checkbox"
                          checked={object.requires.includes(o.id)}
                          onChange={(e) =>
                            patchObject({
                              requires: e.target.checked
                                ? [...object.requires, o.id]
                                : object.requires.filter((r) => r !== o.id),
                            })
                          }
                        />
                        {o.name}
                      </label>
                    ))}
                </div>
                <label>
                  What the player discovers
                  <textarea
                    rows={4}
                    maxLength={1800}
                    value={object.message}
                    onChange={(e) => patchObject({ message: e.target.value })}
                  />
                </label>
                <label>
                  Message if the object is locked
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={object.lockedMessage}
                    onChange={(e) =>
                      patchObject({ lockedMessage: e.target.value })
                    }
                  />
                </label>
                <label>
                  On-demand hint
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={object.hint}
                    onChange={(e) => patchObject({ hint: e.target.value })}
                  />
                </label>
                {object.action !== "exit" && (
                  <label>
                    Object added to inventory
                    <input
                      value={object.itemName ?? ""}
                      maxLength={80}
                      placeholder="None"
                      onChange={(e) =>
                        patchObject({ itemName: e.target.value || null })
                      }
                    />
                  </label>
                )}
                <div className="region-tools">
                  <h3>Interactive area</h3>
                  <div className="region-grid">
                    {(["x", "y", "w", "h"] as const).map((key) => (
                      <label key={key}>
                        {
                          {
                            x: "Left",
                            y: "Top",
                            w: "Width",
                            h: "Height",
                          }[key]
                        }{" "}
                        %
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={Math.round(object.region[key] * 1000) / 10}
                          onChange={(e) =>
                            patchObject({
                              region: {
                                ...object.region,
                                [key]: Number(e.target.value) / 100,
                              },
                              mask: undefined,
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    className="button secondary full"
                    onClick={() => {
                      setDrawing(!drawing);
                      setPendingMask(null);
                    }}
                  >
                    <ScanLine size={16} />
                    {drawing ? "Cancel the outline" : "Redraw the region"}
                  </button>
                  <button
                    className="button secondary full"
                    disabled={!metaReady}
                    onClick={segment}
                  >
                    {busy === "segment" ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <Sparkles size={16} />
                    )}
                    Outline with SAM 3.1
                  </button>
                  {pendingMask && (
                    <div className="mask-review">
                      <p>Does this outline suit you?</p>
                      <button
                        className="button primary full"
                        onClick={() => {
                          const proposal = pendingMask;
                          change({
                            ...room,
                            objects: room.objects.map((o) =>
                              o.id === proposal.objectId
                                ? {
                                    ...o,
                                    region: proposal.region,
                                    mask: proposal.mask,
                                  }
                                : o,
                            ),
                          });
                          setNotice("SAM outline kept in the draft.");
                        }}
                      >
                        <Check size={15} />
                        Keep the outline
                      </button>
                      <button
                        className="text-link"
                        onClick={() => setPendingMask(null)}
                      >
                        Keep the previous zone
                      </button>
                    </div>
                  )}
                  {object.mask && (
                    <button
                      className="text-link"
                      onClick={() => patchObject({ mask: undefined })}
                    >
                      Return to a rectangular zone
                    </button>
                  )}
                </div>
                <button
                  className="delete-object"
                  disabled={room.objects.length <= 2}
                  onClick={() => {
                    change({
                      ...room,
                      objects: room.objects
                        .filter((o) => o.id !== object.id)
                        .map((o) => ({
                          ...o,
                          requires: o.requires.filter((r) => r !== object.id),
                        })),
                    });
                    setSelected(
                      room.objects.find((o) => o.id !== object.id)?.id,
                    );
                  }}
                >
                  Delete this object
                </button>
              </fieldset>
            </>
          ) : (
            <p>Select an object in the image.</p>
          )}
        </aside>
      </div>
      {proposal && (
        <Modal
          title="A new adventure awaits you."
          onClose={() => setProposal(null)}
        >
          <p className="modal-intro">
            Muse Spark suggests this scenario. Read it over, then test the puzzles in your studio.
          </p>
          <h3 className="proposal-title">{proposal.title}</h3>
          <p>{proposal.story}</p>
          <ol className="proposal-objects">
            {proposal.objects.map((o) => (
              <li key={o.id}>
                <strong>{o.name}</strong>
                <span>{actionNames[o.action]}</span>
              </li>
            ))}
          </ol>
          <div className="button-row">
            <button
              className="button secondary"
              onClick={() => setProposal(null)}
            >
              Keep my scenario
            </button>
            <button
              className="button primary"
              onClick={() => {
                change(proposal);
                setSelected(proposal.objects[0]?.id);
                setProposal(null);
                setNotice(
                  "Meta scenario applied. Review the clues and start a test playthrough.",
                );
              }}
            >
              Use this suggestion <Check size={16} />
            </button>
          </div>
        </Modal>
      )}
      {publish && (
        <Modal
          title="Publish your adventure in Storyscape"
          onClose={() => !busy && setPublish(false)}
        >
          <p className="modal-intro">
            Your game will be published under the name {viewer.displayName}. You can keep editing your draft without changing the published version. The site's access rules also apply to your games.
          </p>
          <div className="publish-preview">
            <img src={room.image} alt="Publishing preview" />
            <div>
              <h3>{room.title}</h3>
              <span>
                {room.duration} min · {themeName[room.theme]}
              </span>
            </div>
          </div>
          <label className="visibility-choice">
            <input
              type="radio"
              name="visibility"
              checked={visibility === "public"}
              onChange={() => setVisibility("public")}
            />
            <Globe size={20} />
            <span>
              <strong>In the site gallery</strong>
              <small>
                Visible to people who have access to Storyscape.
              </small>
            </span>
          </label>
          <label className="visibility-choice">
            <input
              type="radio"
              name="visibility"
              checked={visibility === "unlisted"}
              onChange={() => setVisibility("unlisted")}
            />
            <Link2 size={20} />
            <span>
              <strong>Accessible via link</strong>
              <small>Share it with whoever you choose.</small>
            </span>
          </label>
          <label className="rights-check">
            <input
              type="checkbox"
              checked={rights}
              onChange={(e) => setRights(e.target.checked)}
            />
            I have the rights to publish this illustration. Its credits will accompany the game.
          </label>
          {!tested && (
            <p className="publish-warning">
              <Play size={17} />
              Complete a test playthrough of this version to publish it.
            </p>
          )}
          <button
            className="button primary full"
            disabled={!!busy || !rights || !tested || dirty}
            onClick={publishGame}
          >
            {busy === "publish" ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Globe size={16} />
            )}
            Publish the adventure
          </button>
          {!tested && (
            <button
              className="button secondary full"
              onClick={() => {
                setPublish(false);
                void testGame();
              }}
            >
              Test my adventure
            </button>
          )}
        </Modal>
      )}
    </div>
  );
}
