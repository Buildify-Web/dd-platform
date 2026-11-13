import type { Metadata } from "next";
import Image from "next/image";
import { HeroFrame, PageHero } from "@/components/HeroFrame";
import { CtaBand } from "@/components/CtaBand";
import { PhotoCard } from "@/components/PhotoCard";
import { Container, PillButton, cx } from "@/components/ui";
import { ArrowUpRight, BookNote, Medal, Trophy } from "@/components/icons";
import Link from "next/link";
import { leadersAward, meena } from "@/content/about";

export const metadata: Metadata = {
  title: "Achievements",
  description: "Olympiad ranks, Spell Bee titles and board results earned by Dynamic Donalds students.",
};

/* Sample achievements — replace with real results. */
const featured = {
  year: "2025",
  headline: "National Rank 14 in the International Maths Olympiad",
  detail: "Aarav Krishnan, Grade 7 — practised mock papers every weekend for six months.",
};

const highlights = [
  { cat: "Spell Bee", award: "State Champion", student: "Nila Sundar", grade: "Grade 4", year: "2025", photo: "/images/achv-student-1.webp", bg: "bg-sun", text: "text-ink", sub: "text-ink/70" },
  { cat: "Spell Bee", award: "Gold Medal, Zonal", student: "Rohan Prakash", grade: "Grade 3", year: "2025", photo: "/images/achv-spellbee-2.webp", bg: "bg-mist", text: "text-ink", sub: "text-muted" },
  { cat: "Spell Bee", award: "Rank 3, National", student: "Ishaan Mehta", grade: "Grade 6", year: "2024", photo: "/images/achv-student-3.webp", bg: "bg-brand", text: "text-white", sub: "text-white/75" },
];

const olympiad = [
  { cat: "Maths Olympiad", award: "Gold Medal — Zonal Rank 2", student: "Team Grade 8", grade: "Grade 8", year: "2025", photo: "/images/achv-olympiad-team.webp" as string | null },
  { cat: "Science Olympiad", award: "Rank 21, National", student: "Diya Ramesh", grade: "Grade 5", year: "2025", photo: null },
  { cat: "Maths Olympiad", award: "Gold Medal, State", student: "Meera Sundaram", grade: "Grade 6", year: "2024", photo: "/images/achv-olympiad-winner.webp" as string | null },
];

