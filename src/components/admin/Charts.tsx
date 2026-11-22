"use client";

/**
 * Bespoke SVG charts (no chart library) — brand-consistent and lightweight.
 */

export function AdminBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <p className="text-[13px] text-muted">ডাটা নেই।</p>;
  return (
    <div className="flex h-44 items-end gap-1.5" role="img" aria-label="বার চার্ট">
      {data.map((d, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center gap-1.5">
          <span className="tabnum text-[10.5px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
            {d.value.toLocaleString("bn-IN")}
          </span>
          <div
            className="w-full rounded-t-xs bg-teal transition-colors group-hover:bg-teal-deep"
            style={{ height: `${Math.max(3, (d.value / max) * 100)}%` }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="tabnum text-[10.5px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

const DONUT_COLORS = ["#0c5b53", "#b98a2f", "#3aa694", "#57b8a4", "#8f7a35", "#0e2a2b", "#c9a86a"];

export function AdminDonut({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-[13px] text-muted">ডাটা নেই।</p>;
  const R = 60;
  const C = 2 * Math.PI * R;
  const fracs = data.map((d) => (total === 0 ? 0 : d.value / total));
  const slices = fracs.map((frac, i) => ({
    frac,
    dash: `${frac * C} ${C - frac * C}`,
    offset: -fracs.slice(0, i).reduce((s, f) => s + f, 0) * C,
  }));
  return (
    <div className="flex flex-wrap items-center gap-7">
      <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="ডোনাট চার্ট">
        <g transform="translate(75,75) rotate(-90)">
          {slices.map((slice, i) => (
              <circle
                key={i}
                r={R}
                fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                strokeWidth="26"
                strokeDasharray={slice.dash}
                strokeDashoffset={slice.offset}
              />
          ))}
        </g>
        <text x="75" y="72" textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--color-ink)" fontFamily="var(--font-noto-serif-bengali)">
          {total.toLocaleString("bn-IN")}
        </text>
        <text x="75" y="92" textAnchor="middle" fontSize="11" fill="var(--color-muted)">
          মোট এনরোলমেন্ট
        </text>
      </svg>
      <ul className="space-y-1.5">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2 text-[12.5px]">
            <span
              className="h-3 w-3 rounded-xs"
              style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
              aria-hidden="true"
            />
            <span className="max-w-[180px] truncate text-ink">{d.label}</span>
            <span className="tabnum text-muted">{d.value.toLocaleString("bn-IN")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
