"use client";
import { useId } from "react";
import type { PublicRoom } from "./shared";

/** Reuse pixels from the original artwork: the drawer front and fruit bowl are
 * separate moving layers, with a revealed interior behind them. */
export default function ObjectMotion({
  room,
  resolved,
  motion,
  detail,
}: {
  room: PublicRoom;
  resolved: string[];
  motion: boolean;
  detail?: string;
}) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      className={`object-motion ${motion ? "" : "still"}`}
      viewBox={detail ?? "0 0 100 100"}
      preserveAspectRatio={detail ? "xMidYMid meet" : "none"}
      aria-hidden="true"
    >
      {detail && (
        <image
          href={room.image}
          width="100"
          height="100"
          preserveAspectRatio="none"
        />
      )}
      {room.objects
        .filter((o) => o.animation)
        .map((o) => {
          const open = resolved.includes(o.id),
            r = o.region,
            kitchen = room.image === "/stories/kitchen-base.png";
          const bounds =
            kitchen && o.animation === "drawer"
              ? { x: 17.6, y: 63.3, w: 18.7, h: 16.5 }
              : kitchen && o.animation === "fruits"
                ? { x: 31.5, y: 39.7, w: 15.3, h: 17.8 }
                : { x: r.x * 100, y: r.y * 100, w: r.w * 100, h: r.h * 100 };
          const { x, y, w, h } = bounds,
            clip = `${uid}-${o.id}`;
          const shape =
            kitchen && o.animation === "drawer"
              ? "17.6,69 36.3,63.3 36.3,75.4 17.9,79.8"
              : `${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}`;
          const transform = !open
            ? "translate(0px,0px)"
            : o.animation === "drawer"
              ? "translate(-1.4px,6px)"
              : o.animation === "fruits"
                ? "translate(-9px,1px) rotate(-5deg)"
                : o.animation === "door"
                  ? `translate(${w * 0.65}px,0px) scale(.34,1)`
                  : o.animation === "lid"
                    ? `translate(0px,${-h * 0.35}px) scale(1,.65)`
                    : o.animation === "lever"
                      ? "rotate(-12deg)"
                      : o.animation === "page"
                        ? `translate(${w * 0.3}px,0px) scale(.6,1)`
                        : "translate(0px,0px)";
          return (
            <g key={o.id} data-object-motion={o.id} data-open={open}>
              <defs>
                <clipPath id={clip}>
                  {o.mask ? (
                    <path
                      d={o.mask.path}
                      transform={`scale(${100 / o.mask.width} ${100 / o.mask.height})`}
                    />
                  ) : (
                    <polygon points={shape} />
                  )}
                </clipPath>
              </defs>
              {open && o.animation === "fruits" && kitchen && (
                <image
                  href="/motion/kitchen-empty-bowl.png"
                  width="100"
                  height="100"
                  preserveAspectRatio="none"
                  clipPath={`url(#${clip})`}
                />
              )}
              {open &&
                ![
                  "light",
                  "page",
                  "lever",
                  ...(kitchen ? ["fruits"] : []),
                ].includes(o.animation!) && (
                  <g className="revealed-interior">
                    <polygon
                      points={shape}
                      fill={o.animation === "fruits" ? "#e8dcc1" : "#352619"}
                      stroke="#55432b"
                      strokeWidth=".22"
                    />
                    <path
                      d={`M${x + 1} ${y + 1} L${x + w - 1} ${y + 1} L${x + w - 2} ${y + h - 1} L${x + 2} ${y + h - 1}Z`}
                      fill={o.animation === "fruits" ? "#e7d3a0" : "#544128"}
                    />
                    {o.animation === "drawer" && (
                      <g stroke="#d6b664" strokeWidth=".6" fill="none">
                        <circle
                          cx={x + w * 0.35}
                          cy={y + h * 0.35}
                          r={w * 0.07}
                        />
                        <path
                          d={`M${x + w * 0.42} ${y + h * 0.35}h${w * 0.28}v${h * 0.12}m${-w * 0.09} ${-h * 0.12}v${h * 0.09}`}
                        />
                      </g>
                    )}
                    <rect
                      x={x + w * 0.28}
                      y={y + h * 0.56}
                      width={w * 0.45}
                      height={h * 0.25}
                      rx=".4"
                      fill="#ead9ac"
                      transform={`rotate(-8 ${x + w / 2} ${y + h / 2})`}
                    />
                    <path
                      d={`M${x + w * 0.38} ${y + h * 0.43}h${w * 0.24}m${-w * 0.24} ${h * 0.12}h${w * 0.2}`}
                      stroke="#8d7048"
                      strokeWidth=".25"
                    />
                  </g>
                )}
              {kitchen && o.animation === "fruits" ? (
                <g>
                  {[
                    {
                      cx: 35.46875,
                      cy: 46.71875,
                      rx: 1.77,
                      ry: 2.89,
                      dx: -3.125,
                      dy: 11.33,
                    },
                    {
                      cx: 41.71875,
                      cy: 47.4219,
                      rx: 1.406,
                      ry: 3.047,
                      dx: 5.469,
                      dy: 9.766,
                    },
                    {
                      cx: 44.1667,
                      cy: 46.875,
                      rx: 1.458,
                      ry: 2.969,
                      dx: 2.5,
                      dy: 11.719,
                    },
                  ].map((fruit, i) => (
                    <g
                      key={i}
                      className="moving-art"
                      style={{
                        transform: open
                          ? `translate(${fruit.dx}px,${fruit.dy}px)`
                          : "translate(0px,0px)",
                      }}
                    >
                      <defs>
                        <clipPath id={`${clip}-fruit-${i}`}>
                          <ellipse
                            cx={fruit.cx}
                            cy={fruit.cy}
                            rx={fruit.rx}
                            ry={fruit.ry}
                          />
                        </clipPath>
                      </defs>
                      <image
                        href={room.image}
                        width="100"
                        height="100"
                        preserveAspectRatio="none"
                        clipPath={`url(#${clip}-fruit-${i})`}
                      />
                    </g>
                  ))}
                </g>
              ) : ["light", "page", "lever"].includes(o.animation!) ? (
                <ellipse
                  cx={x + w / 2}
                  cy={y + h / 2}
                  rx={w * 0.5}
                  ry={h * 0.5}
                  fill="#ffe99b"
                  opacity={open ? 0.3 : 0}
                  className="motion-lamp"
                />
              ) : (
                <g
                  className={`moving-art art-${o.animation}`}
                  style={{ transform, transformOrigin: `${x}px ${y + h}px` }}
                >
                  <image
                    href={room.image}
                    width="100"
                    height="100"
                    preserveAspectRatio="none"
                    clipPath={`url(#${clip})`}
                  />
                </g>
              )}
            </g>
          );
        })}
    </svg>
  );
}
