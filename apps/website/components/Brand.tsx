import { cx } from "./ui";

/*
 * Vertical rhythm, in em of the wordmark font size. `text-box: trim-both cap alphabetic`
 * strips the font's built-in space above the capitals and below the baseline, so the
 * padding below is exactly what you see around the letters.
 *   band    = 0.7 (cap height) + 2 × 0.42 (padding) = 1.54
 *   gap     = 0.42
 *   tagline = 0.5 × 0.7 (cap height)                = 0.35
 *   total   ≈ 2.1 as rendered (measured) → BRAND_HEIGHT, used for the emblem so both line up top and bottom.
 */
export const BRAND_HEIGHT = "h-[2.1em]";
const trim = "[text-box:trim-both_cap_alphabetic]";

/**
 * The "DYNAMIC DONALDS / Education is Life" name from the logo, rebuilt as live text
 * so it stays crisp and readable at navbar size. Sized entirely in `em`, so set the
 * size with a font-size class and it scales proportionally (the intro loader relies on this).
 */
export function BrandWordmark({ className, ...rest }: { className?: string } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cx("inline-flex flex-col items-stretch leading-none", className)} {...rest}>
      <span
        className={cx(
          "block whitespace-nowrap rounded-[0.22em] bg-brand px-[0.6em] py-[0.42em] text-center font-extrabold uppercase tracking-[0.05em] text-sun",
          trim,
        )}
      >
        {/* tracking adds space after the last letter too; pull it back so the text is truly centred */}
        <span className="mr-[-0.05em]">Dynamic Donalds</span>
      </span>
      <span className={cx("mt-[0.42em] block whitespace-nowrap text-center text-[0.5em] font-medium tracking-[0.42em] text-brand", trim)}>
        <span className="mr-[-0.42em]">Education is Life</span>
      </span>
    </span>
  );
}
