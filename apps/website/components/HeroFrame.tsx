import type { ReactNode } from "react";
import { cx } from "./ui";

/**
 * Rounded grey frame at the top of every page. Holds the navbar and the page hero.
 */
export function HeroFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="px-2 pt-2 md:px-2.5 md:pt-2.5">
      <section className={cx("relative overflow-hidden rounded-[1.25rem] bg-mist", className)}>
        {/* reserves the space the fixed navbar occupies at the top of the page */}
        <div aria-hidden className="h-[60px] lg:h-[74px]" />
        {children}
      </section>
    </div>
  );
}

/** Centred hero used by Courses / Tutors / Achievements / Gallery / Alumni. */
export function PageHero({
  eyebrow,
  title,
  children,
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  /** description text */
  children: ReactNode;
  /** optional CTA aligned to the right of the description */
  aside?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[920px] px-5 pb-16 pt-14 md:pb-20 md:pt-16">
      <div className={cx(aside ? "mx-auto w-fit" : "text-center")}>
        <p className="eyebrow mb-6">{eyebrow}</p>
        <h1 className={cx("display text-[2.6rem] text-ink sm:text-6xl lg:text-[4.1rem]", aside ? "" : "mx-auto")}>{title}</h1>
        {aside ? (
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-[18rem] text-[0.9rem] leading-snug text-ink-soft">{children}</div>
            {aside}
          </div>
        ) : (
          <div className="mx-auto mt-5 max-w-[22rem] text-[0.9rem] leading-snug text-ink-soft">{children}</div>
        )}
      </div>
    </div>
  );
}
