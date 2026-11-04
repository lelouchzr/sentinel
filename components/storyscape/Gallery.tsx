"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Sparkles,
  Search,
  Clock,
  Play,
  CircleHelp,
  RotateCcw,
} from "lucide-react";
import { api, errorText, themeName, difficultyName } from "@/lib/client";
import { Loading, Notice, type Card, type Viewer } from "./shared";
import CreationForm from "./CreationForm";
import HowToPlay from "./HowToPlay";
import { Modal } from "./shared";

export default function Gallery({ viewer }: { viewer: Viewer | undefined }) {
  const [rooms, setRooms] = useState<Card[]>([]),
    [query, setQuery] = useState(""),
    [theme, setTheme] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [help, setHelp] = useState(false);
  const load = () => {
    setLoading(true);
    api("gallery")
      .then((r) => {
        setRooms(r.rooms);
        setError("");
      })
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  const filtered = rooms.filter(
    (r) =>
      (!theme || r.theme === theme) &&
      `${r.title} ${r.description} ${r.author}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="gallery page-width">
      <section className="creation-hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-frame" />
            Your imagination, the starting point.
          </div>
          <h1>
            Your image.
            <br />
            <span>Your adventure.</span>
          </h1>
          <p>
            Import your illustration or describe the setting. Turn it into an escape game, with your objects, your puzzles and your story.
          </p>
          <div className="creation-promise">
            <span>Import or imagine.</span>
            <span>Design the puzzles.</span>
            <span>Test and share.</span>
          </div>
          <a href="#gallery" className="button secondary hero-gallery-link">
            <Play size={15} /> Play a story
          </a>
        </div>
        <CreationForm viewer={viewer} />
      </section>
      <section
        id="gallery"
        className="explore-section"
        aria-labelledby="gallery-heading"
      >
        <div className="section-heading">
          <div>
            <p className="section-kicker">The gallery</p>
            <h2 id="gallery-heading">Choose your story.</h2>
            <p className="gallery-intro">
              Places to discover, secrets to uncover, a story to move forward.
            </p>
          </div>
          <div className="gallery-heading-tools">
            <button className="text-link" onClick={() => setHelp(true)}>
              <CircleHelp size={15} />
              How to play
            </button>
            <span className="room-count">
              {rooms.length} adventure{rooms.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="filter-bar">
          <div
            className="theme-tabs"
            role="group"
            aria-label="Filter by theme"
          >
            {[
              ["", "Explore all"],
              ["mystere", "Mystery"],
              ["cosy", "Cozy"],
              ["aventure", "Adventure"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={theme === id ? "selected" : ""}
                aria-pressed={theme === id}
                onClick={() => setTheme(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Search for an adventure"
              placeholder="An adventure, a creator…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        {error ? (
          <>
            <Notice message={error} />
            <button className="button secondary" onClick={load}>
              Try again
            </button>
          </>
        ) : loading ? (
          <Loading />
        ) : (
          <div className="room-grid">
            {filtered.map((room) => (
              <RoomCard key={room.slug} room={room} />
            ))}
            {!filtered.length && (
              <div className="empty-state">
                <Search size={24} />
                <h3>No adventure here for the moment.</h3>
                <p>Try another theme or create the first one.</p>
                <button
                  className="text-link"
                  onClick={() => {
                    setQuery("");
                    setTheme("");
                  }}
                >
                  Reset the search <RotateCcw size={14} />
                </button>
              </div>
            )}
            <a href="/studio" className="create-card">
              <div className="create-orbit">
                <Plus size={30} strokeWidth={1} />
              </div>
              <span className="section-kicker">
                The next one could be yours.
              </span>
              <h3>
                An idea in mind?<br />
                Open your studio.
              </h3>
              <span className="text-link">
                Create my escape game <ArrowUpRight size={17} />
              </span>
            </a>
          </div>
        )}
      </section>
      {help && (
        <Modal title="How to play?" onClose={() => setHelp(false)}>
          <HowToPlay />
          <button
            className="button primary full"
            onClick={() => setHelp(false)}
          >
            Choose a story <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      <section className="creator-strip">
        <span className="large-icon">
          <Sparkles size={24} />
        </span>
        <div>
          <h2>Your image, your game rules.</h2>
          <p>
            Import an illustration, imagine puzzles with Meta and share your adventure.
          </p>
        </div>
        <a href="/studio" className="button secondary">
          Discover the studio <ArrowRight size={17} />
        </a>
      </section>
    </div>
  );
}
function RoomCard({ room }: { room: Card }) {
  return (
    <a
      href={`/play/${room.slug}`}
      className="room-card"
      aria-label={`Play ${room.title}`}
    >
      <div className="room-art">
        <img
          src={room.image}
          alt={`Illustration: ${room.title}`}
          loading="lazy"
        />
        <span className="card-play">
          <Play size={14} /> Play
        </span>
      </div>
      <div className="room-card-meta">
        <span>{themeName[room.theme]}</span>
        <span>
          <Clock size={12} />
          {room.duration} min
        </span>
      </div>
      {room.chapterCount && room.chapterCount > 1 && (
        <p className="card-chapters">
          {room.chapterCount} chapters · {room.interactionCount} interactions · 2 endings
        </p>
      )}
      <h3>{room.title}</h3>
      <p>{room.description}</p>
      <div className="room-card-bottom">
        <span className="creator-initial">{room.author.slice(0, 1)}</span>
        <span>{room.author}</span>
        <span>{difficultyName[room.difficulty]}</span>
      </div>
    </a>
  );
}
