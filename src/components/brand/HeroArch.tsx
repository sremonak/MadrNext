/** Mihrab-inspired arch composition, drawn in SVG — the hero centerpiece. */
export function HeroArch({ className }: { className?: string }) {
  const ink = "currentColor";
  return (
    <svg viewBox="0 0 420 460" fill="none" className={className} aria-hidden="true">
      <defs>
        <pattern id="mn-lat" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M0 13 H26 M13 0 V26" stroke="var(--color-teal)" strokeOpacity="0.16" strokeWidth="1" />
          <circle cx="13" cy="13" r="2.2" fill="var(--color-gold)" fillOpacity="0.35" />
        </pattern>
      </defs>
      {/* pointed arch outline */}
      <path
        d="M60 440 V210 C60 120 140 40 210 40 C280 40 360 120 360 210 V440"
        stroke={ink}
        strokeWidth="3"
      />
      <path
        d="M80 440 V214 C80 132 152 62 210 62 C268 62 340 132 340 214 V440"
        stroke="var(--color-gold)"
        strokeWidth="1.6"
      />
      <rect x="92" y="200" width="236" height="240" fill="url(#mn-lat)" />
      {/* open book at the base */}
      <g stroke={ink} strokeWidth="3" strokeLinejoin="round">
        <path d="M96 386 C140 366 182 366 208 380 V444 C182 430 140 430 96 450 Z" fill="var(--color-surface)" />
        <path d="M324 386 C280 366 238 366 212 380 V444 C238 430 280 430 324 450 Z" fill="var(--color-surface)" />
        <path d="M140 402 L186 398 M140 416 L186 412 M234 398 L280 402 M234 412 L280 416" stroke="var(--color-teal)" strokeWidth="2" />
      </g>
      <circle cx="210" cy="216" r="6" fill="var(--color-gold)" />
      <path d={star8path(210, 216, 44)} stroke="var(--color-gold)" strokeWidth="1.4" strokeOpacity="0.8" />
      <path d={star8path(210, 216, 76)} stroke={ink} strokeWidth="1" strokeOpacity="0.35" />
    </svg>
  );
}

function star8path(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const rad = i % 2 === 0 ? r : r * 0.5;
    const a = (Math.PI / 8) * i - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
}
