import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Check, User } from "./icons";

export function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

/** Max-width content wrapper used by every section. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("mx-auto w-full max-w-[1320px] px-5 md:px-8", className)}>{children}</div>;
}

type PillProps = {
  href: string;
  children: ReactNode;
  /** colour of the arrow circle on the right */
  circle?: "white" | "sun";
  icon?: ReactNode;
  className?: string;
  size?: "md" | "lg";
};

function isExternal(href: string) {
  return /^(https?:|mailto:|tel:)/.test(href);
}

/** Dark pill button with a round arrow badge — the primary CTA across the site. */
export function PillButton({ href, children, circle = "white", icon, className, size = "md" }: PillProps) {
  const inner = (
    <>
      <span>{children}</span>
      <span
        className={cx(
          "grid place-items-center rounded-full text-ink transition-transform duration-300 group-hover:rotate-45",
          circle === "sun" ? "bg-sun" : "bg-white",
          size === "lg" ? "size-10" : "size-8",
        )}
      >
        {icon ?? <ArrowUpRight className="size-4" />}
      </span>
    </>
  );
  const cls = cx(
    "btn-gloss group inline-flex items-center justify-between gap-6 rounded-full bg-ink text-white hover:bg-brand",
    size === "lg" ? "py-2 pl-7 pr-2 text-[0.95rem]" : "py-1.5 pl-6 pr-1.5 text-sm",
    className,
  );
  if (isExternal(href)) {
    const ext = href.startsWith("http");
    return (
      <a href={href} className={cls} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

/** White circular arrow button used at the bottom-right of cards. */
export function CircleArrow({ className, label }: { className?: string; label?: string }) {
  return (
    <span
      className={cx(
        "grid size-8 shrink-0 place-items-center rounded-full bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-transform duration-300 group-hover:rotate-45",
        className,
      )}
      aria-hidden={label ? undefined : true}
    >
      <ArrowUpRight className="size-3.5" />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

export function CheckBadge({ className }: { className?: string }) {
  return (
    <span className={cx("grid size-5 place-items-center rounded-full bg-sun text-ink", className)}>
      <Check className="size-3" strokeWidth={2.4} />
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("eyebrow", className)}>{children}</p>;
}

/** Placeholder-style person tile (coloured block with a soft silhouette) used where no photo exists. */
export function PersonTile({
  tone,
  className,
  children,
}: {
  tone: "brand" | "ink" | "sun" | "sage";
  className?: string;
  children?: ReactNode;
}) {
  const tones = {
    brand: { bg: "bg-brand", fg: "bg-[#4a8a2c]", ring: "bg-[#3b7d1d]" },
    ink: { bg: "bg-ink", fg: "bg-[#33452a]", ring: "bg-[#24361b]" },
    sun: { bg: "bg-sun", fg: "bg-[#e0b30b]", ring: "bg-[#fbdc5f]" },
    sage: { bg: "bg-sage", fg: "bg-sage-deep", ring: "bg-[#cfe0bf]" },
  }[tone];
  return (
    <div className={cx("relative overflow-hidden", tones.bg, className)}>
      <span className={cx("absolute -right-[12%] -top-[14%] aspect-square w-[62%] rounded-full", tones.ring)} />
      <span className={cx("absolute left-1/2 top-[36%] aspect-square w-[28%] -translate-x-1/2 rounded-full", tones.fg)} />
      <span className={cx("absolute -bottom-[22%] left-1/2 aspect-square w-[64%] -translate-x-1/2 rounded-full", tones.fg)} />
      {children}
    </div>
  );
}

export function AvatarFallback({ tone = "brand", className }: { tone?: "brand" | "ink"; className?: string }) {
  return (
    <span
      className={cx(
        "grid place-items-center overflow-hidden rounded-full",
        tone === "brand" ? "bg-brand text-[#7fb35f]" : "bg-ink text-[#4a5c40]",
        className,
      )}
    >
      <User className="size-[70%] translate-y-[12%]" fill="currentColor" stroke="none" />
    </span>
  );
}
