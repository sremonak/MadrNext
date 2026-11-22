import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** UI primitives — restrained, structural, accessible. */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-teal text-white hover:bg-teal-deep disabled:opacity-50 disabled:hover:bg-teal shadow-raised",
  secondary:
    "border border-line-strong bg-surface text-ink hover:border-teal hover:text-teal",
  ghost: "text-teal hover:bg-teal/10",
  danger: "bg-danger text-white hover:opacity-90",
  gold: "bg-gold text-[#1c1403] hover:bg-gold-soft",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-5 text-[14.5px]",
  lg: "h-12 px-7 text-[16px]",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "") {
  return [
    "inline-flex items-center justify-center gap-2 rounded-md font-medium",
    "transition-colors duration-150 cursor-pointer select-none",
    "disabled:cursor-not-allowed",
    buttonVariants[variant],
    buttonSizes[size],
    extra,
  ].join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonClass(variant, size, className ?? "")} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  prefetch,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  prefetch?: boolean;
}) {
  return (
    <Link href={href} prefetch={prefetch} className={buttonClass(variant, size, className ?? "")}>
      {children}
    </Link>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={
        "h-11 w-full rounded-md border border-line-strong bg-surface px-3.5 text-[15px] text-ink " +
        "placeholder:text-muted/70 transition-colors focus:border-teal focus:outline-none " +
        "focus:ring-2 focus:ring-teal/25 " +
        (className ?? "")
      }
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={
        "w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-ink " +
        "placeholder:text-muted/70 transition-colors focus:border-teal focus:outline-none " +
        "focus:ring-2 focus:ring-teal/25 " +
        (className ?? "")
      }
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={
        "h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-[15px] text-ink " +
        "transition-colors focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25 " +
        (className ?? "")
      }
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13.5px] font-medium text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[12.5px] text-muted">{hint}</p>}
      {error && (
        <p className="text-[12.5px] text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type BadgeTone = "neutral" | "success" | "warn" | "danger" | "info" | "gold";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-paper text-muted border-line-strong",
  success: "bg-success-wash text-success border-success/30",
  warn: "bg-warn-wash text-warn border-warn/30",
  danger: "bg-danger-wash text-danger border-danger/30",
  info: "bg-teal/10 text-teal border-teal/30",
  gold: "bg-gold-wash text-gold border-gold/40",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-xs border px-2 py-0.5 text-[12px] font-medium ${badgeTones[tone]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-lg border border-line bg-surface ${className ?? ""}`}>{children}</div>
  );
}

export function SectionTitle({
  title,
  sub,
  action,
  as: Tag = "h2",
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-6">
      <div>
        <Tag className="display text-[24px] font-bold text-ink md:text-[28px]">{title}</Tag>
        {sub && <p className="mt-1.5 max-w-2xl text-[14.5px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface px-8 py-14 text-center">
      {icon && <div className="text-line-strong">{icon}</div>}
      <p className="display text-[18px] font-bold text-ink">{title}</p>
      <p className="max-w-sm text-[14px] text-muted">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ""}`} aria-hidden="true" />;
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "danger" | "success" | "warn";
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    info: "border-teal/40 bg-teal/5 text-ink",
    danger: "border-danger/40 bg-danger-wash text-ink",
    success: "border-success/40 bg-success-wash text-ink",
    warn: "border-warn/40 bg-warn-wash text-ink",
  } as const;
  return (
    <div className={`rounded-md border px-4 py-3 text-[14px] ${tones[tone]}`} role="alert">
      {title && <p className="font-semibold text-ink">{title}</p>}
      <div className={title ? "mt-0.5 text-muted" : "text-muted"}>{children}</div>
    </div>
  );
}

/** Bengali numerals pagination for lists */
export function Pagination({
  page,
  total,
  makeHref,
}: {
  page: number;
  total: number;
  makeHref: (page: number) => string;
}) {
  if (total <= 1) return null;
  const pages: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(total, page + 2); i++) pages.push(i);
  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="পেজিনেশন">
      {page > 1 && (
        <Link href={makeHref(page - 1)} className="rounded-md border border-line px-3 py-1.5 text-[13px] text-muted hover:border-teal hover:text-teal">
          ← পূর্ববর্তী
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={makeHref(p)}
          aria-current={p === page ? "page" : undefined}
          className={
            p === page
              ? "rounded-md bg-teal px-3 py-1.5 text-[13px] font-semibold text-white"
              : "rounded-md border border-line px-3 py-1.5 text-[13px] text-muted hover:border-teal hover:text-teal"
          }
        >
          {p.toLocaleString("bn-IN")}
        </Link>
      ))}
      {page < total && (
        <Link href={makeHref(page + 1)} className="rounded-md border border-line px-3 py-1.5 text-[13px] text-muted hover:border-teal hover:text-teal">
          পরবর্তী →
        </Link>
      )}
    </nav>
  );
}
