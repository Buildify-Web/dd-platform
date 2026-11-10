import type { Metadata } from "next";
import { HeroFrame, PageHero } from "@/components/HeroFrame";
import { CtaBand } from "@/components/CtaBand";
import { PhotoCard } from "@/components/PhotoCard";
import { Container, PillButton } from "@/components/ui";
import { Star } from "@/components/icons";
import { alumni, testimonials } from "@/content/people";
import { site } from "@/lib/site";
import { Testimonials } from "./Testimonials";

export const metadata: Metadata = {
  title: "Alumni & Feedback",
  description: "Former students and parents share what learning at Dynamic Donalds meant to them.",
};

export default function AlumniPage() {
  return (
    <>
      <HeroFrame>
        <PageHero
          eyebrow="Alumni and Feedback"
          title={
            <>
              Stories <span className="text-sun">from</span>
              <br />
              <span className="text-brand">our</span> families
            </>
          }
        >
          Former students and parents share <strong className="font-semibold text-ink">what learning here meant</strong> to them.
        </PageHero>
      </HeroFrame>

      <section className="py-16 md:py-20">
        <Container>
          <p className="eyebrow">Alumni</p>
          <h2 className="section-title mt-8 text-4xl text-ink md:text-[2.75rem]">Proud moments from our students</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {alumni.map((a) => (
              <PhotoCard
                key={a.name}
                photo={a.photo}
                tone={a.tone}
                alt={`${a.name}, batch of ${a.batch}`}
                tags={[`Batch of ${a.batch}`]}
                tagPosition="top"
                aspect="aspect-[4/3.1]"
                title={a.name}
                subtitle={`Now at ${a.now}`}
              />
            ))}
          </div>
        </Container>
      </section>

      <div className="px-2 md:px-2.5">
        <section className="rounded-[1.25rem] bg-mist py-16 md:py-20">
          <Container>
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="eyebrow">Feedback</p>
                <h2 className="section-title mt-8 text-4xl text-ink md:text-[2.75rem]">
                  What parents and
                  <br />
                  students <span className="text-ghost">say about us</span>
                </h2>
              </div>
              <div className="flex flex-col gap-6 md:items-end">
                <div className="lift flex w-fit items-center gap-6 rounded-xl bg-white px-4 py-3">
                  <div>
                    <p className="text-2xl font-semibold leading-none text-ink">{site.rating}</p>
                    <p className="mt-1 text-[0.6rem] text-muted">{site.reviewsCount} Google reviews</p>
                  </div>
                  <div className="text-right">
                    <span className="flex gap-0.5 text-sun" aria-label="Rated 5 stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="size-3.5" />
                      ))}
                    </span>
                    <p className="mt-1 text-[0.6rem] text-muted">Average rating</p>
                  </div>
                </div>
                <p className="max-w-[16rem] text-xs text-ink-soft md:text-right">
                  Honest notes from <strong className="font-semibold text-ink">parents and students</strong> we’ve worked with.
                </p>
              </div>
            </div>
            <Testimonials items={testimonials} />
          </Container>
        </section>
      </div>

      <CtaBand
        title={
          <>
            Studied with us? <span className="text-ghost">Share your</span>
            <br />
            story
          </>
        }
        actions={
          <PillButton href={`${site.emailHref}?subject=${encodeURIComponent("My Dynamic Donalds story")}`} circle="sun">
            Email your story
          </PillButton>
        }
      />
    </>
  );
}
