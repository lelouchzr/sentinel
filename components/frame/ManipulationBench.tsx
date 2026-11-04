"use client";
import { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  RotateCcw,
  Check,
  Hand,
  ChevronUp,
  ChevronDown,
  KeyRound,
} from "lucide-react";
import type { ManipulationAttempt, GameState } from "@/lib/game";
import { Modal, type PublicRoom } from "./shared";
import ObjectMotion from "./ObjectMotion";

type ObjectView = PublicRoom["objects"][number];
export default function ManipulationBench({
  room,
  object,
  state,
  busy,
  outcome,
  message,
  motion,
  onSubmit,
  onClose,
}: {
  room: PublicRoom;
  object: ObjectView;
  state: GameState;
  busy: boolean;
  outcome: string;
  message: string;
  motion: boolean;
  onSubmit: (code?: string, attempt?: ManipulationAttempt) => Promise<void>;
  onClose: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(
      Array(object.numericCodeLength ?? 3).fill("0"),
    ),
    [answer, setAnswer] = useState(""),
    [order, setOrder] = useState<string[]>([]),
    [moved, setMoved] = useState<string[]>([]);
  const benchRoot = useRef<HTMLDivElement>(null);
  const solved = state.resolved.includes(object.id),
    puzzle = object.puzzle;
  useEffect(() => {
    if (solved)
      benchRoot.current
        ?.closest(".modal")
        ?.scrollTo({ top: 0, behavior: motion ? "smooth" : "instant" });
  }, [solved, motion]);
  return (
    <Modal title={object.name} onClose={onClose}>
      <div
        ref={benchRoot}
        className={`manipulation-bench ${motion ? "" : "no-motion"}`}
      >
        {puzzle?.kind !== "move" && (
          <div className="bench-art" style={{ aspectRatio: "2" }}>
            <ObjectMotion
              room={room}
              resolved={state.resolved}
              motion={motion}
              detail={
                room.image === "/stories/kitchen-base.png" &&
                object.animation === "drawer"
                  ? "12 56 31 36"
                  : room.image === "/stories/kitchen-base.png" &&
                      object.animation === "fruits"
                    ? "28 35 26 30"
                    : `${Math.max(0, object.region.x * 100 - 4)} ${Math.max(0, object.region.y * 100 - 4)} ${Math.min(100, object.region.w * 100 + 8)} ${Math.min(100, object.region.h * 100 + 8)}`
              }
            />
            <span className="bench-tag">
              <Hand size={13} />À vous de jouer
            </span>
          </div>
        )}
        {solved ? (
          <>
            <div className="bench-success" role="status">
              <Check size={19} />
              {object.animation === "drawer"
                ? "Le tiroir est ouvert."
                : object.animation === "fruits"
                  ? "Les fruits ont été écartés."
                  : "Vous avez trouvé."}
            </div>
            <div className="bench-reward">
              {message.split(/\n\s*\n/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <button className="button primary full" onClick={onClose}>
              Revenir au décor
              <ArrowRight size={17} />
            </button>
          </>
        ) : (
          <>
            <p className="bench-instruction">
              {puzzle?.instruction ?? message}
            </p>
            {outcome === "wrong_code" || outcome === "wrong_manipulation" ? (
              <p className="bench-error" role="status">
                {message}
              </p>
            ) : null}
            {object.needsItem && outcome === "needs_item" ? (
              <div className="bench-inventory">
                <p>Quel objet de votre inventaire voulez-vous utiliser ?</p>
                {state.inventory.map((item) => (
                  <button
                    key={item.id}
                    className="button secondary"
                    disabled={busy}
                    onClick={() =>
                      void onSubmit(undefined, { itemId: item.id })
                    }
                  >
                    <KeyRound size={17} />
                    {item.name}
                    <ArrowRight size={15} />
                  </button>
                ))}
              </div>
            ) : puzzle?.kind === "move" ? (
              <>
                <FruitSearch
                  room={room}
                  object={object}
                  moved={moved}
                  onMove={(id) =>
                    setMoved((v) => (v.includes(id) ? v : [...v, id]))
                  }
                />
                <div className="move-shortcuts">
                  {puzzle.pieces.map((p) => (
                    <button
                      disabled={busy || moved.includes(p.id)}
                      key={p.id}
                      onClick={() => setMoved((v) => [...v, p.id])}
                    >
                      <span>
                        {moved.includes(p.id) ? (
                          <Check size={15} />
                        ) : (
                          <Hand size={15} />
                        )}
                      </span>
                      Écarter : {p.label}
                    </button>
                  ))}
                </div>
                <p className="bench-progress">
                  {moved.length} / {puzzle.pieces.length} éléments déplacés
                </p>
                <button
                  className="button primary full"
                  disabled={busy || moved.length !== puzzle.pieces.length}
                  onClick={() => void onSubmit(undefined, { moved })}
                >
                  Regarder ce qui était caché
                  <ArrowRight size={17} />
                </button>
              </>
            ) : puzzle?.kind === "sequence" ? (
              <>
                <ol className="sequence-slots" aria-label="Votre disposition">
                  {puzzle.pieces.map((_, i) => (
                    <li key={i}>
                      <span>{i + 1}</span>
                      {puzzle.pieces.find((p) => p.id === order[i])?.label ??
                        "Choisir un élément"}
                    </li>
                  ))}
                </ol>
                <div className="sequence-pieces">
                  {puzzle.pieces.map((p) => (
                    <button
                      className="button secondary"
                      key={p.id}
                      disabled={busy || order.includes(p.id)}
                      onClick={() => setOrder((v) => [...v, p.id])}
                    >
                      {p.label}
                      {order.includes(p.id) && <Check size={15} />}
                    </button>
                  ))}
                </div>
                <div className="button-row">
                  <button
                    className="text-link"
                    disabled={busy}
                    onClick={() => setOrder([])}
                  >
                    <RotateCcw size={15} />
                    Recommencer la disposition
                  </button>
                  <button
                    className="button primary"
                    disabled={busy || order.length !== puzzle.pieces.length}
                    onClick={() => void onSubmit(undefined, { order })}
                  >
                    Vérifier
                    <ArrowRight size={17} />
                  </button>
                </div>
              </>
            ) : object.action === "code" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void onSubmit(answer || digits.join(""));
                }}
              >
                <div
                  className="lock-wheels"
                  aria-label="Cadenas à trois molettes"
                >
                  {digits.map((d, i) => (
                    <div className="lock-wheel" key={i}>
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Augmenter le chiffre ${i + 1}`}
                        onClick={() =>
                          setDigits((v) =>
                            v.map((n, j) =>
                              i === j ? String((Number(n) + 1) % 10) : n,
                            ),
                          )
                        }
                      >
                        <ChevronUp size={22} />
                      </button>
                      <output aria-label={`Chiffre ${i + 1}`}>{d}</output>
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Diminuer le chiffre ${i + 1}`}
                        onClick={() =>
                          setDigits((v) =>
                            v.map((n, j) =>
                              i === j ? String((Number(n) + 9) % 10) : n,
                            ),
                          )
                        }
                      >
                        <ChevronDown size={22} />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="bench-code-label">
                  Ou saisir le code
                  <input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    maxLength={16}
                    autoComplete="off"
                    placeholder="Chiffres ou lettres"
                  />
                </label>
                <button
                  type="submit"
                  className="button primary full"
                  disabled={busy}
                >
                  Tourner la serrure
                  <KeyRound size={17} />
                </button>
              </form>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
}

function FruitSearch({
  room,
  object,
  moved,
  onMove,
}: {
  room: PublicRoom;
  object: ObjectView;
  moved: string[];
  onMove: (id: string) => void;
}) {
  const drag = useRef<{ id: string; x: number; y: number } | null>(null),
    [offsets, setOffsets] = useState<Record<string, { x: number; y: number }>>(
      {},
    );
  const fruitArt =
    object.animation === "fruits" && room.image === "/stories/kitchen-base.png";
  const shapes = [
    { cx: 681, cy: 598, rx: 34, ry: 37 },
    { cx: 801, cy: 607, rx: 27, ry: 39 },
    { cx: 848, cy: 600, rx: 28, ry: 38 },
  ];
  const pieces = object.puzzle!.pieces;
  return (
    <div className="fruit-table">
      <p>
        Faites glisser les éléments pour dégager le centre. Les boutons
        ci-dessous permettent aussi de jouer au clavier.
      </p>
      <svg
        viewBox={fruitArt ? "570 460 400 350" : "0 0 400 260"}
        className="fruit-playfield"
        role="group"
        aria-label="Table de manipulation"
      >
        {fruitArt ? (
          <>
            <image
              href="/motion/kitchen-empty-bowl.png"
              width="1920"
              height="1280"
              preserveAspectRatio="none"
            />
            <rect
              x="722"
              y="716"
              width="72"
              height="42"
              rx="3"
              fill="#ead29b"
              opacity={moved.length === pieces.length ? 1 : 0}
            />
            <path
              d="M734 730h42m-42 10h30"
              stroke="#887045"
              opacity={moved.length === pieces.length ? 1 : 0}
              strokeWidth="2"
            />
          </>
        ) : (
          <rect x="8" y="8" width="384" height="244" rx="12" fill="#b29361" />
        )}
        {pieces.map((p, i) => {
          const position = offsets[p.id] ?? { x: 0, y: 0 },
            done = moved.includes(p.id),
            s = shapes[i % 3],
            clip = `fruit-${object.id}-${i}`;
          return (
            <g
              key={p.id}
              className={`draggable-piece ${done ? "moved" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`Déplacer ${p.label}`}
              style={{
                transform: fruitArt
                  ? `translate(${done ? (i === 0 ? -60 : i === 1 ? 105 : 48) : position.x}px,${done ? (i === 0 ? 145 : i === 1 ? 125 : 150) : position.y}px)`
                  : `translate(${done ? i * 110 + 25 : 70 + i * 95}px,${done ? 195 : 70}px)`,
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onMove(p.id);
                }
              }}
              onPointerDown={(e) => {
                if (done) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = { id: p.id, x: e.clientX, y: e.clientY };
              }}
              onPointerMove={(e) => {
                if (drag.current?.id !== p.id) return;
                const box =
                  e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                setOffsets((v) => ({
                  ...v,
                  [p.id]: {
                    x: ((e.clientX - drag.current!.x) * 400) / box.width,
                    y: ((e.clientY - drag.current!.y) * 400) / box.width,
                  },
                }));
              }}
              onPointerUp={(e) => {
                if (drag.current?.id !== p.id) return;
                const distance = Math.hypot(
                  e.clientX - drag.current.x,
                  e.clientY - drag.current.y,
                );
                drag.current = null;
                if (distance > 24) onMove(p.id);
                else setOffsets((v) => ({ ...v, [p.id]: { x: 0, y: 0 } }));
              }}
              onPointerCancel={() => {
                drag.current = null;
                setOffsets({});
              }}
            >
              {fruitArt ? (
                <>
                  <defs>
                    <clipPath id={clip}>
                      <ellipse {...s} />
                    </clipPath>
                  </defs>
                  <image
                    href={room.image}
                    width="1920"
                    height="1280"
                    clipPath={`url(#${clip})`}
                  />
                </>
              ) : (
                <>
                  <rect
                    width="80"
                    height="60"
                    rx="8"
                    fill="#edddb4"
                    stroke="#665436"
                  />
                  <text
                    x="40"
                    y="34"
                    textAnchor="middle"
                    fill="#332d21"
                    fontSize="13"
                  >
                    {i + 1}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
