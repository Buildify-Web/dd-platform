import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { HeroFrame } from "@/components/HeroFrame";
import { SectionRail } from "@/components/about/SectionRail";
import { CtaBand } from "@/components/CtaBand";
import { CheckBadge, Container, PersonTile, PillButton, cx } from "@/components/ui";
import {
  ArrowUpRight,
  BookNote,
  Brush,
  Eye,
  Flask,
  Globe,
  GradCap,
  Heart,
  Medal,
  Quote,
  Sparkle,
  SpellCheck,
  Star,
  Target,
  Trophy,
} from "@/components/icons";
import {
  competitionsCoached,
  competitionsEntered,
  founders,
  meena,
  founderMessage,
  founderWorks,
  medalTally,
  milestones,
  missionNurture,
  stats,
  syllabi,
  teachingPillars,
  values,
  vila,
} from "@/content/about";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Since 2013, Dynamic Donalds has taught over 2,000 students from LKG to Grade 12. Our story, achievements, vision, mission and values.",
};

const sections = [
  { id: "story", label: "Our story" },
  { id: "founder", label: "Our founders" },
  { id: "what-we-do", label: "What we do" },
  { id: "achievements", label: "Achievements" },
  { id: "with-heart", label: "Learning with heart" },
  { id: "vision-mission", label: "Vision & mission" },
  { id: "values", label: "Values" },
];

const coachIcons = { flask: Flask, trophy: Trophy, spell: SpellCheck, star: Star, brush: Brush } as const;

/* ───────────────────────────── shared bits ───────────────────────────── */

function SectionHead({
  eyebrow,
  title,
  aside,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="eyebrow">{eyebrow}</p>
      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h2 className="section-title text-4xl text-ink md:text-[2.75rem]">{title}</h2>
        {aside ? <p className="max-w-[17rem] text-xs leading-relaxed text-ink-soft md:mb-1 md:text-right">{aside}</p> : null}
      </div>
    </div>
  );
}

/** Gold / silver / bronze discs. */
function MedalDiscs({ className }: { className?: string }) {
  const discs = [
    { label: "Gold", cls: "bg-[linear-gradient(150deg,#ffe27a_0%,#f6c90e_45%,#b38b05_100%)] text-ink" },
    { label: "Silver", cls: "bg-[linear-gradient(150deg,#ffffff_0%,#cfd3c9_50%,#9aa092_100%)] text-ink" },
    { label: "Bronze", cls: "bg-[linear-gradient(150deg,#f3c79a_0%,#c98a4b_50%,#8a5429_100%)] text-white" },
  ];
  return (
    <div className={cx("flex -space-x-3", className)}>
      {discs.map((d, i) => (
        <span
          key={d.label}
          className={cx(
            "grid size-12 place-items-center rounded-full shadow-[0_6px_16px_-6px_rgba(23,38,15,0.45),inset_0_1px_0_rgba(255,255,255,0.6)] ring-[3px] ring-white transition-transform duration-500 group-hover:-translate-y-1",
            d.cls,
          )}
          style={{ transitionDelay: `${i * 70}ms` }}
        >
          <Medal className="size-5" />
          <span className="sr-only">{d.label}</span>
        </span>
      ))}
    </div>
  );
}

/* ───────────────────────────────── hero ──────────────────────────────── */

/**
 * Two photos side by side, staggered vertically so they never overlap. The chips sit in
 * the empty corners the stagger leaves (above the right photo, below the left one).
 */
