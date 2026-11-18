import Link from "next/link";
import { Alert, ArrowRight } from "../icons";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** The square icon above each heading. Tones from the designs: green, yellow, white. */
export function IconTile({ tone, children }: { tone: "green" | "yellow" | "white"; children: React.ReactNode }) {
  const inner = {
    green: "bg-brand text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
    yellow: "bg-sun text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]",
    white: "bg-white text-ink",
  }[tone];
  return (
    <div className="mx-auto w-fit rounded-[16px] bg-[#e5e8e0] p-[4px]">
      <div className={cx("grid size-[44px] place-items-center rounded-[12px] [&>svg]:size-[19px]", inner)}>{children}</div>
    </div>
  );
}

/** "Step n of 3" bars used by the activation and password-reset flows. */
export function StepBars({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <div className="mx-auto mt-6 flex w-fit gap-1.5" role="img" aria-label={`Step ${step} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cx("h-[3px] w-8 rounded-full transition-colors duration-500", i < step ? "bg-ink" : "bg-[#dcdfd6]")} />
      ))}
    </div>
  );
}

export function Heading({ title, lead, className }: { title: React.ReactNode; lead?: React.ReactNode; className?: string }) {
  return (
    <div className={cx("text-center", className)}>
      <h1 className="text-balance text-[1.75rem] font-normal leading-[1.15] tracking-[-0.012em] text-ink sm:text-[1.9rem]">{title}</h1>
      {lead && <p className="mx-auto mt-2 max-w-[24rem] text-pretty text-[15px] leading-[1.5] text-muted">{lead}</p>}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="my-4 flex items-center gap-4 text-[12px] text-ghost" role="separator" aria-label="or">
      <span className="h-px flex-1 bg-[#dcdfd6]" />
      Or
      <span className="h-px flex-1 bg-[#dcdfd6]" />
    </div>
  );
}

export const primaryButton =
  "group inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-[10px] bg-ink px-5 text-[15px] text-white shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_6px_18px_-10px_rgba(23,38,15,0.8)] transition-[background-color,box-shadow,translate] duration-200 hover:bg-[#223a17] active:translate-y-px disabled:cursor-not-allowed disabled:bg-[#dee1d9] disabled:text-ink/75 disabled:shadow-none";

export const secondaryButton =
  "inline-flex h-[46px] w-full items-center justify-center gap-2.5 rounded-[10px] border border-soft-line bg-soft px-5 text-[15px] text-ink transition-colors duration-200 hover:border-[#cfd3c8] hover:bg-[#e1e4dc] active:translate-y-px";

/** Arrow that nudges right on hover, as on the primary buttons. */
export const ButtonArrow = () => <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />;

export function ButtonLink({
  href,
  variant = "primary",
  children,
  className,
}: {
  href: string;
  variant?: "primary" | "secondary";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cx(variant === "primary" ? primaryButton : secondaryButton, className)}>
      {children}
    </Link>
  );
}

/** Error / notice box above a form. `role="alert"` so screen readers announce it. */
export function FormAlert({
  tone = "error",
  children,
  className,
}: {
  tone?: "error" | "info";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "flex gap-2.5 rounded-[10px] border px-3.5 py-3 text-left text-[13.5px] leading-[1.45]",
        tone === "error" ? "anim-shake border-[#f3c9bf] bg-danger-soft text-[#7a2112]" : "border-[#cfe0bf] bg-[#f1f7ea] text-ink-soft",
        className,
      )}
    >
      <Alert className={cx("mt-px size-[18px] shrink-0", tone === "error" ? "text-danger" : "text-brand")} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export const inlineLink = "font-medium text-brand underline-offset-4 hover:underline";
