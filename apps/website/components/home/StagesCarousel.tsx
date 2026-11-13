"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowLeft, ArrowRight, BookNote, Check, Flask, GradCap, Trophy } from "@/components/icons";
import { gradeBands } from "@/content/courses";
import { CircleArrow, cx } from "@/components/ui";

const [foundation, boards, higher] = gradeBands;

/**
 * Programme cards. Points and pills follow the site's course rules (CLAUDE.md §5) and content/courses.ts;
 * the course count comes from the same file, so it stays in sync with the Courses page.
 */
const stages = [
  {
    key: "foundation",
    title: "Foundation",
    grades: "Pre-KG – Grade 8",
    desc: "Daily tuition that builds strong basics across school subjects.",
    points: ["Phonics for Pre-KG to Grade 2", "Group or one-on-one classes"],
    tags: ["Regular tuition", "Phonics", "All subjects"],
    count: `${foundation?.courses.length ?? 0} courses`,
    href: "/courses?grade=foundation",
    Icon: BookNote,
    t: { block: "bg-brand", text: "text-white", sub: "text-white/75", disc: "bg-white/15 text-sun", chip: "bg-white/15 text-white", tick: "bg-sun text-ink", pill: "text-white/90" },
  },
  {
    key: "competitions",
    title: "Competitions",
    grades: "Pre-KG – Grade 8",
    desc: "Olympiad and Spell Bee coaching that builds speed and confidence.",
    points: ["Mock tests and timed practice", "Hundreds of medals won"],
    tags: ["Maths Olympiad", "Science Olympiad", "Spell Bee"],
    count: `${foundation?.courses.filter((c) => c.tags.includes("Competition")).length ?? 0} programmes`,
    href: "/courses?grade=foundation",
    Icon: Trophy,
    t: { block: "bg-ink", text: "text-white", sub: "text-white/70", disc: "bg-white/10 text-sun", chip: "bg-white/10 text-white", tick: "bg-sun text-ink", pill: "text-white/90" },
  },
  {
    key: "boards",
    title: "Board years",
    grades: "Grades 9 – 10",
    desc: "Board-focused tuition with weekly tests and answer-writing practice.",
    points: ["Maths & Science included by default", "State Board, Matric, CBSE & IGCSE"],
    tags: ["Maths & Science", "Tamil", "English", "Social"],
    count: `${boards?.courses.length ?? 0} subjects`,
    href: "/courses?grade=9-10",
    Icon: GradCap,
    t: { block: "bg-sun", text: "text-ink", sub: "text-ink/70", disc: "bg-ink text-sun", chip: "bg-ink/10 text-ink", tick: "bg-ink text-sun", pill: "text-ink" },
  },
  {
    key: "higher",
    title: "Higher secondary",
    grades: "Grades 11 – 12",
    desc: "Science and Commerce subjects, taught around the board exams.",
    points: ["Science & Commerce streams", "Online or offline, group or 1:1"],
    tags: ["Physics", "Chemistry", "Maths", "Accounts", "Economics"],
    count: `${higher?.courses.length ?? 0} subjects`,
    href: "/courses?grade=11-12",
    Icon: Flask,
    t: { block: "bg-sage", text: "text-ink", sub: "text-ink-soft", disc: "bg-brand text-white", chip: "bg-white/60 text-brand", tick: "bg-brand text-white", pill: "text-brand" },
  },
];

export function StagesCarousel() {
  const track = useRef<HTMLUListElement>(null);

  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector("li");
    const step = card ? card.getBoundingClientRect().width + 16 : 300;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(240px,300px)_1fr] lg:gap-8">
      <div className="flex flex-col justify-between">
        <div>
          <p className="text-xs text-ink">Who it’s for</p>
          <h2 className="mt-8 text-4xl font-medium leading-[1.1] tracking-tight text-ink lg:mt-12 lg:text-[2.6rem]">
            Built for
            <br />
            every stage
            <br />
            of learning
          </h2>
          <p className="mt-4 max-w-[17rem] text-xs leading-relaxed text-ghost">
            Whether your child is <span className="text-ink">learning to read</span>, preparing for{" "}
            <span className="text-sun">Olympiads</span> or facing <span className="text-brand">board exams</span> — there’s a
            programme for them.
          </p>
        </div>
        <div className="mt-8 flex gap-2">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Previous"
            className="btn-gloss btn-gloss-light grid size-9 place-items-center rounded-full border border-line bg-mist text-ink hover:bg-sun"
          >
            <ArrowLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Next"
            className="btn-gloss btn-gloss-light grid size-9 place-items-center rounded-full border border-line bg-white text-ink hover:bg-sun"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>

      <ul
        ref={track}
        className="no-scrollbar -mb-8 -mr-5 -mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-8 pr-5 pt-3 md:-mr-8 md:pr-8"
        aria-label="Programmes"
      >
        {stages.map(({ key, title, grades, desc, points, tags, count, href, Icon, t }) => (
          <li key={key} className="w-[300px] shrink-0 snap-start sm:w-[330px] lg:w-[350px]">
            <Link href={href} className="lift group relative flex h-full flex-col rounded-[1.25rem] bg-frame p-1.5">
              <div className={cx("relative flex min-h-[330px] flex-1 flex-col overflow-hidden rounded-[1rem] p-5 lg:min-h-[350px]", t.block)}>
                <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-white/[0.07]" />
                <div className="relative flex items-center justify-between gap-3">
                  <span
                    className={cx(
                      "grid size-11 place-items-center rounded-full transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110",
                      t.disc,
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className={cx("rounded-full px-3 py-1.5 text-[0.7rem] font-medium", t.chip)}>{grades}</span>
                </div>

                <h3 className={cx("relative mt-6 text-[1.6rem] font-medium leading-tight tracking-tight", t.text)}>{title}</h3>
                <p className={cx("relative mt-1.5 text-[0.8rem] leading-snug", t.sub)}>{desc}</p>

                <ul className="relative mt-4 space-y-2">
                  {points.map((p) => (
                    <li key={p} className={cx("flex items-center gap-2 text-[0.8rem]", t.text)}>
                      <span className={cx("grid size-4 shrink-0 place-items-center rounded-full", t.tick)}>
                        <Check className="size-2.5" strokeWidth={2.8} />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>

                <div aria-hidden className="min-h-5 flex-1" />
                <div className="relative flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span key={tag} className={cx("tag-pill", t.pill)}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-4">
                <span className="min-w-0 text-sm text-ink">
                  <strong className="font-semibold">{count}</strong>
                  <span className="text-muted"> · Online &amp; offline</span>
                </span>
                <CircleArrow />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
