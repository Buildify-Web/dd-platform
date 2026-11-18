import { initials } from "@dd/shared/domain";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Portal UI kit (server-safe). Tokens come from app/globals.css. Shapes follow the admin &
 * staff designs: white cards (rounded 18px, hairline border), dark ink for the active /
 * primary state, sun yellow for highlights and counts, brand green for "good".
 */
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ── Buttons (class strings so they work on <button>, <Link> and <a>) ──
const btnBase =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,border-color,color,box-shadow,translate] duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-50";
export const btn = {
  dark: cx(btnBase, "h-11 bg-ink px-6 text-[14.5px] text-white hover:bg-ink-soft"),
  darkSm: cx(btnBase, "h-9 bg-ink px-4 text-[13px] text-white hover:bg-ink-soft"),
  white: cx(btnBase, "h-11 border border-line-2 bg-white px-5 text-[14px] text-ink hover:border-ink/30"),
  whiteSm: cx(btnBase, "h-9 border border-line-2 bg-white px-3.5 text-[13px] text-ink hover:border-ink/30"),
  sun: cx(btnBase, "h-11 bg-sun px-6 text-[14.5px] text-ink hover:bg-sun-deep"),
  danger: cx(btnBase, "h-11 bg-danger-tint px-5 text-[14px] text-danger-ink hover:bg-[#f7d9d3]"),
  dangerSm: cx(btnBase, "h-9 bg-danger-tint px-3.5 text-[13px] text-danger-ink hover:bg-[#f7d9d3]"),
  ghost: cx(btnBase, "h-9 px-3 text-[13px] text-muted hover:bg-soft hover:text-ink"),
  icon: "inline-grid size-9 shrink-0 place-items-center rounded-full border border-line-2 bg-white text-ink transition-colors hover:border-ink/30 disabled:opacity-50",
  iconDanger: "inline-grid size-9 shrink-0 place-items-center rounded-full bg-danger-tint text-danger-ink transition-colors hover:bg-[#f7d9d3] disabled:opacity-50",
};

// ── Layout ──
export function PageHeader({ title, crumb, actions, note, back }: { title: ReactNode; crumb?: ReactNode; actions?: ReactNode; note?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-1 inline-block text-[12.5px] text-muted hover:text-ink">
            {back.label}
          </Link>
        )}
        <h1 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[clamp(1.4rem,2.2vw,1.65rem)] leading-tight font-normal tracking-[-0.01em]">
          <span className="min-w-0 [overflow-wrap:break-word]">{title}</span>
          {crumb && <span className="text-[12.5px] font-normal tracking-normal text-muted">{crumb}</span>}
        </h1>
      </div>
      {(actions || note) && (
        <div className="flex flex-wrap items-center gap-2">
          {note && <p className="text-[12.5px] text-muted">{note}</p>}
          {actions}
        </div>
      )}
    </div>
  );
}

