"use client";

import { useEffect, useState } from "react";
import {
  Frame,
  ArrowRight,
  Plus,
  Globe,
  Pencil,
  ExternalLink,
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
  if (!viewer) return <SignIn what="retrouver vos créations" />;
  return (
    <div className="page-width creations-page">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Votre espace</p>
          <h1>Les aventures commencent ici.</h1>
          <p className="muted">
            Vos brouillons restent privés jusqu’à leur publication.
          </p>
        </div>
        <a href="/atelier" className="button primary">
          <Plus size={17} />
          Nouvelle aventure
        </a>
      </div>
      {error && <Notice message={error} />}{" "}
      {!data ? (
        <Loading />
      ) : !data.drafts.length ? (
        <div className="empty-state large">
          <Frame size={34} />
          <h2>Une page blanche. Toutes les possibilités.</h2>
          <p>Commencez avec notre cuisine illustrée ou importez votre image.</p>
          <a className="button primary" href="/atelier">
            Ouvrir mon atelier <ArrowRight size={17} />
          </a>
        </div>
      ) : (
        <div className="draft-grid">
          {data.drafts.map((draft: any) => (
            <article className="draft-card" key={draft.id}>
              <img
                src={draft.room.image}
                alt={`Illustration de ${draft.room.title}`}
              />
              <div className="draft-body">
                <span className="section-kicker">
                  Brouillon privé · version {draft.revision}
                </span>
                <h2>{draft.room.title}</h2>
                <p>{draft.room.description}</p>
                <a
                  className="button secondary small"
                  href={`/atelier/${draft.id}`}
                >
                  <Pencil size={14} />
                  Continuer à créer
                </a>
                {data.publications
                  .filter((p: any) => p.draft_id === draft.id && p.active)
                  .map((p: any) => (
                    <div className="publication-row" key={p.id}>
                      <a href={`/jouer/${p.slug}`}>
                        <Globe size={14} />
                        {p.visibility === "public"
                          ? "Dans la galerie"
                          : "Accessible par lien"}
                        <ExternalLink size={12} />
                      </a>
                      <button
                        disabled={busy === p.id}
                        onClick={() => void unpublish(p.id)}
                      >
                        Retirer
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
