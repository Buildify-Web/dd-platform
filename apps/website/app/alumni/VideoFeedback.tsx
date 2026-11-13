"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { VideoFeedback as Item } from "@/content/video-feedback";
import { ArrowLeft, ArrowRight, Check, GradCap, Pause, Play, Star, Volume, VolumeOff } from "@/components/icons";
import { cx } from "@/components/ui";

const isDev = process.env.NODE_ENV === "development";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-0.5 text-sun" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={cx("size-4", i >= Math.round(rating) && "opacity-25")} />
        ))}
      </span>
      <span className="text-xs text-white/55">{rating.toFixed(1)} rating</span>
    </span>
  );
}

/**
 * "Student's feedback": one card with a portrait video on the left and the review beside it.
 * - Story-style progress segments on the video (one per student); the active one fills as it plays.
 * - Plays muted and only while on screen (never autoplays under reduced motion); sound toggle top-right.
 * - When a clip ends it moves to the next student. Arrows, ←/→ keys and swiping also navigate.
 * - A missing file shows a clean "Video coming soon" placeholder (plus the expected path in dev).
 */
export function VideoFeedback({ items }: { items: Item[] }) {
  const n = items.length;
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [missing, setMissing] = useState<Record<string, true>>({});
  const [inView, setInView] = useState(false);
  const [reduce, setReduce] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const swipe = useRef<number | null>(null);
  /** set by a swipe so the click that follows it doesn't also toggle play */
  const swiped = useRef(false);

  const cur = items[index]!;
  const isMissing = !!missing[cur.id];
  const go = useCallback(
    (dir: 1 | -1) => {
      setProgress(0);
      setIndex((i) => (i + dir + n) % n);
    },
    [n],
  );
  const goTo = (i: number) => {
    setProgress(0);
    setIndex(i);
  };

  // reduced motion + on-screen detection
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setReduce(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    const el = rootRef.current;
    const io = el ? new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { threshold: 0.35 }) : null;
    if (el && io) io.observe(el);
    return () => {
      mq.removeEventListener("change", onMq);
      io?.disconnect();
    };
  }, []);

  // play the active clip while visible; pause otherwise
  useEffect(() => {
    const v = videoRef.current;
    if (!v || isMissing) return;
    if (inView && !reduce) v.play().catch(() => {});
    else v.pause();
  }, [index, inView, reduce, isMissing]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, index]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    if (!v || isMissing) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const onPointerDown = (e: PointerEvent) => {
    swipe.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent) => {
    const x = swipe.current;
    swipe.current = null;
    if (x === null) return;
    const dx = e.clientX - x;
    if (Math.abs(dx) > 50) {
      swiped.current = true;
      go(dx < 0 ? 1 : -1);
    }
  };

  const rating = cur.rating ?? 5;
  const nextItem = items[(index + 1) % n]!;

  return (
    <article
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label="Student video feedback"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      className="relative mt-12 overflow-hidden rounded-[1.75rem] bg-ink p-2 text-white shadow-[0_40px_80px_-40px_rgba(23,38,15,0.65)] sm:p-2.5"
    >
      {/* brand glows */}
      <span aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[440px] rounded-full bg-[radial-gradient(circle,rgba(82,196,39,0.32),transparent_65%)]" />
      <span aria-hidden className="pointer-events-none absolute -bottom-48 left-[30%] size-[420px] rounded-full bg-[radial-gradient(circle,rgba(246,201,14,0.14),transparent_65%)]" />

      <div className="relative grid gap-2.5 md:grid-cols-[minmax(0,18rem)_1fr] lg:grid-cols-[minmax(0,20.5rem)_1fr]">
        {/* ───────── video ───────── */}
        <div
          className="relative aspect-[9/14] touch-pan-y select-none overflow-hidden rounded-[1.35rem] bg-[#0e1809] sm:aspect-[9/16]"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          {isMissing ? (
            <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(120%_80%_at_30%_15%,#2b7010_0%,#1c3013_45%,#0e1809_100%)] p-6 text-center">
              <div>
                <span className="mx-auto grid size-16 place-items-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur">
                  <Play className="ml-1 size-6 text-sun" />
                </span>
                <p className="mt-4 text-sm font-medium text-white">Video coming soon</p>
                <p className="mt-1 text-xs text-white/55">Student feedback {String(index + 1).padStart(2, "0")}</p>
                {isDev ? (
                  <p className="mx-auto mt-4 max-w-[15rem] rounded-lg bg-black/30 px-3 py-2 font-mono text-[0.65rem] leading-snug text-white/70 [overflow-wrap:anywhere]">
                    public{cur.video}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <video
              key={cur.id}
              ref={videoRef}
              src={cur.video}
              poster={cur.poster}
              muted
              playsInline
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration) setProgress(v.currentTime / v.duration);
              }}
              onEnded={() => (n > 1 ? go(1) : setPlaying(false))}
              onError={() => setMissing((m) => ({ ...m, [cur.id]: true }))}
              className="absolute inset-0 size-full object-cover"
            />
          )}

          {/* tap-to-play layer (under the controls) */}
          {!isMissing ? (
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pause video" : "Play video"}
              className="group/play absolute inset-0 grid place-items-center"
            >
              <span
                className={cx(
                  "grid size-16 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md transition-[opacity,scale] duration-300",
                  playing ? "scale-90 opacity-0 group-hover/play:opacity-100 group-focus-visible/play:opacity-100" : "opacity-100",
                )}
              >
                {playing ? <Pause className="size-6" /> : <Play className="ml-1 size-6" />}
              </span>
            </button>
          ) : null}

          {/* top: story segments + chips */}
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/45 to-transparent p-3 pb-10">
            <div className="flex gap-1" aria-hidden>
              {items.map((it, i) => (
                <span key={it.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
                  <span
                    className="block h-full rounded-full bg-white transition-[width] duration-200 ease-linear"
                    style={{ width: i < index ? "100%" : i === index ? `${progress * 100}%` : "0%" }}
                  />
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="rounded-full bg-black/35 px-2.5 py-1 text-[0.7rem] tabular-nums text-white/90 backdrop-blur">
                {String(index + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
              </span>
              {!isMissing ? (
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? "Turn sound on" : "Turn sound off"}
                  aria-pressed={!muted}
                  className="pointer-events-auto grid size-10 place-items-center rounded-full bg-black/40 text-white ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-sun hover:text-ink"
                >
                  {muted ? <VolumeOff className="size-[1.1rem]" /> : <Volume className="size-[1.1rem]" />}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* ───────── review ───────── */}
        <div className="flex min-w-0 flex-col rounded-[1.35rem] bg-white/[0.04] p-5 ring-1 ring-white/[0.07] sm:p-8">
          <p className="sr-only" aria-live="polite">
            Student {index + 1} of {n}: {cur.student}
          </p>
          <div key={cur.id} className="anim-rise flex flex-1 flex-col md:justify-center">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-bright/15 px-3 py-1 text-xs font-medium text-brand-bright ring-1 ring-brand-bright/30">
                <span className="size-1.5 rounded-full bg-brand-bright" />
                Verified student
              </span>
              <Stars rating={rating} />
            </div>

            <h3 className="mt-5 text-[1.6rem] font-medium leading-[1.2] tracking-tight text-white sm:text-[2rem]">{cur.headline}</h3>

            <div className="mt-6 flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sun/15 text-sun ring-1 ring-sun/25">
                <GradCap className="size-[1.1rem]" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.65rem] uppercase tracking-[0.12em] text-white/45">Student</p>
                <p className="truncate text-base font-medium text-white">{cur.student}</p>
              </div>
            </div>

            <ul className="mt-7 space-y-3.5 border-t border-white/10 pt-6">
              {cur.points.map((p) => (
                <li key={p} className="flex gap-3 text-[0.95rem] leading-relaxed text-white/80">
                  <span className="mt-[0.2rem] grid size-5 shrink-0 place-items-center rounded-full bg-sun text-ink">
                    <Check className="size-3" strokeWidth={2.6} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* navigation */}
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={() => go(1)}
              className="group min-w-0 text-left"
              aria-label={`Next: ${nextItem.student}`}
            >
              <span className="block text-[0.65rem] uppercase tracking-[0.12em] text-white/40">Up next</span>
              <span className="block truncate text-sm text-white/85 transition-colors group-hover:text-sun">{nextItem.student}</span>
            </button>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous video"
                className="grid size-11 place-items-center rounded-full bg-white/[0.07] text-white ring-1 ring-white/15 transition-colors hover:bg-sun hover:text-ink"
              >
                <ArrowLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next video"
                className="grid size-11 place-items-center rounded-full bg-sun text-ink transition-colors hover:bg-white"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>

          {/* jump list (keyboard / screen reader friendly; dots for small counts) */}
          {n <= 12 ? (
            <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Choose a video">
              {items.map((it, i) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Video ${i + 1}: ${it.student}`}
                  aria-current={i === index ? "true" : undefined}
                  className="-my-2 py-2"
                >
                  <span className={cx("block h-1.5 rounded-full transition-all duration-300", i === index ? "w-6 bg-sun" : "w-1.5 bg-white/25 hover:bg-white/50")} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
