"use client";

import { useState } from "react";
import type { GradeBand } from "@/content/courses";
import { CourseCard } from "@/components/CourseCard";
import { cx } from "@/components/ui";

export function GradeTabs({ bands, initial }: { bands: GradeBand[]; initial: GradeBand["id"] }) {
  const [active, setActive] = useState<GradeBand["id"]>(initial);
  const band = bands.find((b) => b.id === active) ?? bands[0]!;

  return (
    <>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">{band.eyebrow}</p>
          <h2 className="section-title mt-8 text-4xl text-ink md:text-[2.75rem]">{band.heading}</h2>
          <p className="mt-3 text-sm text-ink-soft">{band.note}</p>
        </div>
        <div role="tablist" aria-label="Grade" className="flex w-fit gap-1 overflow-x-auto rounded-full bg-mist p-1 md:mb-8">
          {bands.map((b) => (
            <button
              key={b.id}
              role="tab"
              type="button"
              id={`tab-${b.id}`}
              aria-selected={b.id === active}
              aria-controls={`panel-${b.id}`}
              onClick={() => setActive(b.id)}
              className={cx(
                "whitespace-nowrap rounded-full px-4 py-2 text-[0.8rem] text-ink transition-colors md:px-5",
                b.id === active ? "bg-sun font-medium" : "hover:bg-white",
              )}
            >
              {b.tab}
            </button>
          ))}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`panel-${band.id}`}
        aria-labelledby={`tab-${band.id}`}
        className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {band.courses.map((c) => (
          <CourseCard key={c.title} course={c} />
        ))}
      </div>
    </>
  );
}