export function Card({ children, className, title, action, pad = true }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; pad?: boolean }) {
  return (
    <section className={cx("min-w-0 rounded-[18px] border border-line bg-white", pad && "p-4 sm:p-5", className)}>
      {(title || action) && (
        <div className={cx("mb-3 flex items-center justify-between gap-3", !pad && "px-4 pt-4 sm:px-5")}>
          {title && <h2 className="text-[15.5px] font-normal text-ink">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type Tone = "white" | "green" | "sun" | "ink";
const statTone: Record<Tone, string> = {
  white: "bg-white border border-line text-ink",
  green: "bg-brand text-white",
  sun: "bg-sun text-ink",
  ink: "bg-ink text-white",
};
export function StatCard({ label, value, sub, tone = "white", icon, iconClass, href }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: Tone; icon?: ReactNode; iconClass?: string; href?: string }) {
  const body = (
    <>
      <div className="flex items-center gap-3">
        {icon && <span className={cx("grid size-9 place-items-center rounded-xl", iconClass ?? (tone === "white" ? "bg-sage text-brand" : "bg-white/20"))}>{icon}</span>}
        <p className={cx("text-[13px]", tone === "white" ? "text-ink-soft" : tone === "sun" ? "text-ink/80" : "text-white/85")}>{label}</p>
      </div>
      <p className="mt-2 text-[clamp(1.6rem,2.6vw,2rem)] leading-none font-semibold tracking-[-0.02em] tabular-nums">{value}</p>
      {sub && <p className={cx("mt-1.5 text-[12px]", tone === "white" ? "text-muted" : tone === "sun" ? "text-ink/75" : "text-white/75")}>{sub}</p>}
    </>
  );
  const cls = cx("block min-w-0 rounded-[18px] px-4 py-4 sm:px-5", statTone[tone], href && "lift");
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export const StatGrid = ({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 | 5 }) => (
  <div className={cx("mb-3 grid grid-cols-2 gap-3", cols === 3 ? "lg:grid-cols-3" : cols === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4")}>{children}</div>
);

// ── Pills, badges, avatars ──
export type PillTone = "green" | "sun" | "red" | "blue" | "grey" | "ink" | "sage" | "cream";
const pillTone: Record<PillTone, string> = {
  green: "bg-ok-tint text-brand-deep",
  sun: "bg-sun-tint text-[#6b5300]",
  red: "bg-danger-tint text-danger-ink",
  blue: "bg-info-tint text-info-ink",
  grey: "bg-soft text-ink-soft",
  ink: "bg-ink text-sun",
  sage: "bg-sage text-ink",
  cream: "bg-cream text-ink",
};
export const Pill = ({ children, tone = "grey", className }: { children: ReactNode; tone?: PillTone; className?: string }) => (
  <span className={cx("inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11.5px] leading-none whitespace-nowrap", pillTone[tone], className)}>{children}</span>
);

export const Badge = ({ children, tone = "sun" }: { children: ReactNode; tone?: "sun" | "light" | "ink" }) => (
  <span
    className={cx(
      "inline-grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10.5px] leading-none font-semibold tabular-nums",
      tone === "sun" ? "bg-sun text-ink" : tone === "ink" ? "bg-ink text-sun" : "bg-soft text-ink-soft",
    )}
  >
    {children}
  </span>
);

const AVATAR_TONES = ["bg-sage", "bg-sun", "bg-cream", "bg-soft"];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export function Avatar({ name, size = 32, tone, square, src }: { name: string; size?: number; tone?: string; square?: boolean; src?: string | null }) {
  const t = tone ?? AVATAR_TONES[hash(name) % AVATAR_TONES.length];
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.36)) };
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={style} className={cx("shrink-0 object-cover", square ? "rounded-[22%]" : "rounded-full")} />;
  return (
    <span style={style} className={cx("grid shrink-0 place-items-center font-semibold text-ink", square ? "rounded-[22%]" : "rounded-full", t)} aria-hidden>
      {initials(name, size >= 48 ? 2 : 1)}
    </span>
  );
}

export function Person({ name, sub, size = 32, href }: { name: string; sub?: ReactNode; size?: number; href?: string }) {
  const inner = (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar name={name} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-[14px] text-ink">{name}</span>
        {sub && <span className="block truncate text-[12px] text-muted">{sub}</span>}
      </span>
    </span>
  );
  return href ? (
    <Link href={href} className="min-w-0 hover:underline">
      {inner}
    </Link>
  ) : (
    inner
  );
}

// ── Tables ──
export const Table = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cx("-mx-4 overflow-x-auto sm:-mx-5", className)}>
    <table className="w-full min-w-[640px] border-collapse text-left text-[13.5px]">{children}</table>
  </div>
);
export const th = "border-b border-line px-4 py-3 text-[12px] font-normal text-muted first:pl-4 sm:first:pl-5 last:pr-4 sm:last:pr-5";
export const td = "border-b border-line px-4 py-3 align-middle first:pl-4 sm:first:pl-5 last:pr-4 sm:last:pr-5";

// ── Misc ──
export function Empty({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="grid place-items-center px-4 py-12 text-center">
      {icon && <span className="mb-3 grid size-11 place-items-center rounded-2xl bg-soft text-muted">{icon}</span>}
      <p className="text-[15px] text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-[13px] text-muted">{children}</div>}
    </div>
  );
}

export const Notice = ({ children, tone = "sun", className }: { children: ReactNode; tone?: "sun" | "blue" | "green" | "red"; className?: string }) => (
  <div
    className={cx(
      "rounded-[14px] px-4 py-3 text-[13.5px]",
      tone === "sun" ? "bg-sun-soft text-[#4d3c00]" : tone === "blue" ? "bg-info-tint text-info-ink" : tone === "green" ? "bg-ok-tint text-brand-deep" : "bg-danger-tint text-danger-ink",
      className,
    )}
  >
    {children}
  </div>
);

/** Link tabs ("Overview · Courses · Fees…"), driven by a search param. */
export function LinkTabs({ tabs, active }: { tabs: { key: string; label: ReactNode; href: string; count?: number }[]; active: string }) {
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1" aria-label="Sections">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          scroll={false}
          aria-current={t.key === active ? "page" : undefined}
          className={cx(
            "relative flex h-11 shrink-0 items-center gap-2 px-3 text-[14px] transition-colors",
            t.key === active ? "text-ink after:absolute after:inset-x-2 after:-bottom-px after:h-[2px] after:rounded-full after:bg-ink" : "text-muted hover:text-ink",
          )}
        >
          {t.label}
          {t.count !== undefined && <Badge tone="light">{t.count}</Badge>}
        </Link>
      ))}
    </nav>
  );
}

