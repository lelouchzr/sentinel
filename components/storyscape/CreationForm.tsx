"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Upload,
  ImagePlus,
  Sparkles,
  X,
  LoaderCircle,
  Check,
} from "lucide-react";
import {
  checkIllustration,
  putCreation,
  type CreationIntent,
} from "@/lib/creation";
import { errorText } from "@/lib/client";
import { Notice, type Viewer } from "./shared";

export default function CreationForm({
  viewer,
}: {
  viewer: Viewer | undefined;
}) {
  const [mode, setMode] = useState<"import" | "generate">("import"),
    [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [prompt, setPrompt] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [drag, setDrag] = useState(false);
  const picker = useRef<HTMLInputElement>(null),
    importTab = useRef<HTMLButtonElement>(null),
    generateTab = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function selectFile(next?: File) {
    if (!next) return;
    try {
      checkIllustration(next);
      setFile(next);
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function begin() {
    if (busy || viewer === undefined) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "import" && !file)
        throw new Error("Choisissez votre illustration.");
      if (mode === "generate" && prompt.trim().length < 10)
        throw new Error("Décrivez votre décor en au moins 10 caractères.");
      const intent: CreationIntent = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        kind: mode,
        phase: "requested",
        ...(mode === "import"
          ? { file: file!, filename: file!.name }
          : { prompt: prompt.trim() }),
      };
      await putCreation(intent);
      const destination = `/atelier?creation=${intent.id}`;
      window.location.assign(
        viewer
          ? destination
          : `/signin-with-chatgpt?return_to=${encodeURIComponent(destination)}`,
      );
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }
  return (
    <div className="creation-form">
      <div
        className="creation-tabs"
        role="tablist"
        aria-label="Choisir le point de départ"
        onKeyDown={(e) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
            return;
          e.preventDefault();
          const next =
            e.key === "Home"
              ? "import"
              : e.key === "End"
                ? "generate"
                : mode === "import"
                  ? "generate"
                  : "import";
          setMode(next);
          (next === "import" ? importTab : generateTab).current?.focus();
        }}
      >
        <button
          ref={importTab}
          id="import-tab"
          role="tab"
          aria-selected={mode === "import"}
          aria-controls="creation-panel"
          tabIndex={mode === "import" ? 0 : -1}
          className={mode === "import" ? "selected" : ""}
          onClick={() => {
            setMode("import");
            setError("");
          }}
        >
          <Upload size={16} />
          Importer une image
        </button>
        <button
          ref={generateTab}
          id="generate-tab"
          role="tab"
          aria-selected={mode === "generate"}
          aria-controls="creation-panel"
          tabIndex={mode === "generate" ? 0 : -1}
          className={mode === "generate" ? "selected" : ""}
          onClick={() => {
            setMode("generate");
            setError("");
          }}
        >
          <Sparkles size={16} />
          Partir d’un prompt
        </button>
      </div>
      <div
        id="creation-panel"
        className="creation-panel"
        role="tabpanel"
        aria-labelledby={mode === "import" ? "import-tab" : "generate-tab"}
      >
        {error && <Notice message={error} />}
        {mode === "import" ? (
          <>
            <div
              className={`creation-dropzone ${drag ? "is-dragging" : ""} ${file ? "has-file" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                if (e.dataTransfer.files.length !== 1) {
                  setError("Déposez une seule illustration pour commencer.");
                  return;
                }
                selectFile(e.dataTransfer.files[0]);
              }}
            >
              <input
                ref={picker}
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Choisir mon illustration"
                onChange={(e) => {
                  selectFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {file ? (
                <div className="selected-illustration">
                  <img src={preview} alt="Votre illustration sélectionnée" />
                  <div>
                    <span className="selected-file-name">
                      <Check size={15} />
                      {file.name}
                    </span>
                    <small>Votre point de départ est prêt.</small>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Retirer l’illustration sélectionnée"
                    onClick={() => setFile(null)}
                  >
                    <X size={17} />
                  </button>
                </div>
              ) : (
                <button
                  className="dropzone-pick"
                  onClick={() => picker.current?.click()}
                >
                  <span className="upload-frame">
                    <ImagePlus size={31} strokeWidth={1.25} />
                  </span>
                  <strong>Tout commence par votre image.</strong>
                  <span>
                    Glissez votre illustration ici
                    <br />
                    ou choisissez un fichier.
                  </span>
                  <span className="choose-file-label">
                    Choisir mon illustration <ArrowRight size={14} />
                  </span>
                </button>
              )}
            </div>
            <div className="creation-format">
              <span>PNG, JPG ou WebP</span>
              <span>Jusqu’à 10 Mo</span>
            </div>
            {file && (
              <button
                className="text-link replace-file"
                onClick={() => picker.current?.click()}
              >
                Choisir une autre image
              </button>
            )}
          </>
        ) : (
          <div className="prompt-creation">
            <div className="prompt-intro">
              <span className="prompt-symbol">
                <Sparkles size={24} />
              </span>
              <h2>Quel univers imaginez-vous ?</h2>
              <p>
                Décrivez la pièce et les objets. Muse Image crée le décor de
                votre jeu.
              </p>
            </div>
            <label htmlFor="creation-prompt" className="sr-only">
              Décrivez votre illustration
            </label>
            <textarea
              id="creation-prompt"
              value={prompt}
              maxLength={2000}
              rows={5}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Une bibliothèque au crépuscule, un bureau couvert de livres, une horloge et une porte dérobée…"
            />
            <div className="prompt-suggestions">
              <span>Une idée pour commencer :</span>
              {[
                [
                  "Bibliothèque",
                  "Une bibliothèque chaleureuse au crépuscule avec un bureau, une horloge, un coffre et une porte en bois.",
                ],
                [
                  "Cabane",
                  "Une cabane au bord d’un lac avec une vieille carte, une lanterne, un coffre et une porte donnant sur la forêt.",
                ],
                [
                  "Observatoire",
                  "Un observatoire abandonné avec un télescope, une armoire, une horloge et une porte métallique.",
                ],
              ].map(([name, text]) => (
                <button key={name} onClick={() => setPrompt(text)}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          className="button primary creation-submit"
          disabled={
            busy ||
            viewer === undefined ||
            (mode === "import" ? !file : prompt.trim().length < 10)
          }
          onClick={begin}
        >
          {busy ? (
            <LoaderCircle className="spin" size={16} />
          ) : mode === "import" ? (
            <Upload size={16} />
          ) : (
            <Sparkles size={16} />
          )}{" "}
          {busy
            ? "Préparation…"
            : mode === "import"
              ? "Créer avec mon illustration"
              : "Générer mon illustration"}
          <ArrowRight size={16} />
        </button>
        <p className="creation-next">
          Ensuite, composez les énigmes, testez votre jeu et partagez-le.
        </p>
      </div>
    </div>
  );
}
