"use client";

import { useEffect, useState } from "react";
import { BookOpen, ArrowUpRight, Plus, Sparkles } from "lucide-react";
import { api } from "@/lib/client";
import { type Viewer, type Props } from "./shared";
import Gallery from "./Gallery";
import Player from "./Player";
import Editor from "./Editor";
import NewGame from "./NewGame";
import MyCreations from "./MyCreations";

export default function StoryscapeApp({ view, slug, draftId }: Props) {
  const [viewer, setViewer] = useState<Viewer | undefined>();
  useEffect(() => {
    let mounted = true;
    api("me")
      .then((r) => {
        if (mounted) setViewer(r.user);
      })
      .catch(() => {
        if (mounted) setViewer(null);
      });
    return () => {
      mounted = false;
    };
  }, []);
  return (
    <div className={`app view-${view}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Storyscape, home">
          <BookOpen size={25} strokeWidth={1.7} />
          <span>Storyscape</span>
        </a>
        <nav aria-label="Main navigation">
          <a className={view === "gallery" ? "active" : ""} href="/">
            Create
          </a>
          <a className={view === "player" ? "active" : ""} href="/#gallery">
            Play
          </a>
          <a className={view === "editor" ? "active" : ""} href="/studio">
            The Studio
          </a>
          <a className={view === "mine" ? "active" : ""} href="/my-creations">
            My creations
          </a>
        </nav>
        <div className="header-end">
          {viewer ? (
            <a
              className="avatar"
              href="/my-creations"
              aria-label={`Creations by ${viewer.displayName}`}
            >
              {viewer.displayName.slice(0, 1).toUpperCase()}
            </a>
          ) : (
            <a
              className="login-link"
              href="/signin-with-chatgpt?return_to=/studio"
              target="_top"
            >
              Sign in <ArrowUpRight size={15} />
            </a>
          )}
          <a className="button small primary create-nav" href="/studio">
            <Plus size={16} />
            Create a game
          </a>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {view === "gallery" ? (
          <Gallery viewer={viewer} />
        ) : view === "player" ? (
          <Player slug={slug} />
        ) : view === "editor" ? (
          draftId ? (
            <Editor viewer={viewer} draftId={draftId} />
          ) : (
            <NewGame viewer={viewer} />
          )
        ) : (
          <MyCreations viewer={viewer} />
        )}
      </main>
      {view !== "player" && (
        <footer className="site-footer">
          <span>
            Storyscape <span className="muted">/</span> Images to explore.
          </span>
          <span>
            Creation with Meta models <Sparkles size={13} />
          </span>
          <a href="/scenes/sources.json" target="_blank" rel="noreferrer">
            Illustration credits <ArrowUpRight size={12} />
          </a>
        </footer>
      )}
    </div>
  );
}
