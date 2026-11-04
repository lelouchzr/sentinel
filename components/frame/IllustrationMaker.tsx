"use client";

import { useState } from "react";
import {
  Sparkles,
  LoaderCircle,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import type { Room } from "@/lib/game";
import { post, errorText } from "@/lib/client";
import { Modal, Notice } from "./shared";

type ImageProposal = {
  image: string;
  imageProvenance: Room["imageProvenance"];
  credits: Room["credits"];
};
export default function IllustrationMaker({
  room,
  onApply,
  disabled,
}: {
  room: Room;
  onApply: (proposal: ImageProposal) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false),
    [brief, setBrief] = useState(
      "Une petite bibliothèque mystérieuse au crépuscule, avec une horloge, un coffre, un bureau, une lampe et une porte. Illustration chaleureuse et détails bien lisibles.",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [proposal, setProposal] = useState<ImageProposal | null>(null);
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const result = await post("meta/image", { room, brief });
      setProposal({
        image: result.image,
        imageProvenance: result.imageProvenance,
        credits: result.credits,
      });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="text-link"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Sparkles size={12} />
        Muse Image
      </button>
      {open && (
        <Modal
          title="Imaginez le décor."
          onClose={() => !busy && setOpen(false)}
        >
          <p className="modal-intro">
            Muse Image crée une illustration originale. Votre scène actuelle
            reste intacte jusqu’à votre choix.
          </p>
          {error && <Notice message={error} />}
          <label>
            Décrivez la pièce
            <textarea
              rows={4}
              value={brief}
              maxLength={2000}
              onChange={(e) => setBrief(e.target.value)}
              disabled={busy}
            />
          </label>
          <button
            className="button secondary full image-generate"
            onClick={generate}
            disabled={busy || brief.trim().length < 10}
          >
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Sparkles size={16} />
            )}{" "}
            {busy ? "Muse Image dessine…" : "Créer l’illustration"}
          </button>
          {proposal && (
            <>
              <img
                className="image-proposal"
                src={proposal.image}
                alt="Illustration proposée par Muse Image"
              />
              <p className="modal-intro">
                Après avoir choisi ce décor, adaptez les objets ou demandez un
                nouveau scénario à Muse Spark.
              </p>
              <button
                className="button primary full"
                onClick={() => {
                  onApply(proposal);
                  setOpen(false);
                  setProposal(null);
                }}
              >
                <Check size={16} />
                Utiliser cette illustration
              </button>
            </>
          )}
          {!proposal && !busy && (
            <div className="image-placeholder">
              <ImageIcon size={27} />
              <span>Votre prochain univers commence ici.</span>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
