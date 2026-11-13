import type { Metadata } from "next";
import { HeroFrame, PageHero } from "@/components/HeroFrame";
import { CtaBand } from "@/components/CtaBand";
import { Container, PillButton } from "@/components/ui";
import { Home, Laptop, User, Users } from "@/components/icons";
import { gradeBands, type GradeBand } from "@/content/courses";
import { GradeTabs } from "./GradeTabs";

export const metadata: Metadata = {
  title: "Courses",
  description: "Courses for every grade and goal — Pre-KG to Grade 12 tuition, Olympiad, Spell Bee and Phonics.",
};

const modes = [
  {
    label: "Session type",
    title: "Offline",
    desc: "At our center, with RFID check-in.",
    Icon: Home,
    cls: "bg-white text-ink",
    sub: "text-muted",
  },
  {
    label: "Session type",
    title: "Online",
    desc: "Live classes from home, same tutors.",
    Icon: Laptop,
    cls: "bg-[linear-gradient(135deg,#2b7010_0%,#3c9a18_55%,#5bd12c_100%)] text-white",
    sub: "text-white/80",
  },
  {
    label: "Learning mode",
    title: "Group",
    desc: "Small batches by grade and course.",
    Icon: Users,
    cls: "bg-[linear-gradient(135deg,#f6c90e_0%,#e2b40b_55%,#8f6f05_100%)] text-ink",
    sub: "text-ink/75",
  },
  {
    label: "Learning mode",
    title: "One-on-one",
    desc: "Personal pace, held online.",
    Icon: User,
    cls: "bg-[linear-gradient(135deg,#17260f_0%,#22401a_50%,#4f8a35_100%)] text-white",
    sub: "text-white/75",
  },
];

const validIds = new Set<GradeBand["id"]>(["foundation", "9-10", "11-12"]);

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ grade?: string | string[] }> }) {
  const { grade } = await searchParams;
  const g = typeof grade === "string" ? grade : undefined;
  const initial: GradeBand["id"] = g && validIds.has(g as GradeBand["id"]) ? (g as GradeBand["id"]) : "foundation";

  return (
    <>
      <HeroFrame>
        <PageHero
          eyebrow="Courses"
          title={
            <>
              Courses for every
              <br />
              <span className="text-brand">Grade</span> &amp; <span className="text-sun">Goal</span>
            </>
          }
          aside={<PillButton href="/enquiry?interest=Fees">Ask about fees</PillButton>}
        >
          Pick your child’s grade below. <strong className="font-semibold text-ink">Enrolment opens in the parent app</strong> after
          registration.
        </PageHero>
      </HeroFrame>

      <section className="py-16 md:py-20">
        <Container>
          <GradeTabs bands={gradeBands} initial={initial} />
        </Container>
      </section>

      <div className="px-2 md:px-2.5">
        <section className="rounded-[1.25rem] bg-mist py-16 md:py-20">
          <Container>
            <p className="eyebrow">How class run</p>
            <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <h2 className="section-title text-4xl text-ink md:text-[2.75rem]">Learn the way that suits your child</h2>
              <p className="text-xs text-ink-soft md:mb-2 md:text-right">
                Choose a <strong className="font-semibold text-ink">session type</strong> and a{" "}
                <strong className="font-semibold text-ink">learning mode</strong>
                <br className="hidden md:block" /> when you enrol.
              </p>
            </div>
            <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {modes.map(({ label, title, desc, Icon, cls, sub }) => (
                <li key={title} className={`lift group flex min-h-[210px] flex-col justify-between rounded-[1.25rem] p-5 ${cls}`}>
                  <div className="flex items-start justify-between">
                    <span className="text-xs">{label}</span>
                    <Icon className="size-5 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-125" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-medium">{title}</h3>
                    <p className={`mt-1 text-xs ${sub}`}>{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      </div>

      <CtaBand
        title={
          <>
            Questions about <span className="text-ghost">fees or</span>
            <br />
            timings?
          </>
        }
        actions={<PillButton href="/enquiry" circle="sun">Send an enquiry</PillButton>}
      />
    </>
  );
}
