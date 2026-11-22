import Link from "next/link";

/**
 * MadrNext brand mark — hand-drawn SVG.
 * An eight-point star (two overlapping squares, the rub-el-hizb geometry of
 * madrasah manuscripts) whose lower half opens into the pages of a book.
 * The wordmark is set in the display serif for "Madr" and the sans for "Next".
 */

export function LogoMark({ size = 34, className }: { size?: number; className?: string }) {
  const c = "currentColor";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* top square of the eight-point star */}
      <rect x="14.6" y="6.4" width="18.8" height="18.8" stroke={c} strokeWidth="2.6" transform="rotate(45 24 15.8)" />
      {/* book pages opening at the base */}
      <path d="M6 26c5-2.6 10.5-2.6 15.5.6v14.2C16.5 37.6 11 37.6 6 40.2V26Z" stroke={c} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M42 26c-5-2.6-10.5-2.6-15.5.6v14.2c5-3.2 10.5-3.2 15.5-.6V26Z" stroke={c} strokeWidth="2.6" strokeLinejoin="round" />
      {/* gold spine dot — the single accent */}
      <circle cx="24" cy="20" r="2.6" fill="var(--color-gold, #b98a2f)" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-ink" aria-label="MadrNext হোম">
      <LogoMark />
      {!compact && (
        <span className="text-[19px] leading-none">
          <span className="display font-bold">Madr</span>
          <span className="font-semibold text-teal">Next</span>
        </span>
      )}
    </Link>
  );
}
