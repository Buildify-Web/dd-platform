"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandWordmark } from "./Brand";
import { cx } from "./ui";

const HOLD_MS = 2300; // logo on screen before it flies to the navbar
const FLY_MS = 950; // keep in sync with the duration-[950ms] classes below

/**
 * Home-page intro: the logo appears centred, then the emblem and the name fly into
 * their places in the navbar ([data-brand="mark"] / [data-brand="name"]) while the
 * overlay fades. Plays only when the site is first opened on "/" (it lives in the
 * root layout, so client-side navigation never replays it).
 */
export function IntroLoader() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"hold" | "fly" | "done">(() => (pathname === "/" ? "hold" : "done"));
  const [reduce, setReduce] = useState(false);
  const markRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "hold") return;
    const html = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pairs = [
      [markRef.current, document.querySelector<HTMLElement>('[data-brand="mark"]')],
      [nameRef.current, document.querySelector<HTMLElement>('[data-brand="name"]')],
    ] as const;

    const showTargets = (show: boolean) =>
      pairs.forEach(([, target]) => target && (target.style.opacity = show ? "" : "0"));

    showTargets(false);
    html.style.overflow = "hidden";
    window.scrollTo(0, 0);

    const timers: number[] = [];
    timers.push(
      window.setTimeout(
        () => {
          if (!reduced) {
            // FLIP: move each piece from its spot in the loader onto its navbar counterpart.
            for (const [src, target] of pairs) {
              if (!src || !target) continue;
              const s = src.getBoundingClientRect();
              const t = target.getBoundingClientRect();
              if (!s.width || !t.width) continue;
              src.style.transform = `translate(${t.left - s.left}px, ${t.top - s.top}px) scale(${t.width / s.width})`;
            }
          }
          setReduce(reduced);
          setPhase("fly");
          timers.push(
            window.setTimeout(
              () => {
                showTargets(true);
                html.style.overflow = "";
                setPhase("done");
              },
              reduced ? 400 : FLY_MS,
            ),
          );
        },
        reduced ? 900 : HOLD_MS,
      ),
    );

    return () => {
      timers.forEach(clearTimeout);
      showTargets(true);
      html.style.overflow = "";
    };
    // Runs once on mount; later phases are driven by the timers above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "done") return null;
  const flying = phase === "fly";

  return (
    <div
      aria-hidden
      className={cx(
        "intro-failsafe fixed inset-0 z-[100] grid place-items-center transition-[background-color,opacity] ease-out",
        flying ? "bg-transparent" : "bg-mist",
        flying && reduce && "opacity-0",
        "duration-[700ms]",
      )}
    >
      {/* soft glow behind the logo */}
      <div
        className={cx(
          "pointer-events-none absolute left-1/2 top-1/2 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(246,201,14,0.28)_0%,rgba(246,201,14,0)_65%)] transition-opacity duration-500",
          flying && "opacity-0",
        )}
      />

      <div className="relative flex flex-col items-center">
        <div className="intro-pop">
          <div ref={markRef} className="origin-top-left transition-transform duration-[950ms] ease-[cubic-bezier(0.76,0,0.24,1)]">
            <Image src="/logo-mark.png" alt="" width={336} height={331} priority className="h-28 w-auto md:h-36" />
          </div>
        </div>

        <div className="intro-rise mt-5 md:mt-6">
          <div ref={nameRef} className="origin-top-left transition-transform duration-[950ms] ease-[cubic-bezier(0.76,0,0.24,1)]">
            <BrandWordmark className="text-[1.45rem] md:text-[1.9rem]" />
          </div>
        </div>

        <div
          className={cx(
            "intro-rise mt-9 h-[3px] w-28 overflow-hidden rounded-full bg-ink/10 transition-opacity duration-300",
            flying && "opacity-0",
          )}
        >
          <div className="intro-progress h-full rounded-full bg-brand" />
        </div>
      </div>
    </div>
  );
}
