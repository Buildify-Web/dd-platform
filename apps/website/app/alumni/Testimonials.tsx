"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { Testimonial } from "@/content/people";
import { ArrowLeft, ArrowRight, Quote, Star } from "@/components/icons";
import { AvatarFallback, cx } from "@/components/ui";

const AUTO_ADVANCE_MS = 4000;

function Stars({ className }: { className?: string }) {
  return (
    <span className={cx("flex gap-0.5 text-sun", className)} aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="size-3" />
      ))}
    </span>
  );
}

/**
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

  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(next, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(id);
  }, [paused, next, pos]);

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
              <div className="relative aspect-[4/4.6] overflow-hidden rounded-[1rem] bg-mist sm:aspect-auto sm:min-h-[360px]">
                <Image src={t.photo} alt="" fill sizes="(min-width:1024px) 22vw, 90vw" className="object-cover" />
                <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-full bg-white/90 px-4 py-2 backdrop-blur">
                  <span className="text-[0.7rem] font-medium text-ink">Verified review</span>
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
                <blockquote className="relative my-8 text-2xl font-light leading-snug text-ink lg:text-[1.6rem]">
                  “ {t.quote} ”
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
            className={cx("block h-full bg-sun", !paused && "animate-[progress_4s_linear_forwards]")}
            style={{ width: paused ? "0%" : undefined }}
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
                    on ? "bg-ink text-white shadow-[0_10px_24px_-14px_rgba(23,38,15,0.7)]" : "bg-white text-ink hover:bg-paper",
                  )}
                >
                  {t.avatar ? (
                    <Image src={t.avatar} alt="" width={40} height={40} className="size-10 rounded-full object-cover" />
                  ) : (
                    <AvatarFallback tone={idx % 2 ? "brand" : "ink"} className="size-10" />
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
