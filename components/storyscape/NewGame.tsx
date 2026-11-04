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
      "A story in several acts with characters, secrets to uncover, objects to manipulate and use, clues to cross-check and a final choice leading to two different endings.",
    ),
    [returnTo, setReturnTo] = useState("/studio"),
    [format, setFormat] = useState<"long" | "short">("long");
  const started = useRef<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("creation");
    setReturnTo(
      id ? `/studio?creation=${encodeURIComponent(id)}` : "/studio",
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
            "This creation did not succeed. You can try again or choose another starting point.",
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
            "Your illustration is no longer available. Choose the file again.",
          );
        const dataUrl = await prepareIllustration(record.file);
        const result = await post("assets", { dataUrl });
        next = {
          title: "New Adventure",
          image: result.image,
          credits: [
            {
              title:
                (record.filename ?? "Imported illustration")
                  .trim()
                  .slice(0, 150) || "Imported illustration",
              author: "Source imported by the creator",
              license: "Illustration provided by the creator",
              url: "https://frame-escape-atelier.lelouchrz.chatgpt.site",
            },
          ],
        };
      } else {
        if (!record.prompt)
          throw new Error(
            "Your description is empty. Enter a new prompt.",
          );
        const result = await post("meta/image", { brief: record.prompt });
        next = {
          title: "New Adventure",
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
      window.location.assign(`/studio/${result.id}`);
    } catch (e) {
      setError(errorText(e));
      setBusy("");
    }
  }

  if (viewer === undefined || loading)
    return <Loading>Opening your creation…</Loading>;
  if (!viewer) return <SignIn returnTo={returnTo} />;
  return (
    <div className="new-game page-width">
      <a href="/" className="text-link">
        <ArrowLeft size={15} />
        Back to home
      </a>
      <div className="new-game-heading">
        <div className="section-kicker">A new adventure</div>
        <h1>
          {scene
            ? "Your world comes to life."
            : "How does your story begin?"}
        </h1>
        <p>
          {scene
            ? "Now design the puzzles that will bring this image to life."
            : "Start from your illustration or create the setting you have in mind."}
        </p>
      </div>
      <ol className="creation-steps" aria-label="Creation steps">
        <li className={scene ? "done" : "current"}>
          <span>{scene ? <Check size={13} /> : "1"}</span>Your illustration
        </li>
        <li className={scene && !proposal ? "current" : proposal ? "done" : ""}>
          <span>{proposal ? <Check size={13} /> : "2"}</span>The puzzles
        </li>
        <li>
          <span>3</span>Your studio
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
              ? "Your setting is taking shape."
              : "Your illustration is arriving in the studio."}
          </h2>
          <p>
            {intent?.kind === "generate"
              ? "Muse Image composes the room from your prompt."
              : "We are preparing your image and keeping it in your private space."}
          </p>
          <LoaderCircle className="spin" size={21} />
        </div>
      ) : scene ? (
        <div className="new-game-layout">
          <div className="new-game-art">
            <div className="new-art-label">
              <ImageIcon size={16} />
              <span>Your illustration</span>
              <a href="/studio" className="text-link">
                Change image
              </a>
            </div>
            <img
              src={scene.image}
              alt="Your illustration for the new escape game"
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
                Setting created with Muse Image
              </p>
            )}
          </div>
          <section className="scenario-setup">
            {proposal ? (
              <>
                <div className="proposal-ready">
                  <Check size={16} />
                  {proposal.provenance.method === "meta"
                    ? "Scenario suggested by Muse Spark"
                    : "Manual creation base"}
                </div>
                <h2>{proposal.title}</h2>
                <p className="proposal-scope">
                  {proposal.chapters
                    ? `${proposal.chapters.length} acts · `
                    : ""}
                  {proposal.objects.length} objects ·{" "}
                  {proposal.objects.filter((o) => o.puzzle).length}{" "}
                  hands-on puzzles · {proposal.duration} estimated min
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
                    ? "You can adjust the objects, clues and zones in the studio before testing your game."
                    : "Place the first two zones on your image, then write your clues and add your objects in the studio."}
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
                  Open my game in the studio
                  <ArrowRight size={17} />
                </button>
                <button
                  className="text-link"
                  disabled={!!busy}
                  onClick={() => setProposal(null)}
                >
                  <RotateCcw size={14} />
                  Review my brief
                </button>
              </>
            ) : (
              <>
                <span className="large-icon">
                  <Sparkles size={22} />
                </span>
                <h2>What is happening in this room?</h2>
                <p>
                  Describe the mood and the puzzles. Muse Spark uses your illustration to suggest the game.
                </p>
                <fieldset className="story-format">
                  <legend>The size of your adventure</legend>
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
                      <strong>Long interactive story</strong>
                      <small>
                        3 to 4 acts in your illustration · hands-on puzzles · 2 endings
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
                      <strong>A short escape</strong>
                      <small>One room · 4 to 8 objects · one exit</small>
                    </span>
                  </label>
                </fieldset>
                <label htmlFor="new-game-brief">
                  The adventure you imagine
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
                    ? "Muse Spark is writing and connecting the acts…"
                    : "Imagine my game"}
                  <ArrowRight size={16} />
                </button>
                {busy === "scenario" && (
                  <p className="generation-patience" role="status">
                    Meta writes the acts, connects the clues and prepares the manipulations. A long story can take several minutes. Keep this page open.
                  </p>
                )}
                <p className="scenario-review-note">
                  You review the suggestion before creating the draft. Your image and its credits are kept.
                </p>
                <button
                  className="text-link"
                  disabled={!!busy}
                  onClick={() => {
                    setError("");
                    setProposal(manualRoom(scene));
                  }}
                >
                  <Pencil size={14} /> Compose the puzzles myself
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
            Try again
          </button>
          <a href="/studio" className="button secondary">
            Choose another starting point
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
