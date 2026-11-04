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
    [id, setId] = useState(draftId),
    [revision, setRevision] = useState(0),
    [dirty, setDirty] = useState(false),
    [selected, setSelected] = useState<string>(),
    [busy, setBusy] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [brief, setBrief] = useState(
      "Une cuisine cosy, une énigme d’observation et une clé à retrouver. Une aventure courte avec des indices cohérents.",
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
        setSelected(r.room.objects[0]?.id);
        if (r.id) {
          setId(r.id);
          setRevision(r.revision);
          setTested(r.tested === true);
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
    if (!room) throw new Error("Scénario indisponible.");
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
    if (!id) history.replaceState(null, "", `/atelier/${result.id}`);
    return result;
  }
  async function saveButton() {
    setBusy("save");
    setNotice("");
    try {
      await save();
      setNotice("Brouillon enregistré. Votre aventure reste privée.");
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
      setNotice("SAM a proposé un contour. Vérifiez-le avant de le conserver.");
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
        "Charger cette illustration et remplacer les modifications non enregistrées ?",
      )
    )
      return;
    setBusy("template");
    try {
      const result = await api(`templates/${template}`);
      setId(undefined);
      setRevision(0);
      setRoom(result.room);
      setSelected(result.room.objects[0]?.id);
      setDirty(false);
      setTested(false);
      setPublished(undefined);
      history.replaceState(null, "", "/atelier");
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
        throw new Error("Choisissez un PNG de moins de 5 Mo.");
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("Impossible de lire cette image."));
        r.readAsDataURL(file);
      });
      const result = await post("assets", { dataUrl });
      if (room)
        change(
          replaceIllustration(room, {
            image: result.image,
            credits: [
              {
                title: file.name,
                author: viewer?.displayName ?? "Créateur",
                license: "Illustration fournie par le créateur",
                url: "https://frame-escape-atelier.lelouchrz.chatgpt.site",
              },
            ],
            imageProvenance: undefined,
          }),
        );
      setNotice(
        "Illustration importée. Générez un scénario adapté ou ajustez les objets et leurs zones.",
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
          ? "Votre aventure est publiée dans la galerie."
          : "Votre aventure est accessible uniquement avec son lien.",
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
        onBack={() => setTesting(false)}
        onComplete={() => setTested(true)}
      />
    );
  if (loading) return <Loading>Ouverture de votre atelier…</Loading>;
  if (!room)
    return (
      <div className="page-width error-page">
        <Notice message={notice || "Le brouillon n’a pas pu être chargé."} />
        <a className="button secondary" href="/atelier">
          Nouvelle aventure
        </a>
      </div>
    );
  const object = room.objects.find((o) => o.id === selected);
  const shownRoom = pendingMask
    ? {
        ...room,
        objects: room.objects.map((o) =>
          o.id === pendingMask.objectId
            ? { ...o, region: pendingMask.region, mask: pendingMask.mask }
            : o,
        ),
      }
    : room;
  return (
    <div className="editor-shell">
      <div className="editor-heading">
        <div>
          <div className="section-kicker">L’atelier</div>
          <h1>Donnez vie à votre image.</h1>
          <span className="save-status">
            {dirty
              ? "Modifications non enregistrées"
              : id
                ? "Brouillon enregistré"
                : "Votre première aventure"}
            {room.provenance.method === "meta" && (
              <span> · Scénario proposé par Meta</span>
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
            <span>Enregistrer</span>
          </button>
          <button
            className="button secondary"
            disabled={!!busy}
            onClick={testGame}
          >
            <Play size={16} />
            Tester
          </button>
          <button
            className="button primary"
            disabled={!!busy}
            onClick={() => setPublish(true)}
          >
            <Globe size={16} />
            Publier
          </button>
        </div>
      </div>
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      {published && (
        <div className="published-banner">
          <CheckCircle2 size={21} />
          <div>
            <strong>Votre jeu a son adresse.</strong>
            <a href={published}>
              {new URL(published, window.location.origin).href}
            </a>
          </div>
          <button
            className="button secondary small"
            onClick={() => {
              void navigator.clipboard
                .writeText(new URL(published, location.origin).href)
                .then(() => setNotice("Lien copié."))
                .catch(() => setNotice("Copiez le lien affiché ci-dessus."));
            }}
          >
            <Copy size={15} />
            Copier
          </button>
          <a href={published} className="button primary small">
            Jouer <ArrowUpRight size={15} />
          </a>
        </div>
      )}
      <div className="editor-layout">
        <aside className="object-panel">
          <div className="panel-heading">
            <h2>Objets interactifs</h2>
            <span>{room.objects.length}</span>
          </div>
          <div className="object-list">
            {room.objects.map((o, i) => {
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
            disabled={room.objects.length >= 12 || !!busy}
            onClick={() => {
              const objectId = `objet-${crypto.randomUUID().slice(0, 6)}`;
              change({
                ...room,
                objects: [
                  ...room.objects,
                  {
                    id: objectId,
                    name: "Nouvel objet",
                    prompt: "object",
                    action: "inspect",
                    region: { x: 0.4, y: 0.4, w: 0.15, h: 0.15 },
                    requires: [],
                    code: null,
                    itemName: null,
                    message: "Décrivez ce que le joueur découvre.",
                    lockedMessage: "Il manque encore quelque chose.",
                    hint: "Regardez les détails de la pièce.",
                  },
                ],
              });
              setSelected(objectId);
            }}
          >
            <Plus size={15} />
            Ajouter un objet
          </button>
          <div className="object-panel-note">
            <MousePointer2 size={17} />
            <p>
              Sélectionnez un objet pour modifier ses règles et sa zone dans
              l’image.
            </p>
          </div>
          <div className={`test-status ${tested ? "is-tested" : ""}`}>
            <CheckCircle2 size={18} />
            <div>
              <strong>
                {tested
                  ? "Partie de test terminée"
                  : "À tester avant publication"}
              </strong>
              <p>
                {tested
                  ? "Cette version a été jouée jusqu’à la sortie."
                  : "Jouez votre aventure pour vérifier les indices."}
              </p>
            </div>
          </div>
        </aside>
        <div className="editor-center">
          <div className="canvas-bar">
            <span>
              <ImageIcon size={15} />
              L’illustration
            </span>
            <div>
              <button
                className="text-link"
                disabled={!!busy}
                onClick={() => void loadTemplate("kitchen")}
              >
                Cuisine
              </button>
              <button
                className="text-link"
                disabled={!!busy}
                onClick={() => void loadTemplate("japanese")}
              >
                Pièce japonaise
              </button>
              <IllustrationMaker
                room={room}
                disabled={!!busy || !metaReady}
                onApply={(proposal) => {
                  change(replaceIllustration(room, proposal));
                  setNotice(
                    "Illustration Meta appliquée. Adaptez les objets et générez un scénario pour cette nouvelle pièce.",
                  );
                }}
              />
              <button
                className="icon-button"
                disabled={!!busy}
                aria-label="Importer une illustration PNG"
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
              else setNotice("Dessinez une zone un peu plus grande.");
              setDrag(null);
              setBox(null);
              setDrawing(false);
            }}
          >
            <img
              src={room.image}
              alt="Illustration de votre escape game avec les zones interactives"
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
                ? "Tracez la zone de l’objet dans l’image."
                : "Les zones numérotées sont les objets que le joueur peut explorer."}
            </span>
            <span>{room.objects.length} objets</span>
          </div>
          <section className="meta-studio">
            <div className="meta-heading">
              <div className="meta-mark">
                <Sparkles size={19} />
              </div>
              <div>
                <h2>Un coup de pouce à l’imagination.</h2>
                <p>
                  Muse Spark propose l’histoire, les énigmes et leurs liens.
                </p>
              </div>
              <span className={`model-status ${metaReady ? "ready" : ""}`}>
                {metaReady ? "Meta connecté" : "Meta à configurer"}
              </span>
            </div>
            <label className="sr-only" htmlFor="adventure-brief">
              Décrivez l’aventure à générer
            </label>
            <textarea
              id="adventure-brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="L’ambiance, les énigmes, ce que vous imaginez…"
            />
            <div className="meta-bottom">
              <p>Vous gardez le dernier mot sur chaque proposition.</p>
              <button
                className="button primary"
                disabled={!!busy || brief.trim().length < 10 || !metaReady}
                onClick={generate}
              >
                {busy === "generate" ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Sparkles size={16} />
                )}{" "}
                {busy === "generate"
                  ? "Muse Spark imagine…"
                  : "Imaginer avec Meta"}
              </button>
            </div>
          </section>
          <section className="room-settings">
            <h2>Votre aventure</h2>
            <label>
              Titre
              <input
                maxLength={80}
                value={room.title}
                onChange={(e) => change({ ...room, title: e.target.value })}
              />
            </label>
            <label>
              Présentation
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
              Début de l’histoire
              <textarea
                rows={3}
                maxLength={1200}
                value={room.story}
                onChange={(e) => change({ ...room, story: e.target.value })}
              />
            </label>
            <div className="field-row">
              <label>
                Thème
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
                Difficulté
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
                Durée (min)
                <input
                  type="number"
                  min={1}
                  max={60}
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
                <h2>Les règles de l’objet</h2>
                <Pencil size={15} />
              </div>
              <fieldset disabled={!!busy}>
                <label>
                  Nom de l’objet
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
                {object.action === "code" && (
                  <label>
                    Code à trouver
                    <input
                      value={object.code ?? ""}
                      maxLength={16}
                      onChange={(e) => patchObject({ code: e.target.value })}
                    />
                  </label>
                )}
                <div className="form-label">À résoudre avant cet objet</div>
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
                  Ce que le joueur découvre
                  <textarea
                    rows={4}
                    maxLength={800}
                    value={object.message}
                    onChange={(e) => patchObject({ message: e.target.value })}
                  />
                </label>
                <label>
                  Message si l’objet est bloqué
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
                  Indice à la demande
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={object.hint}
                    onChange={(e) => patchObject({ hint: e.target.value })}
                  />
                </label>
                {object.action !== "exit" && (
                  <label>
                    Objet ajouté à l’inventaire
                    <input
                      value={object.itemName ?? ""}
                      maxLength={80}
                      placeholder="Aucun"
                      onChange={(e) =>
                        patchObject({ itemName: e.target.value || null })
                      }
                    />
                  </label>
                )}
                <div className="region-tools">
                  <h3>Zone interactive</h3>
                  <div className="region-grid">
                    {(["x", "y", "w", "h"] as const).map((key) => (
                      <label key={key}>
                        {
                          {
                            x: "Gauche",
                            y: "Haut",
                            w: "Largeur",
                            h: "Hauteur",
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
                    {drawing ? "Annuler le tracé" : "Redessiner la zone"}
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
                    Détourer avec SAM 3.1
                  </button>
                  {pendingMask && (
                    <div className="mask-review">
                      <p>Le contour vous convient ?</p>
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
                          setNotice("Contour SAM conservé dans le brouillon.");
                        }}
                      >
                        <Check size={15} />
                        Conserver le contour
                      </button>
                      <button
                        className="text-link"
                        onClick={() => setPendingMask(null)}
                      >
                        Garder la zone précédente
                      </button>
                    </div>
                  )}
                  {object.mask && (
                    <button
                      className="text-link"
                      onClick={() => patchObject({ mask: undefined })}
                    >
                      Revenir à une zone rectangulaire
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
                  Supprimer cet objet
                </button>
              </fieldset>
            </>
          ) : (
            <p>Sélectionnez un objet dans l’image.</p>
          )}
        </aside>
      </div>
      {proposal && (
        <Modal
          title="Une nouvelle aventure vous attend."
          onClose={() => setProposal(null)}
        >
          <p className="modal-intro">
            Muse Spark propose ce scénario. Relisez-le, puis testez les énigmes
            dans votre atelier.
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
              Garder mon scénario
            </button>
            <button
              className="button primary"
              onClick={() => {
                change(proposal);
                setSelected(proposal.objects[0]?.id);
                setProposal(null);
                setNotice(
                  "Scénario Meta appliqué. Relisez les indices et lancez une partie de test.",
                );
              }}
            >
              Utiliser cette proposition <Check size={16} />
            </button>
          </div>
        </Modal>
      )}
      {publish && (
        <Modal
          title="Ouvrez la porte aux autres."
          onClose={() => !busy && setPublish(false)}
        >
          <p className="modal-intro">
            Votre jeu sera publié sous le nom {viewer.displayName}. Vous pourrez
            continuer à modifier votre brouillon sans changer la version
            publiée.
          </p>
          <div className="publish-preview">
            <img src={room.image} alt="Aperçu de la publication" />
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
              <strong>Dans la galerie publique</strong>
              <small>Les joueurs peuvent découvrir votre aventure.</small>
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
              <strong>Accessible par lien</strong>
              <small>Partagez-la avec les personnes de votre choix.</small>
            </span>
          </label>
          <label className="rights-check">
            <input
              type="checkbox"
              checked={rights}
              onChange={(e) => setRights(e.target.checked)}
            />
            Je dispose des droits pour publier cette illustration. Ses crédits
            accompagneront le jeu.
          </label>
          {!tested && (
            <p className="publish-warning">
              <Play size={17} />
              Terminez une partie de test de cette version pour pouvoir la
              publier.
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
            Publier l’aventure
          </button>
          {!tested && (
            <button
              className="button secondary full"
              onClick={() => {
                setPublish(false);
                void testGame();
              }}
            >
              Tester mon aventure
            </button>
          )}
        </Modal>
      )}
    </div>
  );
}
