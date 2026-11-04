"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Sparkles,
  Search,
  Clock,
  MousePointer2,
  Play,
  RotateCcw,
} from "lucide-react";
import { api, errorText, themeName, difficultyName } from "@/lib/client";
import { Loading, Notice, type Card } from "./shared";

export default function Gallery() {
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
      <section className="gallery-hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-frame" />
            L’imagination a une porte d’entrée.
          </div>
          <h1>
            Une image.
            <br />
            <span>Une aventure.</span>
          </h1>
          <p>
            Entrez dans une illustration. Cherchez les indices, assemblez les
            idées et trouvez votre sortie.
          </p>
          <a
            className="button primary hero-cta"
            href="/jouer/le-dernier-service"
          >
            Jouer la première aventure <ArrowUpRight size={18} />
          </a>
          <div className="hero-note">
            <MousePointer2 size={15} />À explorer directement dans votre
            navigateur.
          </div>
        </div>
        <a
          href="/jouer/le-dernier-service"
          className="featured-art"
          aria-label="Jouer Le dernier service"
        >
          <img
            src="/scenes/kitchen.png"
            alt="Une cuisine illustrée avec une étagère d’assiettes, un tiroir et des fruits"
            fetchPriority="high"
          />
          <div className="featured-shade" />
          <div className="featured-bottom">
            <div>
              <span className="feature-label">LA PREMIÈRE ÉVASION</span>
              <h2>Le dernier service</h2>
              <p>La clé est quelque part. À vous de regarder.</p>
            </div>
            <span className="round-play">
              <Play size={23} fill="currentColor" />
            </span>
          </div>
        </a>
      </section>
      <section className="explore-section" aria-labelledby="gallery-heading">
        <div className="section-heading">
          <div>
            <p className="section-kicker">La galerie</p>
            <h2 id="gallery-heading">À vous de trouver la sortie.</h2>
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
