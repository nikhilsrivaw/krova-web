/**
 * A pixelated rendition of the KROVA mark (see app/icon.svg), rasterized
 * from the same stroke geometry rather than hand-drawn — so it always
 * matches the real logo. The K sits solid and static; a brightness wave
 * flows diagonally through its own pixels on loop, standing in for a
 * spinner. No blur/glow — flat pixel-art on purpose.
 */

const GRID = 20;
const VIEW = 64;
const CELL = VIEW / GRID;
const HALF_STROKE = 3;

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Same stroke coordinates as app/icon.svg's K mark (64x64 viewBox).
const STROKES: [number, number, number, number][] = [
  [22, 17, 22, 47],
  [26.5, 32, 41, 47],
  [26.5, 32, 37, 21],
];
const DOT = { cx: 44, cy: 16, r: 3.5 };

const K_CELLS = (() => {
  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const x = c * CELL + CELL / 2;
      const y = r * CELL + CELL / 2;
      const onStroke = STROKES.some(([x1, y1, x2, y2]) => distToSegment(x, y, x1, y1, x2, y2) <= HALF_STROKE + 0.15);
      const onDot = Math.hypot(x - DOT.cx, y - DOT.cy) <= DOT.r + 0.15;
      if (onStroke || onDot) cells.push({ r, c });
    }
  }
  return cells;
})();

const STAGGER = 0.02;

export function PixelLoader({ size = 120, className }: { size?: number; className?: string }) {
  const gap = Math.max(1, Math.round((size / GRID) * 0.16));

  return (
    <div
      role="status"
      aria-label="Loading"
      className={className}
      style={{
        width: size,
        height: size,
        display: "grid",
        gridTemplateColumns: `repeat(${GRID}, 1fr)`,
        gridTemplateRows: `repeat(${GRID}, 1fr)`,
        gap: `${gap}px`,
      }}
    >
      {K_CELLS.map(({ r, c }) => (
        <span
          key={`${r}-${c}`}
          aria-hidden
          style={{
            gridRowStart: r + 1,
            gridColumnStart: c + 1,
            borderRadius: "20%",
            backgroundColor: "var(--color-teal-dim)",
            transformOrigin: "center",
            animation: `pixel-flow 0.8s linear ${(r + c) * STAGGER}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
