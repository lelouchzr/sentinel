"use client";
import { useState, type ReactNode } from "react";
import { ImageOff, RotateCcw } from "lucide-react";

/** The illustration and its hit targets share one transform, so camera motion never
 * moves a hotspot away from the object it belongs to. */
export default function SceneStage({
  image,
  title,
  ambience,
  motion,
  children,
  overlay,
}: {
  image: string;
  title: string;
  ambience?: string;
  motion: boolean;
  children: ReactNode;
  overlay?: ReactNode;
}) {
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0),
    [ratio, setRatio] = useState(1.5);
  return (
    <div
      className={`scene-player story-stage ${ambience ? "has-atmosphere" : ""} ${motion ? "motion-on" : "motion-off"} ${ready ? "scene-ready" : ""}`}
      style={{ aspectRatio: ratio }}
    >
      <div className="scene-composition" key={`${image}-${retry}`}>
        <img
          src={retry ? `${image}?retry=${retry}` : image}
          alt={`La scène de ${title}`}
          draggable={false}
          onLoad={(e) => {
            setRatio(
              e.currentTarget.naturalWidth / e.currentTarget.naturalHeight,
            );
            setReady(true);
          }}
          onError={() => setFailed(true)}
        />
        {ready && children}
      </div>
      {ready && overlay}
      {ambience && ready && (
        <div
          aria-hidden="true"
          className={`scene-atmosphere atmosphere-${ambience}`}
        >
          {Array.from({ length: 16 }, (_, i) => (
            <span
              key={i}
              style={{
                left: `${(i * 37 + 11) % 100}%`,
                top: `${(i * 23 + 9) % 100}%`,
                animationDelay: `${-i * 1.7}s`,
                animationDuration: `${12 + (i % 5) * 3}s`,
              }}
            />
          ))}
        </div>
      )}
      {!ready && !failed && (
        <div className="scene-loading" role="status">
          <span />
          Le lieu apparaît…
        </div>
      )}
      {failed && (
        <div className="scene-failed" role="alert">
          <ImageOff size={26} />
          <p>L’illustration n’a pas pu se charger.</p>
          <button
            className="button secondary"
            onClick={() => {
              setFailed(false);
              setRetry((n) => n + 1);
            }}
          >
            <RotateCcw size={15} />
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
