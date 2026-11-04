"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  LoaderCircle,
  Check,
  Image as ImageIcon,
  Pencil,
  RotateCcw,
} from "lucide-react";
import type { Room, Scene } from "@/lib/game";
import { manualRoom } from "@/lib/game";
import {
  getCreation,
  putCreation,
  removeCreation,
  prepareIllustration,
  type CreationIntent,
} from "@/lib/creation";
import { post, errorText } from "@/lib/client";
import { Loading, Notice, SignIn, actionNames, type Viewer } from "./shared";
import CreationForm from "./CreationForm";

export default function NewGame({ viewer }: { viewer: Viewer | undefined }) {
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState<"image" | "scenario" | "save" | "">(""),
    [error, setError] = useState(""),
    [scene, setScene] = useState<Scene | null>(null),
    [intent, setIntent] = useState<CreationIntent | null>(null),
    [proposal, setProposal] = useState<Room | null>(null),
    [brief, setBrief] = useState(
      "Une histoire en plusieurs actes avec des personnages, des secrets à éclaircir, des objets à manipuler et à utiliser, des indices à recouper et un choix final qui donne deux conclusions différentes.",
    ),
    [returnTo, setReturnTo] = useState("/atelier"),
    [format, setFormat] = useState<"long" | "short">("long");
  const started = useRef<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("creation");
    setReturnTo(
      id ? `/atelier?creation=${encodeURIComponent(id)}` : "/atelier",
    );
    if (viewer === undefined) return;
    if (!viewer || !id) {
      setLoading(false);
      return;
    }
    if (started.current === id) return;
    let mounted = true;
    getCreation(id)
      .then((record) => {
        if (!mounted) return;
        started.current = id;
        setIntent(record);
        if (record.phase === "ready" && record.scene) {
          setScene(record.scene);
          if (record.brief) setBrief(record.brief);
          if (record.format) setFormat(record.format);
          if (record.proposal) setProposal(record.proposal);
          setLoading(false);
        } else if (record.phase === "working" || record.phase === "failed") {
          setError(
            "Cette création n’a pas abouti. Vous pouvez réessayer ou choisir un autre point de départ.",
          );
          setLoading(false);
        } else void prepare(record);
      })
      .catch((e) => {
        if (mounted) {
          setError(errorText(e));
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [viewer]);
  // Preserve the paid proposal as well as its illustration across a reload.
  useEffect(() => {
    if (intent?.phase !== "ready" || !scene) return;
    const timeout = window.setTimeout(() => {
      void putCreation({
        ...intent,
        brief,
        format,
        proposal: proposal ?? undefined,
      }).catch(() => {});
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [brief, format, proposal, intent, scene]);

  async function prepare(record: CreationIntent) {
    setLoading(false);
    setBusy("image");
    setError("");
    try {
      await putCreation({ ...record, phase: "working" });
      let next: Scene;
      if (record.kind === "import") {
        if (!record.file)
          throw new Error(
            "Votre illustration n’est plus disponible. Choisissez à nouveau le fichier.",
          );
        const dataUrl = await prepareIllustration(record.file);
        const result = await post("assets", { dataUrl });
        next = {
          title: "Nouvelle aventure",
          image: result.image,
          credits: [
            {
              title:
                (record.filename ?? "Illustration importée")
                  .trim()
                  .slice(0, 150) || "Illustration importée",
              author: "Source importée par le créateur",
              license: "Illustration fournie par le créateur",
              url: "https://frame-escape-atelier.lelouchrz.chatgpt.site",
            },
          ],
        };
      } else {
        if (!record.prompt)
          throw new Error(
            "Votre description est vide. Saisissez un nouveau prompt.",
          );
        const result = await post("meta/image", { brief: record.prompt });
        next = {
          title: "Nouvelle aventure",
          image: result.image,
          credits: result.credits,
          imageProvenance: result.imageProvenance,
        };
      }
      const ready: CreationIntent = {
        ...record,
        phase: "ready",
        scene: next,
        file: undefined,
      };
      await putCreation(ready);
      setIntent(ready);
      setScene(next);
    } catch (e) {
      setError(errorText(e));
      setIntent({ ...record, phase: "failed" });
      await putCreation({ ...record, phase: "failed" }).catch(() => {});
    } finally {
      setBusy("");
    }
  }
  async function generateScenario() {
    if (!scene) return;
    setBusy("scenario");
    setError("");
    try {
      const result = await post("meta/generate", { scene, brief, format });
      setProposal(result.room);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  }
  async function openEditor() {
    if (!proposal) return;
    setBusy("save");
    setError("");
    try {
      const result = await post("drafts", { room: proposal });
      if (intent) await removeCreation(intent.id).catch(() => {});
      window.location.assign(`/atelier/${result.id}`);
    } catch (e) {
      setError(errorText(e));
      setBusy("");
    }
  }

  if (viewer === undefined || loading)
    return <Loading>Ouverture de votre création…</Loading>;
  if (!viewer) return <SignIn returnTo={returnTo} />;
  return (
    <div className="new-game page-width">
      <a href="/" className="text-link">
        <ArrowLeft size={15} />
        Retour à l’accueil
      </a>
      <div className="new-game-heading">
        <div className="section-kicker">Une nouvelle aventure</div>
        <h1>
          {scene
            ? "Votre univers prend vie."
            : "Comment commence votre histoire ?"}
        </h1>
        <p>
          {scene
            ? "Composez maintenant les énigmes qui feront vivre cette image."
            : "Partez de votre illustration ou créez le décor que vous avez en tête."}
        </p>
      </div>
      <ol className="creation-steps" aria-label="Étapes de création">
        <li className={scene ? "done" : "current"}>
          <span>{scene ? <Check size={13} /> : "1"}</span>Votre illustration
        </li>
        <li className={scene && !proposal ? "current" : proposal ? "done" : ""}>
          <span>{proposal ? <Check size={13} /> : "2"}</span>Les énigmes
        </li>
        <li>
          <span>3</span>Votre atelier
        </li>
      </ol>
      {error && <Notice message={error} />}
      {busy === "image" ? (
        <div className="creation-working" role="status">
          <span className="working-frame">
            {intent?.kind === "generate" ? (
              <Sparkles size={30} />
            ) : (
              <ImageIcon size={30} />
            )}
          </span>
          <h2>
            {intent?.kind === "generate"
              ? "Votre décor prend forme."
              : "Votre illustration arrive dans l’atelier."}
          </h2>
          <p>
            {intent?.kind === "generate"
              ? "Muse Image compose la pièce à partir de votre prompt."
              : "Nous préparons votre image et la conservons dans votre espace privé."}
          </p>
          <LoaderCircle className="spin" size={21} />
        </div>
      ) : scene ? (
        <div className="new-game-layout">
          <div className="new-game-art">
            <div className="new-art-label">
              <ImageIcon size={16} />
              <span>Votre illustration</span>
              <a href="/atelier" className="text-link">
                Changer d’image
              </a>
            </div>
            <img
              src={scene.image}
              alt="Votre illustration pour le nouvel escape game"
            />
            <div className="art-credit">
              {scene.credits.map((c) => (
                <span key={c.url}>
                  {c.author} · {c.license}
                </span>
              ))}
            </div>
            {intent?.kind === "generate" && (
              <p className="scene-origin">
                <Sparkles size={13} />
                Décor créé avec Muse Image
              </p>
            )}
          </div>
          <section className="scenario-setup">
            {proposal ? (
              <>
                <div className="proposal-ready">
                  <Check size={16} />
                  {proposal.provenance.method === "meta"
                    ? "Scénario proposé par Muse Spark"
                    : "Base de création manuelle"}
                </div>
                <h2>{proposal.title}</h2>
                <p className="proposal-scope">
                  {proposal.chapters
                    ? `${proposal.chapters.length} actes · `
                    : ""}
                  {proposal.objects.length} objets ·{" "}
                  {proposal.objects.filter((o) => o.puzzle).length}{" "}
                  manipulations · {proposal.duration} min estimées
                </p>
                <p className="scenario-story">{proposal.story}</p>
                <ol className="proposal-objects">
                  {proposal.objects.map((o) => (
                    <li key={o.id}>
                      <strong>{o.name}</strong>
                      <span>{actionNames[o.action]}</span>
                    </li>
                  ))}
                </ol>
                <p className="scenario-review-note">
                  {proposal.provenance.method === "meta"
                    ? "Vous pourrez ajuster les objets, les indices et les zones dans l’atelier avant de tester votre jeu."
                    : "Placez les deux premières zones sur votre image, puis écrivez vos indices et ajoutez vos objets dans l’atelier."}
                </p>
                <button
                  className="button primary full"
                  disabled={!!busy}
                  onClick={openEditor}
                >
                  {busy === "save" ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <Pencil size={17} />
                  )}
                  Ouvrir mon jeu dans l’atelier
                  <ArrowRight size={17} />
                </button>
                <button
                  className="text-link"
                  disabled={!!busy}
                  onClick={() => setProposal(null)}
                >
                  <RotateCcw size={14} />
                  Revoir mon brief
                </button>
              </>
            ) : (
              <>
                <span className="large-icon">
                  <Sparkles size={22} />
                </span>
                <h2>Que se passe-t-il dans cette pièce ?</h2>
                <p>
                  Décrivez l’ambiance et les énigmes. Muse Spark s’appuie sur
                  votre illustration pour proposer le jeu.
                </p>
                <fieldset className="story-format">
                  <legend>La taille de votre aventure</legend>
                  <label>
                    <input
                      type="radio"
                      name="story-format"
                      value="long"
                      checked={format === "long"}
                      disabled={!!busy}
                      onChange={() => setFormat("long")}
                    />
                    <span>
                      <strong>Histoire longue et interactive</strong>
                      <small>
                        3 à 4 actes dans votre illustration · manipulations · 2
                        conclusions
                      </small>
                    </span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="story-format"
                      value="short"
                      checked={format === "short"}
                      disabled={!!busy}
                      onChange={() => setFormat("short")}
                    />
                    <span>
                      <strong>Une courte échappée</strong>
                      <small>Une pièce · 4 à 8 objets · une sortie</small>
                    </span>
                  </label>
                </fieldset>
                <label htmlFor="new-game-brief">
                  L’aventure que vous imaginez
                  <textarea
                    id="new-game-brief"
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    maxLength={2000}
                    rows={5}
                    disabled={!!busy}
                  />
                </label>
                <button
                  className="button primary full"
                  disabled={!!busy || brief.trim().length < 10}
                  onClick={generateScenario}
                >
                  {busy === "scenario" ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Sparkles size={16} />
                  )}{" "}
                  {busy === "scenario"
                    ? "Muse Spark écrit et relie les actes…"
                    : "Imaginer mon jeu"}
                  <ArrowRight size={16} />
                </button>
                {busy === "scenario" && (
                  <p className="generation-patience" role="status">
                    Meta écrit les actes, relie les indices et prépare les
                    manipulations. Une histoire longue peut prendre plusieurs
                    minutes. Gardez cette page ouverte.
                  </p>
                )}
                <p className="scenario-review-note">
                  Vous relisez la proposition avant de créer le brouillon. Votre
                  image et ses crédits sont conservés.
                </p>
                <button
                  className="text-link"
                  disabled={!!busy}
                  onClick={() => {
                    setError("");
                    setProposal(manualRoom(scene));
                  }}
                >
                  <Pencil size={14} /> Composer les énigmes moi-même
                </button>
              </>
            )}
          </section>
        </div>
      ) : intent && error ? (
        <div className="creation-retry">
          <button
            className="button primary"
            onClick={() => void prepare({ ...intent, phase: "requested" })}
          >
            <RotateCcw size={16} />
            Réessayer
          </button>
          <a href="/atelier" className="button secondary">
            Choisir un autre point de départ
          </a>
        </div>
      ) : (
        <div className="new-game-start">
          <CreationForm viewer={viewer} />
        </div>
      )}
    </div>
  );
}
