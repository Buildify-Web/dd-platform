"use client";

import { useState } from "react";
import { ArrowUpRight, BookNote, Calendar, GradCap, Trophy } from "@/components/icons";
import { CheckBadge, cx } from "@/components/ui";

const items = [
  {
    problem: "Not knowing what was taught in class today",
    solution: "Updates after every class",
    chip: "Daily",
    chipSub: "Class updates",
    Icon: BookNote,
  },
  {
    problem: "Worrying whether your child reached class",
    solution: "Instant attendance alerts",
    chip: "RFID",
    chipSub: "Check-in alerts",
    Icon: Calendar,
  },
  {
    problem: "Finding the right course for the grade",
    solution: "Courses mapped to every grade",
    chip: "Pre-KG–12",
    chipSub: "Every grade",
    Icon: GradCap,
  },
  {
    problem: "Preparing for Olympiads and Spell Bee",
    solution: "Coaching with mock tests",
    chip: "Mock",
    chipSub: "Tests & practice",
    Icon: Trophy,
  },
];

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

export function WhyChoose() {
  const [active, setActive] = useState(0);
  const cur = items[active]!;

  return (
    <div className="mt-12 grid items-center gap-6 lg:grid-cols-[1fr_1.05fr] lg:gap-8">
      <ul className="space-y-3" role="tablist" aria-label="Common worries">
        {items.map((it, i) => {
          const on = i === active;
          return (
            <li key={it.problem}>
              <button
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="why-panel"
                onClick={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
                className={cx(
                  "group relative grid h-[76px] w-full grid-cols-[1fr_1.3fr] items-center overflow-hidden rounded-[1rem] pl-6 pr-14 text-left transition-[background-color,box-shadow,translate] duration-500 lg:h-[86px]",
                  EASE,
                  on
                    ? "translate-x-1.5 bg-white shadow-[0_18px_40px_-24px_rgba(23,38,15,0.45)]"
                    : "bg-white/45 hover:bg-white/70",
                )}
              >
                {/* accent bar grows in on the active row */}
                <span
                  aria-hidden
                  className={cx(
                    "absolute left-0 top-1/2 h-[56%] w-1 -translate-y-1/2 rounded-r-full bg-sun transition-[scale] duration-500",
                    EASE,
                    on ? "scale-y-100" : "scale-y-0",
                  )}
                />
                <span
                  aria-hidden
                  className={cx(
                    "origin-bottom-left self-end text-[4.5rem] font-medium leading-[0.72] tracking-tight transition-[color,translate,scale] duration-500 lg:text-[5.25rem]",
                    EASE,
                    on ? "translate-y-0 scale-100 text-ink" : "translate-y-1 scale-[0.94] text-[#dcddd6] group-hover:translate-y-0 group-hover:scale-[0.97] group-hover:text-[#cfd1c8]",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={cx("text-sm text-ink transition-[translate] duration-500", EASE, on ? "translate-x-1" : "group-hover:translate-x-0.5")}>
                  {it.problem}
                </span>
                {/* arrow slides in on the active row */}
                <span
                  aria-hidden
                  className={cx(
                    "absolute right-4 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-sun text-ink transition-[opacity,translate,rotate] duration-500",
                    EASE,
                    on ? "translate-x-0 rotate-45 opacity-100" : "translate-x-3 rotate-0 opacity-0",
                  )}
                >
                  <ArrowUpRight className="size-3.5 -rotate-45" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div
        id="why-panel"
        role="tabpanel"
        aria-live="polite"
        className="group/panel relative h-[320px] overflow-hidden rounded-[1.25rem] bg-[linear-gradient(135deg,#17260f_0%,#1d3214_45%,#2f5a1e_80%,#4a8530_100%)] lg:h-[340px]"
      >
        {/* the green disc turns a little for each item so its highlight shifts */}
        <span
          className={cx(
            "absolute -right-16 -top-24 size-[300px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#2b7010,#3fa61a_70%,#56c92c)] transition-[rotate,scale] duration-700 group-hover/panel:scale-105",
            EASE,
          )}
          style={{ rotate: `${active * 40}deg` }}
        />
        <span
          key={`icon-${active}`}
          className="anim-pop absolute right-[3.25rem] top-[-0.5rem] grid size-[150px] place-items-center rounded-full bg-[linear-gradient(160deg,#f6c90e_0%,#f6c90e_55%,#9e7c06_100%)] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)]"
        >
          <cur.Icon className="size-12 text-ink transition-transform duration-500 group-hover/panel:-rotate-6 group-hover/panel:scale-110" />
        </span>
        <div className="absolute bottom-8 left-6 right-6 flex items-end justify-between gap-4 lg:left-8">
          <div key={`text-${active}`}>
            <p className="anim-rise max-w-[17rem] text-3xl font-light leading-[1.1] text-white lg:text-[2.1rem]">{cur.solution}</p>
            <p className="anim-rise mt-2 text-[0.7rem] text-white/70 [animation-delay:90ms]">
              Our solution · {String(active + 1).padStart(2, "0")}
            </p>
          </div>
          <div
            key={`chip-${active}`}
            className="anim-rise lift hidden w-[132px] shrink-0 rounded-xl bg-white p-3 [animation-delay:160ms] sm:block"
          >
            <p className="text-base font-medium text-ink">{cur.chip}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[0.65rem] text-muted">{cur.chipSub}</span>
              <CheckBadge />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
