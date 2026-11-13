"use client";

import { useEffect, useState } from "react";
import { cx } from "@/components/ui";

type Section = { id: string; label: string };

/**
 * Floating left-side section nav for the About page (lg and up).
 * - Appears once the inline "On this page" chips (`#about-toc`) slide under the navbar,
 *   and hides again before the CTA band / footer (after the last section ends).
 * - Collapsed it shows numbered circles (slim dots below 1400px, where the gutter is 32px); hovering or focusing the rail slides the labels out.
 * - The current section (the last one whose top passed 35% of the viewport) is filled yellow.
 * Glass styling matches the scrolled navbar so the two read as one system.
 */
export function SectionRail({ sections }: { sections: Section[] }) {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const toc = document.getElementById("about-toc");
      const last = document.getElementById(sections[sections.length - 1]!.id);
      const vh = window.innerHeight;
      // 96px ≈ the fixed navbar, so the rail takes over as the chips slide under it
      const pastToc = toc ? toc.getBoundingClientRect().bottom < 96 : false;
      const beforeEnd = last ? last.getBoundingClientRect().bottom > vh * 0.45 : true;
      setVisible(pastToc && beforeEnd);

      let idx = 0;
      sections.forEach((s, i) => {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= vh * 0.35) idx = i;
      });
      setActive(idx);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [sections]);

  return (
    <nav
      aria-label="Sections on this page"
      inert={!visible}
      className={cx(
        "group fixed left-1.5 top-1/2 z-40 hidden -translate-y-1/2 transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block min-[1400px]:left-4",
        visible ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-6 opacity-0",
      )}
    >
      <ul className="flex flex-col gap-0.5 rounded-xl bg-mist/80 p-1 min-[1400px]:gap-1 min-[1400px]:rounded-[1.4rem] min-[1400px]:p-1.5 shadow-[0_10px_40px_-12px_rgba(23,38,15,0.28),inset_0_1px_0_rgba(255,255,255,0.7)] ring-1 ring-white/60 backdrop-blur-lg">
        {sections.map((s, i) => {
          const on = i === active;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={on ? "location" : undefined}
                className={cx(
                  "flex items-center rounded-full transition-[background-color,padding] duration-300",
                  on ? "bg-sun shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_6px_-2px_rgba(158,124,6,0.5)]" : "hover:bg-white/80",
                  "group-hover:pr-4 group-focus-within:pr-4",
                )}
              >
                {/* below 1400px the page gutter is only 32px, so the rail shows slim dots; numbers above */}
                <span
                  className={cx(
                    "grid h-8 w-4 shrink-0 place-items-center rounded-full text-[0.7rem] tabular-nums transition-colors min-[1400px]:size-9",
                    on ? "font-semibold text-ink" : "text-ink-soft",
                  )}
                >
                  <span
                    aria-hidden
                    className={cx("rounded-full bg-current transition-[width,height] min-[1400px]:hidden", on ? "size-2" : "size-1.5 opacity-60")}
                  />
                  <span className="hidden min-[1400px]:inline">{String(i + 1).padStart(2, "0")}</span>
                </span>
                <span
                  className={cx(
                    "ml-0 max-w-0 overflow-hidden whitespace-nowrap text-sm opacity-0 group-hover:ml-1.5 group-focus-within:ml-1.5 min-[1400px]:group-hover:ml-0 min-[1400px]:group-focus-within:ml-0 transition-[max-width,opacity,margin] duration-300 ease-out",
                    "group-hover:max-w-[12rem] group-hover:opacity-100 group-focus-within:max-w-[12rem] group-focus-within:opacity-100",
                    on ? "font-medium text-ink" : "text-ink",
                  )}
                >
                  {s.label}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
