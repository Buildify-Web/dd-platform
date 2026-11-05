"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowLeft, ArrowRight, BookNote, Flask, GradCap, Trophy } from "@/components/icons";
import { CircleArrow, cx } from "@/components/ui";

const stages = [
  {
    label: "Foundation · Pre-KG – 8",
    href: "/courses?grade=foundation",
    tags: ["Regular tuition", "Phonics", "Small groups"],
    Icon: BookNote,
    block: "bg-brand",
    icon: "text-sun",
    tag: "text-white/90",
  },
  {
    label: "Competitions",
    href: "/courses?grade=foundation",
    tags: ["Maths Olympiad", "Science Olympiad", "Spell Bee"],
    Icon: Trophy,
    block: "bg-ink",
    icon: "text-sun",
    tag: "text-white/90",
  },
  {
    label: "Board years 9 – 10",
    href: "/courses?grade=9-10",
    tags: ["Maths & Science", "Tamil", "English", "Social"],
    Icon: GradCap,
    block: "bg-sun",
    icon: "text-ink",
    tag: "text-ink",
  },
  {
    label: "Higher secondary 11 – 12",
    href: "/courses?grade=11-12",
    tags: ["Physics", "Chemistry", "Maths", "Commerce", "Accounts"],
    Icon: Flask,
    block: "bg-sage",
    icon: "text-brand",
    tag: "text-brand",
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
        className="no-scrollbar -mr-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pr-5 md:-mr-8 md:pr-8"
        aria-label="Programmes"
      >
        {stages.map(({ label, href, tags, Icon, block, icon, tag }) => (
          <li key={label} className="w-[300px] shrink-0 snap-start sm:w-[330px] lg:w-[350px]">
            <Link href={href} className="group block rounded-[1.25rem] bg-frame p-1.5">
              <div className={cx("relative h-[250px] rounded-[1rem] p-5 lg:h-[270px]", block)}>
                <Icon className={cx("size-9", icon)} />
                <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span key={t} className={cx("tag-pill", tag)}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-4">
                <span className="text-sm text-ink">{label}</span>
                <CircleArrow />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