/** Pill tabs (Pending · Verified · All), link-based. */
export function PillTabs({ tabs, active }: { tabs: { key: string; label: ReactNode; href: string }[]; active: string }) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-full bg-soft p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          scroll={false}
          aria-current={t.key === active ? "page" : undefined}
          className={cx("h-8 shrink-0 rounded-full px-4 text-[13px] leading-8 transition-colors", t.key === active ? "bg-white text-ink shadow-[0_1px_3px_rgba(23,38,15,.12)]" : "text-muted hover:text-ink")}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export function Pager({ page, pageSize, total, href }: { page: number; pageSize: number; total: number; href: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);
  const cls = "grid size-9 place-items-center rounded-full border border-line-2 bg-white text-[13px]";
  return (
    <nav className="flex items-center gap-1.5" aria-label="Pages">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cls} aria-label="Previous page">
          ‹
        </Link>
      ) : (
        <span className={cx(cls, "opacity-40")}>‹</span>
      )}
      {nums.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && nums[i - 1]! < p - 1 && <span className="text-muted">…</span>}
          <Link href={href(p)} aria-current={p === page ? "page" : undefined} className={cx(cls, p === page && "border-ink bg-ink text-white")}>
            {p}
          </Link>
        </span>
      ))}
      {page < pages ? (
        <Link href={href(page + 1)} className={cls} aria-label="Next page">
          ›
        </Link>
      ) : (
        <span className={cx(cls, "opacity-40")}>›</span>
      )}
    </nav>
  );
}

/** Thin progress bar (attendance column, homework cards). */
export function Bar({ value, tone = "green", className }: { value: number; tone?: "green" | "sun" | "red"; className?: string }) {
  return (
    <span className={cx("block h-1.5 overflow-hidden rounded-full bg-soft", className)}>
      <span className={cx("block h-full rounded-full", tone === "green" ? "bg-brand" : tone === "sun" ? "bg-sun" : "bg-danger")} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  );
}

/** Field look without size: combine with a height/width ("h-11 w-32 px-3.5"). */
export const inputBase =
  "rounded-xl border border-field bg-white text-base text-ink transition-colors outline-none placeholder:text-ghost focus:border-ink/40 focus:ring-2 focus:ring-brand/15 disabled:bg-soft disabled:text-muted sm:text-[14px] aria-[invalid=true]:border-danger aria-[invalid=true]:bg-danger-soft";
export const inputCls = `${inputBase} h-11 w-full px-3.5`;
export const textareaCls = `${inputBase} block w-full resize-none px-3.5 py-3`;
export const labelCls = "mb-1.5 block text-[12.5px] text-ink-soft";