export default function AchievementsPage() {
  return (
    <>
      <HeroFrame>
        <PageHero
          eyebrow="Achievements"
          title={
            <>
              Our students, <span className="text-sun">our</span>
              <br />
              <span className="text-brand">pride</span>
            </>
          }
          aside={<PillButton href="/courses?grade=foundation">Competition courses</PillButton>}
        >
          Olympiad ranks, Spell Bee titles and board <strong className="font-semibold text-ink">results earned</strong> with hard
          work.
        </PageHero>
      </HeroFrame>

      {/* Real recognition (client, Nov 2026). The hall of fame below is still sample data. */}
      <section className="pt-16 md:pt-20">
        <Container>
          <p className="eyebrow">Recognition</p>
          <article className="lift group relative mt-8 grid overflow-hidden rounded-[1.5rem] bg-ink p-2 text-white lg:grid-cols-[1.3fr_1fr]">
            <span aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 size-[380px] rounded-full bg-[radial-gradient(circle,rgba(82,196,39,0.32),transparent_65%)]" />
            <span aria-hidden className="pointer-events-none absolute -top-28 right-[20%] size-[300px] rounded-full bg-[radial-gradient(circle,rgba(246,201,14,0.14),transparent_65%)]" />
            <div className="relative aspect-[901/623] overflow-hidden rounded-[1.15rem] bg-[#0e1809]">
              <Image
                src={leadersAward.photo}
                alt={leadersAward.photoAlt}
                fill
                priority
                quality={90}
                sizes="(min-width:1024px) 55vw, 100vw"
                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
              />
              <span className="absolute left-3 top-3 rounded-full bg-sun px-3 py-1.5 text-xs font-semibold text-ink shadow-sm">
                {leadersAward.year}
              </span>
            </div>
            <div className="relative flex flex-col p-5 sm:p-8 lg:p-10">
              <span className="grid size-14 place-items-center rounded-full bg-[linear-gradient(160deg,#f6c90e_0%,#f6c90e_55%,#9e7c06_100%)] text-ink transition-transform duration-500 group-hover:-rotate-12">
                <Trophy className="size-6" />
              </span>
              <p className="mt-6 text-xs text-white/60">{leadersAward.by}</p>
              <h2 className="mt-2 text-[2.1rem] font-light leading-[1.08] tracking-tight sm:text-[2.75rem]">
                Leaders of the <span className="text-sun">Change</span>
              </h2>
              <p className="mt-4 max-w-[26rem] text-sm leading-relaxed text-white/75">
                Awarded to <strong className="font-semibold text-white">{meena.name}</strong>, {meena.role} of Dynamic Donalds, at the
                Star Education Awards {leadersAward.year}, with {leadersAward.partner}.
              </p>
              <ul className="mt-5 flex flex-wrap gap-1.5">
                <li className="tag-pill text-white/85">{leadersAward.by}</li>
                <li className="tag-pill text-white/85">With {leadersAward.partner}</li>
              </ul>
              <div aria-hidden className="min-h-8 flex-1" />
              <Link
                href="/about#founder"
                className="btn-gloss btn-gloss-light group/cta inline-flex w-fit items-center gap-3 whitespace-nowrap rounded-full bg-sun py-1.5 pl-5 pr-1.5 text-sm text-ink hover:bg-white"
              >
                Meet our founders
                <span className="grid size-8 place-items-center rounded-full bg-ink text-white transition-transform duration-300 group-hover/cta:rotate-45">
                  <ArrowUpRight className="size-4" />
                </span>
              </Link>
            </div>
          </article>
        </Container>
      </section>

      <section className="py-16 md:py-20">
        <Container>
          <p className="eyebrow">Hall of fame</p>
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2 className="section-title text-4xl text-ink md:text-[2.75rem]">Proud moments from our students</h2>
            <p className="max-w-[16rem] text-xs leading-relaxed text-ink-soft md:mb-1">
              Every win here started with <strong className="font-semibold text-ink">regular practice</strong> and a tutor who
              believed in them.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-[1.45fr_1fr]">
            {/* featured */}
            <article className="relative min-h-[420px] overflow-hidden rounded-[1.25rem] bg-[linear-gradient(135deg,#17260f_0%,#1c3013_45%,#2c5320_75%,#5a8f45_100%)] p-8 lg:min-h-[620px] lg:p-10">
              <span className="absolute -right-16 -top-20 size-[280px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#2b7010,#3fa61a_70%,#56c92c)] lg:-right-12 lg:size-[380px]" />
              <span className="absolute right-6 top-6 grid size-[130px] place-items-center rounded-full bg-[linear-gradient(160deg,#f6c90e_0%,#f6c90e_55%,#9e7c06_100%)] lg:right-[3rem] lg:top-[3rem] lg:size-[200px]">
                <BookNote className="size-12 text-ink lg:size-16" />
              </span>
              <Trophy className="relative size-16 text-sun lg:size-20" />
              <div className="absolute inset-x-8 bottom-8 lg:inset-x-10 lg:bottom-10">
                <p className="text-xs text-white/70">Featured · {featured.year}</p>
                <h3 className="mt-3 max-w-[30rem] text-3xl font-light leading-[1.15] text-white lg:text-[2.6rem]">
                  {featured.headline}
                </h3>
                <p className="mt-2 text-xs text-white/70">{featured.detail}</p>
              </div>
            </article>

            {/* stacked highlights */}
            <div className="grid gap-4 pt-8 lg:grid-rows-3 lg:pt-10">
              {highlights.map((h) => (
                <article key={h.student} className={cx("lift group relative flex min-h-[140px] flex-col justify-between gap-3 rounded-[1.25rem] p-5 pr-[7.75rem] sm:pr-[9rem] lg:pr-[10.25rem]", h.bg)}>
                  <p className={cx("text-xs", h.sub)}>{h.cat}</p>
                  <div>
                    <h3 className={cx("text-lg font-semibold leading-tight sm:text-xl", h.text)}>{h.award}</h3>
                    <p className={cx("text-xs", h.sub)}>
                      {h.student} · {h.grade} · {h.year}
                    </p>
                  </div>
                  <div className="absolute bottom-3 right-3 top-3 w-[96px] overflow-hidden rounded-[0.85rem] sm:w-[110px] lg:w-[130px]">
                    <Image src={h.photo} alt={`${h.student}, ${h.award}`} fill sizes="120px" className="object-cover transition-transform duration-700 group-hover:scale-110" />
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {olympiad.map((o) => (
              <PhotoCard
                key={o.student}
                photo={o.photo}
                tone="sage"
                silhouette={false}
                watermark={<Medal className="absolute -top-2 right-6 size-36 text-[#c9dcb6]" strokeWidth={1.2} />}
                alt={`${o.student}, ${o.award}`}
                tags={[o.cat, o.year]}
                aspect="aspect-[16/8.5]"
                title={o.award}
                subtitle={`${o.student} · ${o.grade}`}
              />
            ))}
          </div>
        </Container>
      </section>

      <CtaBand
        title={<>Your child could be next</>}
        actions={
          <PillButton href="/enquiry" circle="sun">
            Send an enquiry
          </PillButton>
        }
      />
    </>
  );
}
