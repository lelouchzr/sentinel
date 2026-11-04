"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Sparkles,
  Search,
  Clock,
  RotateCcw,
} from "lucide-react";
import { api, errorText, themeName, difficultyName } from "@/lib/client";
import { Loading, Notice, type Card, type Viewer } from "./shared";
import CreationForm from "./CreationForm";

export default function Gallery({ viewer }: { viewer: Viewer | undefined }) {
  const [rooms, setRooms] = useState<Card[]>([]),
    [query, setQuery] = useState(""),
    [theme, setTheme] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
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
            Votre imagination, le point de départ.
          </div>
          <h1>
            Votre image.
            <br />
            <span>Votre aventure.</span>
          </h1>
          <p>
            Importez votre illustration ou décrivez le décor. Transformez-le en
            escape game, avec vos objets, vos énigmes et votre histoire.
          </p>
          <div className="creation-promise">
            <span>Importez ou imaginez.</span>
            <span>Composez les énigmes.</span>
            <span>Testez et partagez.</span>
          </div>
          <a href="#galerie" className="text-link hero-gallery-link">
            Explorer les jeux <ArrowRight size={15} />
          </a>
        </div>
        <CreationForm viewer={viewer} />
      </section>
      <section
        id="galerie"
        className="explore-section"
        aria-labelledby="gallery-heading"
      >
        <div className="section-heading">
          <div>
            <p className="section-kicker">La galerie</p>
            <h2 id="gallery-heading">À vous de jouer.</h2>
            <p className="gallery-intro">
              Essayez une aventure avant d’imaginer la vôtre.
            </p>
          </div>
          <span className="room-count">
            {rooms.length} aventure{rooms.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="filter-bar">
          <div
            className="theme-tabs"
            role="group"
            aria-label="Filtrer par thème"
          >
            {[
              ["", "Tout explorer"],
              ["mystere", "Mystère"],
              ["cosy", "Cosy"],
              ["aventure", "Aventure"],
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
              aria-label="Rechercher une aventure"
              placeholder="Une aventure, un créateur…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        {error ? (
          <>
            <Notice message={error} />
            <button className="button secondary" onClick={load}>
              Réessayer
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
                <h3>Aucune aventure ici pour le moment.</h3>
                <p>Essayez un autre thème ou créez la première.</p>
                <button
                  className="text-link"
                  onClick={() => {
                    setQuery("");
                    setTheme("");
                  }}
                >
                  Réinitialiser la recherche <RotateCcw size={14} />
                </button>
              </div>
            )}
            <a href="/atelier" className="create-card">
              <div className="create-orbit">
                <Plus size={30} strokeWidth={1} />
              </div>
              <span className="section-kicker">
                La prochaine pourrait être la vôtre.
              </span>
              <h3>
                Une idée en tête ?<br />
                Ouvrez votre atelier.
              </h3>
              <span className="text-link">
                Créer mon escape game <ArrowUpRight size={17} />
              </span>
            </a>
          </div>
        )}
      </section>
      <section className="creator-strip">
        <span className="large-icon">
          <Sparkles size={24} />
        </span>
        <div>
          <h2>Votre image, vos règles du jeu.</h2>
          <p>
            Importez une illustration, imaginez les énigmes avec Meta et
            partagez votre aventure.
          </p>
        </div>
        <a href="/atelier" className="button secondary">
          Découvrir l’atelier <ArrowRight size={17} />
        </a>
      </section>
    </div>
  );
}
function RoomCard({ room }: { room: Card }) {
  return (
    <a href={`/jouer/${room.slug}`} className="room-card">
      <div className="room-art">
        <img
          src={room.image}
          alt={`Illustration de ${room.title}`}
          loading="lazy"
        />
        <span className="card-play">
          <ArrowUpRight size={23} />
        </span>
      </div>
      <div className="room-card-meta">
        <span>{themeName[room.theme]}</span>
        <span>
          <Clock size={12} />
          {room.duration} min
        </span>
      </div>
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
