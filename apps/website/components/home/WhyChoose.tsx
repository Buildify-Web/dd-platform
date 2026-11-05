"use client";

import { useState } from "react";
import { BookNote, Calendar, GradCap, Trophy } from "@/components/icons";
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
                  "relative grid h-[76px] w-full grid-cols-[1fr_1.3fr] items-center overflow-hidden rounded-[1rem] px-6 text-left transition-colors lg:h-[86px]",
                  on ? "bg-white" : "bg-white/45 hover:bg-white/70",
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    "self-end text-[4.5rem] font-medium leading-[0.72] tracking-tight transition-colors lg:text-[5.25rem]",
                    on ? "text-ink" : "text-[#dcddd6]",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-ink">{it.problem}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div
        id="why-panel"
        role="tabpanel"
        aria-live="polite"
        className="relative h-[320px] overflow-hidden rounded-[1.25rem] bg-[linear-gradient(135deg,#17260f_0%,#1d3214_45%,#2f5a1e_80%,#4a8530_100%)] lg:h-[340px]"
      >
        <span className="absolute -right-16 -top-24 size-[300px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#2b7010,#3fa61a_70%,#56c92c)]" />
        <span className="absolute right-[3.25rem] top-[-0.5rem] grid size-[150px] place-items-center rounded-full bg-[linear-gradient(160deg,#f6c90e_0%,#f6c90e_55%,#9e7c06_100%)]">
          <cur.Icon className="size-12 text-ink" />
        </span>
        <div className="absolute bottom-8 left-6 right-6 flex items-end justify-between gap-4 lg:left-8">
          <div>
            <p className="max-w-[17rem] text-3xl font-light leading-[1.1] text-white lg:text-[2.1rem]">{cur.solution}</p>
            <p className="mt-2 text-[0.7rem] text-white/70">Our solution · {String(active + 1).padStart(2, "0")}</p>
          </div>
          <div className="hidden w-[132px] shrink-0 rounded-xl bg-white p-3 sm:block">
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
