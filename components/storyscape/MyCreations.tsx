"use client";

import { useEffect, useState } from "react";
import {
  Frame,
  ArrowRight,
  Plus,
  Globe,
  Pencil,
  ExternalLink,
  Play,
} from "lucide-react";
import { api, errorText } from "@/lib/client";
import { Loading, Notice, SignIn, type Viewer } from "./shared";

export default function MyCreations({
  viewer,
}: {
  viewer: Viewer | undefined;
}) {
  const [data, setData] = useState<any>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState<string>();
  const load = () =>
    api("drafts")
      .then(setData)
      .catch((e) => setError(errorText(e)));
  useEffect(() => {
    if (viewer) void load();
  }, [viewer]);
  async function unpublish(id: string) {
    setBusy(id);
    try {
      await api(`publications/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(undefined);
    }
  }
  if (viewer === undefined) return <Loading />;
  if (!viewer) return <SignIn what="find your creations" />;
  return (
    <div className="page-width creations-page">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Your space</p>
          <h1>Adventures start here.</h1>
          <p className="muted">
            Your drafts stay private until they are published.
          </p>
        </div>
        <a href="/studio" className="button primary">
          <Plus size={17} />
          New Adventure
        </a>
      </div>
      {error && <Notice message={error} />}{" "}
      {!data ? (
        <Loading />
      ) : !data.drafts.length ? (
        <div className="empty-state large">
          <Frame size={34} />
          <h2>A blank page. Every possibility.</h2>
          <p>
            Import your illustration or imagine a setting with a prompt.
          </p>
          <a className="button primary" href="/studio">
            Open my studio <ArrowRight size={17} />
          </a>
        </div>
      ) : (
        <div className="draft-grid">
          {data.drafts.map((draft: any) => (
            <article className="draft-card" key={draft.id}>
              <img
                src={draft.room.image}
                alt={`Illustration: ${draft.room.title}`}
              />
              <div className="draft-body">
                <span className="section-kicker">
                  Private draft · version {draft.revision}
                </span>
                <h2>{draft.room.title}</h2>
                <p>{draft.room.description}</p>
                <div className="draft-actions">
                  <a
                    className="button primary small"
                    href={`/studio/${draft.id}?test=1`}
                  >
                    <Play size={14} />
                    Play privately
                  </a>
                  <a
                    className="button secondary small"
                    href={`/studio/${draft.id}`}
                  >
                    <Pencil size={14} />
                    Keep creating
                  </a>
                </div>
                {data.publications
                  .filter((p: any) => p.draft_id === draft.id && p.active)
                  .map((p: any) => (
                    <div className="publication-row" key={p.id}>
                      <a href={`/play/${p.slug}`}>
                        <Globe size={14} />
                        {p.visibility === "public"
                          ? "In the gallery"
                          : "Available by link"}
                        <ExternalLink size={12} />
                      </a>
                      <button
                        disabled={busy === p.id}
                        onClick={() => void unpublish(p.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
