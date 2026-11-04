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
      "A small mysterious library at dusk, with a clock, a chest, a desk, a lamp and a door. Warm illustration with clearly readable details.",
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
          title="Imagine the setting."
          onClose={() => !busy && setOpen(false)}
        >
          <p className="modal-intro">
            Muse Image creates an original illustration. Your current scene stays intact until you choose.
          </p>
          {error && <Notice message={error} />}
          <label>
            Describe the room
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
            {busy ? "Muse Image is drawing…" : "Create the illustration"}
          </button>
          {proposal && (
            <>
              <img
                className="image-proposal"
                src={proposal.image}
                alt="Illustration suggested by Muse Image"
              />
              <p className="modal-intro">
                After choosing this setting, adapt the objects or ask Muse Spark for a new scenario.
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
                Use this illustration
              </button>
            </>
          )}
          {!proposal && !busy && (
            <div className="image-placeholder">
              <ImageIcon size={27} />
              <span>Your next world starts here.</span>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