function HeroPhoto({ src, alt, className, position }: { src: string; alt: string; className?: string; position?: string }) {
  return (
    <div className={cx("lift group overflow-hidden rounded-[1.25rem] bg-white p-1.5 shadow-[0_30px_60px_-30px_rgba(23,38,15,0.55)]", className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[0.9rem]">
        <Image
          src={src}
          alt={alt}
          fill
          priority
          sizes="(min-width:1024px) 26vw, 48vw"
          className={cx("object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]", position)}
        />
      </div>
    </div>
  );
}

function HeroCollage() {
  return (
    <div className="relative mx-auto w-full max-w-[600px] lg:max-w-none">
      {/* decorative shapes, behind the photos */}
      <span aria-hidden className="absolute -right-10 top-[24%] h-[56%] w-[70%] rounded-l-full bg-[radial-gradient(ellipse_at_40%_50%,#2f7a12_0%,#2b7010_55%,#1f5a0a_100%)] lg:-right-8" />
      <span aria-hidden className="absolute -left-3 top-[6%] size-[90px] rounded-full bg-sun sm:size-[130px] lg:size-[150px]" />

      <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
        <div className="pt-6 sm:pt-8">
          <HeroPhoto src="/images/about/field-trip-group.webp" alt="Dynamic Donalds students and teachers on a field trip" />
          {/* chip in the space below the left photo */}
          <div aria-hidden className="lift anim-float mt-4 w-[150px] rounded-xl bg-sun p-3 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.35)] sm:mt-5 sm:w-[180px] sm:p-3.5">
            <p className="text-lg font-medium text-ink sm:text-xl">2,000+</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[0.7rem] text-ink-soft">Students taught</span>
              <span className="grid size-5 place-items-center rounded-full bg-brand text-white">
                <GradCap className="size-3" />
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          {/* chip in the space above the right photo */}
          <div aria-hidden className="lift anim-float mb-4 ml-auto w-fit rounded-full bg-ink py-2 pl-2 pr-4 text-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)] [animation-delay:-3s] sm:mb-5">
            <span className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="grid size-7 place-items-center rounded-full bg-sun text-ink">
                <Heart className="size-3.5" />
              </span>
              Since 2013
            </span>
          </div>
          <HeroPhoto
            src="/images/about/students-teachers-group.webp"
            alt="Dynamic Donalds students with their trophies and teachers on stage at a prize distribution"
            position="object-[35%_50%]"
          />
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <HeroFrame>
      <div className="relative grid gap-12 px-5 pb-10 pt-12 md:px-8 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-8 lg:pb-14 lg:pt-14">
        <div className="relative z-10">
          <p className="eyebrow mb-6">About us</p>
          <h1 className="display text-[clamp(2.3rem,11vw,3.2rem)] text-ink sm:text-6xl lg:text-[clamp(3.2rem,5vw,4.6rem)]">
            A learning
            <br />
            <span className="text-brand">family</span> <span className="text-olive">since</span>
            <br />
            <span className="relative inline-block">
              <span aria-hidden className="absolute inset-x-[-0.06em] bottom-[0.06em] h-[0.32em] rounded-full bg-sun" />
              <span className="relative">2013</span>
            </span>
          </h1>
          <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10 lg:flex-col lg:items-start lg:gap-6 xl:flex-row xl:items-center xl:gap-10">
            <p className="max-w-[19rem] text-[0.9rem] leading-snug text-ink-soft">
              Every institution has a story. Ours began with a simple dream: a place where every child feels{" "}
              <strong className="font-semibold text-ink">supported, understood and inspired</strong> to learn.
            </p>
            <PillButton href="#vision-mission" size="lg" className="w-fit">
              Vision &amp; mission
            </PillButton>
          </div>
        </div>
        <HeroCollage />
      </div>

      {/* stats */}
      <ul className="grid grid-cols-2 gap-2 px-2 pb-2 lg:grid-cols-4 md:px-2.5 md:pb-2.5">
        {stats.map((s, i) => (
          <li key={s.label} className="lift group relative overflow-hidden rounded-[1rem] bg-white p-4 sm:p-6">
            <p className="text-[2rem] font-medium leading-none tracking-tight text-ink sm:text-[2.75rem]">{s.value}</p>
            <p className="mt-3 max-w-[12rem] text-xs leading-snug text-muted sm:text-[0.8rem]">{s.label}</p>
            <span
              aria-hidden
              className={cx(
                "absolute right-4 top-4 size-2.5 rounded-full transition-transform duration-500 group-hover:scale-150",
                ["bg-sun", "bg-brand", "bg-ink", "bg-sage-deep"][i],
              )}
            />
          </li>
        ))}
      </ul>
    </HeroFrame>
  );
}

function OnThisPage() {
  return (
    <Container className="pt-8">
      <nav id="about-toc" aria-label="On this page" className="-mx-5 overflow-x-auto px-5 no-scrollbar md:mx-0 md:px-0">
        <ul className="flex w-max gap-2 md:w-auto md:flex-wrap">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="btn-gloss btn-gloss-light block whitespace-nowrap rounded-full bg-mist px-5 py-3 text-sm text-ink hover:bg-sun"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </Container>
  );
}

/* ───────────────────────────────── story ─────────────────────────────── */

function FounderCard() {
  return (
    <figure className="lift group rounded-[1.25rem] bg-frame p-1.5">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1rem]">
        {founders.photo ? (
          <Image
            src={founders.photo}
            alt={`${founders.names.join(" and ")}, founders of ${site.name}, with an award`}
            fill
            sizes="(min-width:1024px) 34vw, (min-width:640px) 60vw, 100vw"
            quality={90}
            className="object-cover object-[50%_35%] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
          />
        ) : (
          <>
            <PersonTile tone="brand" className="h-full w-full" />
            <span className="absolute right-3 top-3 rounded-full bg-white/15 px-3 py-1.5 text-[0.7rem] text-white ring-1 ring-white/30 backdrop-blur-sm">
              Photo coming soon
            </span>
          </>
        )}
      </div>
      {/* quote sits below the photo (not over it) so the founders and their award stay fully visible */}
      <blockquote className="flex gap-3 px-3 pt-5">
        <Quote className="size-6 shrink-0 text-sun" />
        <p className="text-lg font-light leading-snug text-ink sm:text-xl">
          We don’t just teach subjects. We build confidence, character, and a love for learning that lasts a lifetime.
        </p>
      </blockquote>
      <figcaption className="mx-3 mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line pb-3 pt-4">
        <div className="min-w-0">
          <p className="text-[0.95rem] leading-snug text-ink">{founders.names.join(" & ")}</p>
          <p className="mt-0.5 text-xs text-muted">{founders.role}</p>
        </div>
        <span className="flex shrink-0 gap-1.5">
          <span className="tag-pill text-brand">Founders</span>
          <span className="tag-pill text-brand">Since 2013</span>
        </span>
      </figcaption>
    </figure>
  );
}

function Story() {
  return (
    <section id="story" className="py-16 md:py-20">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
            <FounderCard />
          </div>

          <div className="min-w-0">
            <p className="eyebrow">Our story</p>
            <h2 className="section-title mt-8 text-4xl text-ink md:text-[2.75rem]">
              Born from a simple dream, grown into a <span className="text-brand">trusted learning family</span>
            </h2>
            <div className="mt-6 space-y-4 text-[0.95rem] leading-relaxed text-ink-soft">
              <p>
                Every institution has a unique story of birth, growth and development. Ours began in 2013 with a simple dream: to
                create a place where every child feels supported, understood and inspired to learn.
              </p>
              <p>
                Today, {site.name} (DD) has grown into a trusted learning family, having taught and guided{" "}
                <strong className="font-semibold text-ink">over 2,000 students from LKG to 12th Grade</strong>.
              </p>
            </div>

            <ol className="relative mt-10 space-y-3 before:absolute before:bottom-8 before:left-[1.45rem] before:top-8 before:w-px before:bg-line sm:before:hidden">
              {milestones.map((m, i) => (
                <li
                  key={m.title}
                  className="lift group relative flex gap-4 rounded-[1rem] bg-mist p-4 sm:grid sm:grid-cols-[8.5rem_1fr] sm:items-center sm:gap-6 sm:p-6"
                >
                  <span
                    aria-hidden
                    className="relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white ring-4 ring-mist sm:hidden"
                  >
                    <span className={cx("size-2.5 rounded-full", i === milestones.length - 1 ? "bg-sun" : "bg-brand")} />
                  </span>
                  <div className="sm:contents">
                    <p className="text-xl font-medium tracking-tight text-ghost transition-colors duration-500 group-hover:text-brand sm:text-[1.7rem]">
                      {m.when}
                    </p>
                    <div className="mt-1 sm:mt-0">
                      <h3 className="text-base font-semibold text-ink">{m.title}</h3>
                      <p className="mt-1 text-sm leading-snug text-ink-soft">{m.body}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ──────────────────────────── from the founder ───────────────────────── */

const workIcons = { book: BookNote, trophy: Trophy, globe: Globe, heart: Heart } as const;

function FounderDesk() {
  return (
    <section id="founder" className="pb-16 md:pb-20">
      <Container>
        <SectionHead
          eyebrow="Our founders"
          title={
            <>
              Thenu <span className="text-ghost">&amp;</span> Meena <span className="text-brand">Annamalai</span>
            </>
          }
          aside={
            <>
              <strong className="font-semibold text-ink">{founders.names.join(" & ")}</strong> founded {site.name}, Chennai, in
              2013.
            </>
          }
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.05fr_1fr]">
          {/* founders together */}
          <article className="lift group relative overflow-hidden rounded-[1.5rem] bg-ink p-2 text-white">
            <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(circle,rgba(82,196,39,0.35),transparent_65%)]" />
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.15rem] bg-[#0e1809]">
              <Image
                src={founders.togetherPhoto}
                alt={`${founders.names.join(" and ")}, founders of ${site.name}`}
                fill
                quality={90}
                sizes="(min-width:1024px) 46vw, 100vw"
                className="object-cover object-[50%_45%] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
              />
              <span className="absolute left-3 top-3 rounded-full bg-sun px-3 py-1.5 text-xs font-semibold text-ink shadow-sm">Since 2013</span>
            </div>
            <div className="relative flex items-end justify-between gap-4 p-5 sm:p-6">
              <div className="min-w-0">
                <p className="text-xs text-white/60">Founders</p>
                <h3 className="mt-2 text-[1.75rem] font-light leading-tight sm:text-[2.1rem]">
                  Thenu &amp; Meena <span className="text-sun">Annamalai</span>
                </h3>
                <p className="mt-2 text-sm text-white/70">Building a learning family in Chennai since 2013.</p>
              </div>
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[linear-gradient(160deg,#f6c90e_0%,#f6c90e_55%,#9e7c06_100%)] text-ink transition-transform duration-500 group-hover:-rotate-12">
                <Heart className="size-6" />
              </span>
            </div>
          </article>

          {/* message */}
          <div className="flex flex-col rounded-[1.5rem] bg-mist p-6 sm:p-8 lg:p-10">
            <p className="text-xs text-ghost">A note from {meena.name}</p>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">{founderMessage.intro}</p>
            <figure className="my-8 border-l-[3px] border-sun pl-5 sm:my-10">
              <Quote className="size-7 text-sun" />
              <blockquote className="mt-3 text-[1.6rem] font-light leading-[1.25] tracking-tight text-ink sm:text-[2rem]">
                {founderMessage.quote}
              </blockquote>
            </figure>
            <p className="text-[0.95rem] leading-relaxed text-ink-soft">{founderMessage.closing}</p>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-8">
              <div>
                <p className="text-base font-medium text-ink">{meena.name}</p>
                <p className="text-xs text-muted">{meena.role}</p>
              </div>
              <Link
                href="/achievements"
                className="btn-gloss btn-gloss-light group/cta inline-flex items-center gap-3 whitespace-nowrap rounded-full bg-white py-1.5 pl-5 pr-1.5 text-sm text-ink hover:bg-sun"
              >
                Our achievements
                <span className="grid size-8 place-items-center rounded-full bg-ink text-white transition-transform duration-300 group-hover/cta:rotate-45">
                  <ArrowUpRight className="size-4" />
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* key works */}
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {founderWorks.map((w, i) => {
            const Icon = workIcons[w.icon];
            return (
              <li key={w.title} className="lift group relative flex flex-col overflow-hidden rounded-[1.25rem] border border-line bg-white p-5 sm:p-6">
                <span
                  aria-hidden
                  className="absolute right-5 top-5 text-[3.25rem] font-medium leading-none tracking-tight text-[#eef0e9] transition-[color,translate] duration-500 group-hover:-translate-y-1 group-hover:text-sage"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cx(
                    "relative grid size-11 place-items-center rounded-full transition-transform duration-500 group-hover:rotate-[-10deg] group-hover:scale-110",
                    i % 2 === 0 ? "bg-sun text-ink" : "bg-brand text-white",
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <h3 className="relative mt-5 text-lg font-semibold leading-snug text-ink">{w.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-ink-soft">{w.body}</p>
                <div aria-hidden className="min-h-5 flex-1" />
                <div className="relative border-t border-line pt-4">
                  <p className="text-2xl font-medium tracking-tight text-ink">{w.stat.value}</p>
                  <p className="text-xs text-muted">{w.stat.label}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── what we do ──────────────────────────── */

function WhatWeDo() {
  return (
    <div id="what-we-do" className="px-2 md:px-2.5">
      <section className="rounded-[1.25rem] bg-mist py-16 md:py-20">
        <Container>
          <SectionHead
            eyebrow="What we do"
            title={
              <>
                Academic coaching across
                <br className="hidden md:block" /> every major syllabus
              </>
            }
            aside={
              <>
                Personal attention, strong concept clarity, regular tests and{" "}
                <strong className="font-semibold text-ink">continuous mentoring</strong>.
              </>
            }
          />

          <div className="mt-10 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
            {/* syllabi */}
            <ul className="grid grid-cols-2 gap-3">
              {syllabi.map((s, i) => (
                <li key={s} className="lift group relative flex h-[150px] flex-col justify-between overflow-hidden rounded-[1rem] bg-white p-4 sm:h-[170px] sm:p-5">
                  <span className="grid size-9 place-items-center rounded-full bg-sage text-brand transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110">
                    <GradCap className="size-4" />
                  </span>
                  <h3 className="relative z-10 text-lg font-semibold leading-tight text-ink [overflow-wrap:break-word] sm:text-2xl">{s}</h3>
                  <span
                    aria-hidden
                    className="absolute -bottom-4 right-3 text-[4.5rem] font-medium leading-none tracking-tight text-[#efefe9] transition-[color,translate] duration-500 group-hover:-translate-y-2 group-hover:text-sun sm:text-[5.5rem]"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </li>
              ))}
            </ul>

            {/* results */}
            <article className="relative overflow-hidden rounded-[1.25rem] bg-[linear-gradient(135deg,#17260f_0%,#1c3013_50%,#2c5320_100%)] p-6 text-white sm:p-8">
              <span aria-hidden className="absolute -right-24 -top-24 size-[180px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#2b7010,#3fa61a_70%,#56c92c)] opacity-90" />
              <p className="relative text-xs text-white/60">Results we are proud of</p>
              <div className="relative mt-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[3.25rem] font-medium leading-none tracking-tight text-sun sm:text-[4.25rem]">100%</p>
                  <p className="mt-2 text-sm text-white/75">Pass results</p>
                </div>
                <div>
                  <p className="text-[3.25rem] font-medium leading-none tracking-tight sm:text-[4.25rem]">90%</p>
                  <p className="mt-2 text-sm text-white/75">Securing centum in multiple subjects</p>
                </div>
              </div>
              <ul className="relative mt-8 grid gap-2.5 border-t border-white/10 pt-6 sm:grid-cols-2">
                {teachingPillars.map((p) => (
                  <li key={p} className="flex items-center gap-2.5 text-sm text-white/90">
                    <CheckBadge className="shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          </div>

          {/* beyond academics */}
          <div className="mt-14 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <h3 className="text-2xl font-medium tracking-tight text-ink md:text-[1.9rem]">Beyond academics, we train children for</h3>
          </div>
          <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {competitionsCoached.map((c, i) => {
              const Icon = coachIcons[c.icon];
              return (
                <li
                  key={c.title}
                  className={cx(
                    "lift group flex min-h-[132px] flex-col justify-between gap-4 rounded-[1rem] bg-white p-4 sm:p-5",
                    i === competitionsCoached.length - 1 && "col-span-2 md:col-span-1",
                  )}
                >
                  <span className="grid size-10 place-items-center rounded-full bg-sun text-ink transition-transform duration-500 group-hover:rotate-[-10deg] group-hover:scale-110">
                    <Icon className="size-[1.1rem]" />
                  </span>
                  <p className="text-[0.95rem] font-medium leading-snug text-ink">{c.title}</p>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>
    </div>
  );
}

/* ────────────────────────────── achievements ─────────────────────────── */

function Achievements() {
  const tallyReady = medalTally.items.every((m) => typeof m.count === "number");
  const total = tallyReady ? medalTally.items.slice(1).reduce((n, m) => n + (m.count ?? 0), 0) : 0;

  return (
    <section id="achievements" className="py-16 md:py-20">
      <Container>
        <SectionHead
          eyebrow="Our achievements"
          title={
            <>
              Gold, silver and bronze,
              <br className="hidden md:block" /> at <span className="text-ghost">every level</span>
            </>
          }
          aside={
            <>
              Our children have won <strong className="font-semibold text-ink">numerous medals</strong> at state, national and
              online competitions.
            </>
          }
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          {/* award feature */}
          <article className="relative flex min-h-[440px] flex-col justify-between overflow-hidden rounded-[1.25rem] bg-[linear-gradient(135deg,#17260f_0%,#1c3013_45%,#2c5320_75%,#5a8f45_100%)] p-7 sm:p-9 lg:min-h-[560px] lg:p-10">
            <span aria-hidden className="absolute -right-16 -top-20 size-[260px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#2b7010,#3fa61a_70%,#56c92c)] lg:-right-12 lg:size-[360px]" />
            <span aria-hidden className="absolute right-6 top-6 grid size-[120px] place-items-center rounded-full bg-[linear-gradient(160deg,#f6c90e_0%,#f6c90e_55%,#9e7c06_100%)] lg:right-12 lg:top-12 lg:size-[190px]">
              <Trophy className="size-12 text-ink lg:size-[4.5rem]" />
            </span>
            <p className="relative w-fit rounded-full bg-white/10 px-3.5 py-1.5 text-xs text-white/85 ring-1 ring-white/15">
              Every year since 2017
            </p>
            <div className="relative">
              <h3 className="max-w-[30rem] text-[2rem] font-light leading-[1.1] text-white sm:text-[2.6rem]">
                Best School of Training Award
              </h3>
              <p className="mt-3 max-w-[26rem] text-sm leading-relaxed text-white/70">
                It is our greatest pride that {site.name} has received this award at the Aarivukalanjiyam event every year from
                2017 till date.
              </p>
              {/* streak line */}
              <div className="mt-7 flex items-center gap-3 text-xs text-white/70">
                <span>2017</span>
                <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <span className="absolute inset-y-0 left-0 w-full rounded-full bg-[linear-gradient(90deg,#9e7c06,#f6c90e)]" />
                </span>
                <span className="font-medium text-sun">Today</span>
              </div>
            </div>
          </article>

          {/* competitions + medals */}
          <div className="grid gap-3">
            {competitionsEntered.map((c) => (
              <article key={c.title} className="lift group flex items-center justify-between gap-4 rounded-[1rem] bg-mist p-5">
                <div className="min-w-0">
                  <span className="tag-pill text-brand">{c.level}</span>
                  <h3 className="mt-3 text-lg font-semibold leading-tight text-ink">{c.title}</h3>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-brand transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110">
                  <Medal className="size-5" />
                </span>
              </article>
            ))}

            <article className="lift group flex flex-col justify-between gap-5 rounded-[1rem] bg-sun p-5 sm:flex-row sm:items-center">
              {tallyReady ? (
                <div>
                  <p className="text-xs text-ink/70">{medalTally.year}</p>
                  <p className="mt-1 text-3xl font-medium tracking-tight text-ink">{total} medals</p>
                  <p className="mt-1 text-xs text-ink/70">
                    {medalTally.items.map((m) => `${m.count} ${m.label.toLowerCase()}`).join(" · ")}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-ink/70">Medals won</p>
                  <p className="mt-1 text-xl font-semibold leading-tight text-ink">Hundreds of Gold, Silver &amp; Bronze</p>
                  <p className="mt-1 text-xs text-ink/70">At various levels, year after year</p>
                </div>
              )}
              <MedalDiscs />
            </article>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────── learning with heart ─────────────────────── */

function WithHeart() {
  return (
    <section id="with-heart" className="pb-16 md:pb-20">
      <Container>
        <SectionHead
          eyebrow="Learning with heart"
          title={
            <>
              Education is <span className="text-brand">for all</span>
            </>
          }
          aside={
            <>
              Our values: <strong className="font-semibold text-ink">gratitude, integrity, sincerity and commitment</strong>{" "}
              towards every pupil.
            </>
          }
        />

        <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <article className="lift group relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[1.25rem] bg-sun p-6 sm:p-7">
            <Heart aria-hidden className="absolute -bottom-8 -right-6 size-44 text-[#e9bb05] transition-transform duration-700 group-hover:-rotate-6 group-hover:scale-105" strokeWidth={1.3} />
            <span className="relative grid size-11 place-items-center rounded-full bg-ink text-sun">
              <Heart className="size-5" />
            </span>
            <div className="relative">
              <h3 className="text-2xl font-semibold leading-tight text-ink">Free education &amp; concessions</h3>
              <p className="mt-2 max-w-[19rem] text-sm leading-relaxed text-ink/75">
                We extend our services to underprivileged kids, offering free education and concessions to those who need it
                most.
              </p>
            </div>
          </article>

          <article className="lift group relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[1.25rem] bg-brand p-6 sm:p-7">
            <Globe aria-hidden className="absolute -bottom-10 -right-8 size-48 text-[#3a8019] transition-transform duration-[1200ms] group-hover:rotate-[30deg]" strokeWidth={1.2} />
            <span className="relative grid size-11 place-items-center rounded-full bg-white text-brand">
              <Globe className="size-5" />
            </span>
            <div className="relative">
              <h3 className="text-2xl font-semibold leading-tight text-white">Online, around the world</h3>
              <p className="mt-2 max-w-[19rem] text-sm leading-relaxed text-white/80">
                During COVID-19 we swiftly moved online so learning never stopped. Today, students from all over the world learn
                with us.
              </p>
            </div>
          </article>

          <article className="lift group relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[1.25rem] bg-ink p-6 sm:p-7 md:col-span-2 lg:col-span-1">
            <span aria-hidden className="absolute -right-14 -top-14 size-40 rounded-full bg-[radial-gradient(circle_at_30%_30%,#2b7010,#3fa61a)] opacity-70 transition-transform duration-700 group-hover:scale-110" />
            <div className="relative flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-sun text-ink">
                <Sparkle className="size-5" />
              </span>
              <span className="text-xs text-white/60">New this year</span>
            </div>
            <div className="relative">
              <h3 className="text-2xl font-semibold leading-tight text-white">
                In collaboration with <span className="text-sun">{vila.name}</span>
              </h3>
              <p className="mt-1 text-xs text-white/60">{vila.full}</p>
              <p className="mt-3 max-w-[22rem] text-sm leading-relaxed text-white/80">
                Online and offline weekend courses for the overall growth and development of our students.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {vila.courses.map((c) => (
                  <span key={c} className="tag-pill text-white/85">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </article>
        </div>
      </Container>
    </section>
  );
}

/* ──────────────────────────── vision & mission ───────────────────────── */

function VisionMission() {
  return (
    <div id="vision-mission" className="px-2 md:px-2.5">
      <section className="relative overflow-hidden rounded-[1.25rem] bg-ink py-16 text-white md:py-24">
        {/* decorative */}
        <span aria-hidden className="absolute -right-40 -top-48 size-[360px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#2b7010,#3fa61a_70%,#56c92c)] opacity-35 lg:-right-44 lg:-top-56 lg:size-[480px]" />
        <span aria-hidden className="absolute -bottom-24 -left-20 size-[200px] rounded-full border-[28px] border-sun/15 lg:size-[260px]" />

        <Container className="relative">
          <p className="text-xs text-white/50">Vision &amp; mission</p>

          {/* vision */}
          <div className="mt-8 grid gap-6 lg:grid-cols-[15rem_1fr] lg:gap-12">
            <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-4">
              <span className="grid size-12 place-items-center rounded-full bg-sun text-ink shadow-[0_10px_30px_-10px_rgba(246,201,14,0.7)]">
                <Eye className="size-5" />
              </span>
              <h2 className="text-2xl font-medium tracking-tight">Our vision</h2>
            </div>
            <p className="text-[clamp(1.5rem,5.6vw,2.75rem)] font-light leading-[1.22] tracking-tight text-white/90 lg:text-[clamp(2rem,3.1vw,2.9rem)]">
              To be a trusted learning space where every child discovers their{" "}
              <span className="font-normal text-sun">unique talent</span>, builds{" "}
              <span className="font-normal text-sun">strong confidence</span>, and grows into a{" "}
              <span className="font-normal text-sun">happy, capable, and responsible</span> individual, both in academics and in
              life.
            </p>
          </div>

          <div className="my-14 h-px bg-white/10 md:my-16" />

          {/* mission */}
          <div className="grid gap-6 lg:grid-cols-[15rem_1fr] lg:gap-12">
            <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-4">
              <span className="grid size-12 place-items-center rounded-full bg-brand text-white shadow-[0_10px_30px_-10px_rgba(82,196,39,0.7)]">
                <Target className="size-5" />
              </span>
              <h2 className="text-2xl font-medium tracking-tight">Our mission</h2>
            </div>
            <div>
              <p className="text-base text-white/70 md:text-lg">
                At {site.name} (DD), our mission is to make learning
              </p>
              <p className="display mt-4 text-[clamp(2.6rem,13vw,4rem)] sm:text-7xl lg:text-[clamp(4.5rem,7.4vw,6.5rem)]">
                <span className="text-sun">Joyful.</span>
                <br />
                <span className="text-white">Personal.</span>
                <br />
                <span className="text-brand-bright">Powerful.</span>
              </p>

              <p className="mt-12 text-sm text-white/60">We nurture every child with</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {missionNurture.map((m, i) => (
                  <li
                    key={m.title}
                    className="lift group relative min-h-[150px] overflow-hidden rounded-[1rem] bg-white/[0.06] p-5 ring-1 ring-white/10 transition-colors hover:bg-white/[0.1]"
                  >
                    <span className="text-sm font-medium text-sun">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="mt-6 text-lg font-semibold">{m.title}</h3>
                    <p className="mt-1 text-sm leading-snug text-white/65">{m.body}</p>
                    <span aria-hidden className="absolute inset-x-5 bottom-0 h-0.5 origin-left scale-x-0 rounded-full bg-sun transition-transform duration-500 group-hover:scale-x-100" />
                  </li>
                ))}
              </ul>

              <figure className="mt-10 flex items-start gap-4 rounded-[1rem] bg-white/[0.04] p-5 ring-1 ring-white/10 sm:p-6">
                <Quote className="size-8 shrink-0 text-sun" />
                <blockquote className="text-lg font-light leading-snug text-white/90 sm:text-xl">
                  We believe every child can shine when given the right support, encouragement, and environment.
                </blockquote>
              </figure>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

/* ───────────────────────────────── values ────────────────────────────── */

const valueTones = {
  sun: { bg: "bg-sun", title: "text-ink", body: "text-ink/70", letter: "text-[#e9bb05]" },
  brand: { bg: "bg-brand", title: "text-white", body: "text-white/80", letter: "text-[#3a8019]" },
  ink: { bg: "bg-ink", title: "text-white", body: "text-white/70", letter: "text-[#2a3a21]" },
  sage: { bg: "bg-sage", title: "text-ink", body: "text-ink-soft", letter: "text-sage-deep" },
} as const;

function Values() {
  return (
    <section id="values" className="py-16 md:py-20">
      <Container>
        <SectionHead
          eyebrow="Our values"
          title={
            <>
              Four values, <span className="text-ghost">towards every pupil</span>
            </>
          }
          aside={
            <>
              At DD, we build <strong className="font-semibold text-ink">confidence, character</strong> and a love for learning
              that lasts a lifetime.
            </>
          }
        />
        <ul className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {values.map((v) => {
            const t = valueTones[v.tone];
            return (
              <li key={v.name} className={cx("lift group relative flex min-h-[210px] flex-col justify-between overflow-hidden rounded-[1.25rem] p-4 sm:min-h-[250px] sm:p-6", t.bg)}>
                <span
                  aria-hidden
                  className={cx(
                    "pointer-events-none absolute -bottom-7 -right-1 text-[8rem] font-semibold leading-none transition-transform duration-700 group-hover:-translate-y-2 sm:-bottom-9 sm:text-[11rem]",
                    t.letter,
                  )}
                >
                  {v.name[0]}
                </span>
                <h3 className={cx("relative text-lg font-semibold sm:text-2xl", t.title)}>{v.name}</h3>
                <p className={cx("relative max-w-[13rem] text-xs leading-snug sm:text-sm", t.body)}>{v.line}</p>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

/* ────────────────────────────────── page ─────────────────────────────── */

export default function AboutPage() {
  return (
    <>
      <Hero />
      <OnThisPage />
      <SectionRail sections={sections} />
      <Story />
      <FounderDesk />
      <WhatWeDo />
      <Achievements />
      <WithHeart />
      <VisionMission />
      <Values />
      <CtaBand
        title={
          <>
            Learn. Grow. Shine.
            <br />
            <span className="text-ghost">That’s the DD way</span>
          </>
        }
        actions={
          <>
            <PillButton href="/enquiry" circle="sun">
              Send an enquiry
            </PillButton>
            <a href={site.phoneHref} className="btn-gloss btn-gloss-light rounded-full bg-mist px-6 py-3.5 text-sm text-ink hover:bg-sun">
              {site.phoneDisplay}
            </a>
          </>
        }
      />
    </>
  );
}
