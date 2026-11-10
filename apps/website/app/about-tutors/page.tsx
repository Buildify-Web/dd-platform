import type { Metadata } from "next";
import { HeroFrame, PageHero } from "@/components/HeroFrame";
import { CtaBand } from "@/components/CtaBand";
import { PhotoCard } from "@/components/PhotoCard";
import { Container, PillButton } from "@/components/ui";
import { tutors } from "@/content/people";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Tutors",
  description: "Meet the experienced, patient tutors behind every lesson at Dynamic Donalds.",
};

const approach = [
  { title: "Small groups", desc: "Every student gets time with the tutor or one-on-one online." },
  { title: "Daily updates", desc: "What was covered and homework status, after each session." },
  { title: "Regular tests", desc: "Marks shared in the parent app, so progress is visible." },
  { title: "Competition coaching", desc: "Prep for Maths and Science Olympiads and Spell Bee." },
];

export default function TutorsPage() {
  return (
    <>
      <HeroFrame>
        <PageHero
          eyebrow="Tutors"
          title={
            <>
              The people <span className="text-sun">behind</span>
              <br />
              <span className="text-brand">every</span> lesson
            </>
          }
          aside={<PillButton href="/enquiry?interest=Meet+a+tutor">Meet a tutor</PillButton>}
        >
          Experienced, patient tutors who <strong className="font-semibold text-ink">keep classes small</strong> and keep parents
          informed.
        </PageHero>
      </HeroFrame>

      <section className="py-16 md:py-20">
        <Container>
          <p className="eyebrow">Our Tutors</p>
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2 className="section-title text-4xl text-ink md:text-[2.75rem]">Teachers who know your child by name</h2>
            <p className="max-w-[16rem] text-xs leading-relaxed text-ink-soft md:mb-1">
              Each tutor focuses on <strong className="font-semibold text-ink">a few subjects</strong>, so lessons stay deep and
              personal.
            </p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tutors.map((t) => (
              <PhotoCard
                key={t.name}
                photo={t.photo}
                tone={t.tone}
                alt={`${t.name}, tutor`}
                tags={t.tags}
                title={t.name}
                subtitle={`${t.qualification} · ${t.years} years`}
              />
            ))}
          </div>
        </Container>
      </section>

      <div className="px-2 md:px-2.5">
        <section className="rounded-[1.25rem] bg-mist py-16 md:py-20">
          <Container>
            <p className="eyebrow">How we teach</p>
            <h2 className="section-title mt-8 text-4xl text-ink md:text-[2.75rem]">
              Attention, routine and honest
              <br className="hidden md:block" /> feedback
            </h2>
            <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {approach.map((a, i) => (
                <li key={a.title} className="lift group relative h-[150px] overflow-hidden rounded-[1rem] bg-white p-4 text-right">
                  <h3 className="text-base font-semibold text-ink">{a.title}</h3>
                  <p className="ml-auto mt-1 max-w-[15rem] text-xs leading-snug text-muted">{a.desc}</p>
                  <span
                    aria-hidden
                    className="absolute -bottom-5 left-3 text-[5.5rem] font-medium leading-none tracking-tight text-[#e3e4dd] transition-[color,translate] duration-500 group-hover:-translate-y-2 group-hover:text-sun"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-10 max-w-3xl text-sm leading-relaxed text-ink-soft">
              {site.name} began as a small tuition centre in Chromepet with one belief — <em>education is life</em>. Today our
              tutors teach children from Pre-KG to Grade 12, online and offline, with the same promise: know every child, keep
              parents informed, and make learning steady rather than stressful.
            </p>
          </Container>
        </section>
      </div>

      <CtaBand
        title={
          <>
            Want to meet <span className="text-ghost">a tutor</span> first?
          </>
        }
        actions={
          <PillButton href={site.phoneHref} circle="sun">
            Book a call
          </PillButton>
        }
      />
    </>
  );
}
