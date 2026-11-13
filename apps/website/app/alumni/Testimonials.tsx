"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { Testimonial } from "@/content/people";
import { ArrowLeft, ArrowRight, Quote, Star } from "@/components/icons";
import { cx } from "@/components/ui";

/** Time on each review scales with its length (5–12 s) so long reviews can be read. */
const readTime = (q: string) => Math.min(12000, Math.max(5000, 2500 + q.length * 35));

function Stars({ className }: { className?: string }) {
  return (
    <span className={cx("flex gap-0.5 text-sun", className)} aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="size-3" />
      ))}
    </span>
  );
}

/** Initials from a reviewer's name, e.g. "Christy Sandra Fernando B" → "CS". */
function initials(name: string) {
  const parts = name.replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** Colour blocks used for the monogram panel / list avatars (cycled by index). */
const tones = [
  { panel: "bg-[linear-gradient(150deg,#2b7010_0%,#1f5a0a_100%)]", text: "text-white", ring: "bg-white/10", chip: "bg-brand text-white" },
  { panel: "bg-[linear-gradient(150deg,#f6c90e_0%,#e0b30b_100%)]", text: "text-ink", ring: "bg-white/25", chip: "bg-sun text-ink" },
  { panel: "bg-[linear-gradient(150deg,#24361b_0%,#17260f_100%)]", text: "text-white", ring: "bg-white/[0.07]", chip: "bg-ink text-sun" },
  { panel: "bg-[linear-gradient(150deg,#dce8cf_0%,#c4d8b1_100%)]", text: "text-ink", ring: "bg-white/35", chip: "bg-sage text-brand" },
] as const;

/** Long reviews get a smaller type size so every slide stays balanced. */
function quoteSize(q: string) {
  if (q.length > 240) return "text-lg sm:text-xl lg:text-[1.3rem]";
  if (q.length > 150) return "text-xl lg:text-[1.45rem]";
  return "text-2xl lg:text-[1.6rem]";
}

/**
 * Real Google reviews (content/people.ts).
 * Left: testimonial cards that slide sideways on their own (slowly, pausing on hover/focus).
 * Right: the list of reviewers scrolling upwards continuously; clicking a name jumps to it.
 */
export function Testimonials({ items }: { items: Testimonial[] }) {
  const n = items.length;
  // `pos` runs 0..n where slide n is a clone of slide 0. Moving forward from the last review
  // slides onto the clone, then snaps (without animation) back to the real first slide, so the
  // carousel always travels forward: 1 → 2 → … → n → 1 → 2 …
  const [pos, setPos] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const i = pos % n;

  const next = useCallback(() => {
    setAnimate(true);
    setPos((p) => (p >= n ? p : p + 1));
  }, [n]);

  const prev = useCallback(() => {
    if (pos === 0) {
      // jump silently to the clone at the end, then animate one step back
      setAnimate(false);
      setPos(n);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setAnimate(true);
          setPos(n - 1);
        }),
      );
    } else {
      setAnimate(true);
      setPos((p) => p - 1);
    }
  }, [pos, n]);

  const goTo = (idx: number) => {
    setAnimate(true);
    setPos(idx);
  };

  // After landing on the clone, snap back to the real first slide.
  const onTransitionEnd = () => {
    if (pos === n) {
      setAnimate(false);
      setPos(0);
    }
  };

  // Re-enable the slide animation once the snap has been painted.
  useEffect(() => {
    if (animate) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    return () => cancelAnimationFrame(id);
  }, [animate]);

  const dwell = readTime(items[pos % n]!.quote);
  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(next, dwell);
    return () => window.clearTimeout(id);
  }, [paused, next, pos, dwell]);

  const cur = items[i]!;

  return (
    <div className="mt-12 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      {/* ---- horizontal slider ---- */}
      <article
        className="relative overflow-hidden rounded-[1.25rem] bg-white"
        aria-roledescription="carousel"
        aria-label="Parent reviews"
        onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
        onPointerLeave={() => setPaused(false)}
      >
        <div
          className={cx("flex", animate && "transition-transform duration-[1100ms] ease-[cubic-bezier(0.65,0,0.35,1)]")}
          style={{ transform: `translateX(-${pos * 100}%)` }}
          onTransitionEnd={(e) => e.target === e.currentTarget && onTransitionEnd()}
        >
          {[...items, items[0]!].map((t, idx) => (
            <div
              key={`${t.name}-${idx}`}
              className="grid w-full shrink-0 gap-6 p-2 sm:grid-cols-[minmax(0,0.75fr)_1fr]"
              aria-hidden={idx !== pos}
              aria-roledescription="slide"
              aria-label={`${(idx % n) + 1} of ${n}`}
            >
              {/* reviewer panel: initials monogram (no reviewer photos; see content/people.ts) */}
              <div
                className={cx(
                  "relative flex min-h-[220px] flex-col items-center justify-center overflow-hidden rounded-[1rem] px-6 pb-16 pt-8 text-center sm:min-h-[360px]",
                  tones[(idx % n) % tones.length]!.panel,
                  tones[(idx % n) % tones.length]!.text,
                )}
              >
                <span aria-hidden className={cx("absolute -right-12 -top-12 size-44 rounded-full", tones[(idx % n) % tones.length]!.ring)} />
                <span aria-hidden className={cx("absolute -bottom-16 -left-10 size-40 rounded-full", tones[(idx % n) % tones.length]!.ring)} />
                {t.photo ? (
                  <Image
                    src={t.photo}
                    alt={`${t.name}’s profile photo`}
                    width={224}
                    height={224}
                    className="relative size-24 rounded-full object-cover shadow-[0_10px_30px_-10px_rgba(0,0,0,0.45)] ring-4 ring-white/30 sm:size-28"
                  />
                ) : (
                  <span className="relative grid size-24 place-items-center rounded-full bg-white/15 text-4xl font-medium tracking-tight ring-1 ring-white/25 backdrop-blur-sm sm:size-28 sm:text-[2.6rem]">
                    {initials(t.name)}
                  </span>
                )}
                <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-full bg-white/90 px-4 py-2 backdrop-blur">
                  <span className="text-[0.7rem] font-medium text-ink">Google review</span>
                  <Stars />
                </div>
              </div>
              <div className="relative flex flex-col p-4 pt-6 sm:p-6 sm:pl-2">
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-full bg-sun text-ink">
                    <Quote className="size-5" />
                  </span>
                  <span className="rounded-full bg-mist px-4 py-1.5 text-[0.7rem] text-ink-soft">{t.topic}</span>
                </div>
                <blockquote lang={t.lang} className="relative my-8">
                  <p className={cx("relative z-10 font-light leading-snug text-ink", t.lang === "ta" ? "text-lg lg:text-xl" : quoteSize(t.quote))}>
                    “{t.quote}”
                  </p>
                  {t.translation ? (
                    <p lang="en" className="relative z-10 mt-3 text-sm leading-relaxed text-muted">
                      Translation: {t.translation}
                    </p>
                  ) : null}
                  <Quote aria-hidden className="pointer-events-none absolute -bottom-10 right-0 size-28 text-mist" />
                </blockquote>
                <div className="mt-auto pr-0 sm:pr-40">
                  <p className="text-sm font-semibold text-ink">{t.name}</p>
                  <p className="text-xs text-muted">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* controls (stay fixed while slides move) */}
        <div className="absolute bottom-6 right-6 flex items-center gap-3 sm:bottom-8 sm:right-8">
          <span className="text-xs tabular-nums text-muted">
            {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous review"
            className="btn-gloss btn-gloss-light grid size-10 place-items-center rounded-full border border-line bg-white text-ink hover:bg-sun"
          >
            <ArrowLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next review"
            className="btn-gloss grid size-10 place-items-center rounded-full bg-ink text-sun hover:bg-brand"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
        {/* progress bar for the auto-advance */}
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-mist">
          <span
            key={`${i}-${paused}`}
            className="block h-full bg-sun"
            style={paused ? { width: "0%" } : { animation: `progress ${dwell}ms linear forwards` }}
          />
        </span>
        <span className="sr-only" aria-live="polite">
          Showing review {i + 1} of {items.length}: {cur.name}
        </span>
      </article>

      {/* ---- vertical auto-scrolling list ---- */}
      <div className="marquee-pause fade-y relative h-[380px] overflow-hidden lg:h-auto lg:min-h-[376px]">
        <ul className="marquee-y lg:absolute lg:inset-x-0 lg:top-0" style={{ ["--marquee-duration" as string]: "26s" }} aria-label="Reviews">
          {[...items, ...items].map((t, k) => {
            const idx = k % n;
            const on = idx === i;
            const dup = k >= n;
            return (
              <li key={`${t.name}-${k}`} className="pb-2" aria-hidden={dup || undefined}>
                <button
                  type="button"
                  tabIndex={dup ? -1 : 0}
                  onClick={() => goTo(idx)}
                  aria-current={on ? "true" : undefined}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left transition-all duration-500",
                    on ? "bg-ink text-white shadow-[0_10px_24px_-14px_rgba(23,38,15,0.7)]" : "bg-white text-ink hover:translate-x-1 hover:bg-paper",
                  )}
                >
                  {t.photo ? (
                    <Image src={t.photo} alt="" width={80} height={80} className={cx("size-10 shrink-0 rounded-full object-cover", on && "ring-2 ring-white/40")} />
                  ) : (
                    <span
                      aria-hidden
                      className={cx(
                        "grid size-10 shrink-0 place-items-center rounded-full text-sm font-medium",
                        on ? "bg-white/15 text-white ring-1 ring-white/25" : tones[idx % tones.length]!.chip,
                      )}
                    >
                      {initials(t.name)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{t.name}</span>
                    <span className={cx("block truncate text-xs", on ? "text-white/70" : "text-muted")}>{t.role}</span>
                  </span>
                  <span className={cx("text-xs", on ? "text-white" : "text-ink-soft")}>{t.topic}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
