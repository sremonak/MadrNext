/**
 * Deterministic geometric course covers — drawn in SVG, seeded per course.
 * Islamic-geometry inspired patterns in the brand palette; no stock images.
 */

const PALETTES = [
  { bg: "#0e2a2b", line: "#2f9080", dot: "#d9a441" },
  { bg: "#0c4a43", line: "#3aa694", dot: "#e3b866" },
  { bg: "#123c35", line: "#57b8a4", dot: "#d9a441" },
  { bg: "#1d3320", line: "#5c9e6e", dot: "#d9b262" },
  { bg: "#14283c", line: "#5a8fc0", dot: "#e3b866" },
  { bg: "#2b1e12", line: "#c99a3f", dot: "#f0dfae" },
] as const;

function star8(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const a = (Math.PI / 8) * i - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

function hexGrid(w: number, h: number, step: number): string {
  const lines: string[] = [];
  for (let x = -h; x < w + h; x += step) {
    lines.push(`M${x},${-h} L${x + h},${h + h}`);
    lines.push(`M${x},${-h} L${x - h},${h + h}`);
  }
  return lines.join(" ");
}

export function CourseCover({
  seed,
  title,
  level,
  className,
}: {
  seed: number;
  title: string;
  level?: string;
  className?: string;
}) {
  const p = PALETTES[Math.abs(seed) % PALETTES.length];
  const variant = Math.abs(seed * 7 + 3) % 3;
  const initial = title.trim().charAt(0);
  return (
    <svg
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label={`${title} — কোর্স কভার`}
    >
      <rect width="320" height="180" fill={p.bg} />
      {variant === 0 && (
        <g stroke={p.line} strokeOpacity="0.4" strokeWidth="1">
          <path d={hexGrid(320, 180, 44)} fill="none" />
        </g>
      )}
      {variant === 1 && (
        <g stroke={p.line} strokeOpacity="0.45" strokeWidth="1.2" fill="none">
          {[28, 52, 76, 100, 124].map((r) => (
            <circle key={r} cx="252" cy="88" r={r} />
          ))}
          <path d={star8(252, 88, 118)} strokeOpacity="0.65" />
        </g>
      )}
      {variant === 2 && (
        <g stroke={p.line} strokeOpacity="0.42" strokeWidth="1.1" fill="none">
          {Array.from({ length: 9 }).map((_, i) => (
            <circle key={i} cx={36 * i} cy={i % 2 === 0 ? 46 : 134} r="34" />
          ))}
        </g>
      )}
      <polygon
        points={star8(252, 88, 34)}
        fill="none"
        stroke={p.dot}
        strokeWidth="1.6"
        strokeOpacity="0.9"
      />
      <circle cx="252" cy="88" r="5" fill={p.dot} />
      <text
        x="28"
        y="112"
        fontSize="64"
        fontWeight="700"
        fill="#f7f5f0"
        fillOpacity="0.92"
        fontFamily="var(--font-noto-serif-bengali), serif"
      >
        {initial}
      </text>
      {level && (
        <text x="30" y="150" fontSize="14" fill={p.dot} letterSpacing="1">
          {level}
        </text>
      )}
    </svg>
  );
}
