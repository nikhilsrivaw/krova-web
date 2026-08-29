"use client";

import { useEffect, useRef } from "react";

/**
 * A tiny 20x20 pixel creature with an idle-blink loop — KROVA's mascot,
 * standing in for "something is reading your conversations right now"
 * instead of a spinner or a pulsing dot. Themed to the khata palette:
 * Teal body (the icon's mark color) on card-dark background.
 */

const BODY = 1;
const EYE = 2;

const CREATURE: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,2,1,1,1,1,1,2,1,1,0,0,0,0],
  [0,0,0,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0,0,0],
  [0,0,0,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0,0,0],
  [0,0,0,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

function patch(base: number[][], ops: [number, number, number][]) {
  const out = base.map((r) => r.slice());
  for (const [r, c, v] of ops) {
    if (r >= 0 && r < 20 && c >= 0 && c < 20) out[r][c] = v;
  }
  return out;
}

const HALF_BLINK = patch(CREATURE, [[6, 7, BODY], [6, 13, BODY]]);
const FULL_BLINK = patch(CREATURE, [[6, 7, BODY], [7, 7, BODY], [6, 13, BODY], [7, 13, BODY]]);
const GLANCE_DOWN = patch(CREATURE, [[6, 7, BODY], [6, 13, BODY], [8, 7, EYE], [8, 13, EYE]]);
const EYEBROW = patch(CREATURE, [[5, 7, BODY], [5, 13, BODY]]);

type Frame = { hold: number; frame: number[][] | null };

const FRAMES: Frame[] = [
  { hold: 2400, frame: null },
  { hold: 60, frame: HALF_BLINK },
  { hold: 100, frame: FULL_BLINK },
  { hold: 60, frame: HALF_BLINK },
  { hold: 80, frame: null },
  { hold: 220, frame: GLANCE_DOWN },
  { hold: 1600, frame: null },
  { hold: 60, frame: HALF_BLINK },
  { hold: 90, frame: FULL_BLINK },
  { hold: 60, frame: HALF_BLINK },
  { hold: 70, frame: null },
  { hold: 60, frame: FULL_BLINK },
  { hold: 100, frame: HALF_BLINK },
  { hold: 70, frame: null },
  { hold: 200, frame: EYEBROW },
  { hold: 900, frame: null },
];

export function PixelCreature({
  size = 40,
  color = "#00A387",
  bg = "#1A1A1A",
  className,
}: {
  /** A CSS length/size value — pass a number for px, or a string (e.g. a clamp()) for a responsive size. */
  size?: number | string;
  color?: string;
  bg?: string;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.innerHTML = "";
    host.style.display = "grid";
    host.style.gridTemplateColumns = "repeat(20, 1fr)";
    host.style.gridTemplateRows = "repeat(20, 1fr)";

    const cells: HTMLDivElement[][] = [];
    for (let r = 0; r < 20; r++) {
      const row: HTMLDivElement[] = [];
      for (let c = 0; c < 20; c++) {
        const d = document.createElement("div");
        host.appendChild(d);
        row.push(d);
      }
      cells.push(row);
    }

    function paint(frame: number[][]) {
      for (let r = 0; r < 20; r++) {
        for (let c = 0; c < 20; c++) {
          const v = frame[r][c];
          const el = cells[r][c];
          el.style.background = v === BODY ? color : v === EYE ? bg : "transparent";
        }
      }
    }

    let frameIdx = 0;
    let startAt = performance.now();
    let raf = 0;

    const current = () => FRAMES[frameIdx];
    const render = () => paint(current().frame ?? CREATURE);

    function tick(now: number) {
      if (now - startAt >= current().hold) {
        frameIdx = (frameIdx + 1) % FRAMES.length;
        startAt = now;
        render();
      }
      raf = requestAnimationFrame(tick);
    }

    render();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      host.innerHTML = "";
    };
  }, [color, bg]);

  return <div ref={hostRef} style={{ width: size, height: size }} className={className} />;
}
