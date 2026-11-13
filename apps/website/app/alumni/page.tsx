import type { Metadata } from "next";
import { HeroFrame, PageHero } from "@/components/HeroFrame";
import { CtaBand } from "@/components/CtaBand";
import { Container, PillButton } from "@/components/ui";
import { Star } from "@/components/icons";
import { alumni, testimonials } from "@/content/people";
import { withReviewPhotos } from "@/lib/review-photos";
import { site } from "@/lib/site";
import { AlumniGrid } from "./AlumniGrid";
import { Testimonials } from "./Testimonials";
import { VideoFeedback } from "./VideoFeedback";
import { videoFeedback } from "@/content/video-feedback";

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
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2 className="section-title text-4xl text-ink md:text-[2.75rem]">Where our students are now</h2>
            <p className="max-w-[16rem] text-xs leading-relaxed text-ink-soft md:mb-1 md:text-right">
              Tap a card to see their <strong className="font-semibold text-ink">journey after Class 12</strong>.
            </p>
          </div>
          <AlumniGrid alumni={alumni} />
        </Container>
      </section>

      <section id="student-feedback" className="pb-16 md:pb-20">
        <Container>
          <p className="eyebrow">Student’s feedback</p>
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2 className="section-title text-4xl text-ink md:text-[2.75rem]">
              Hear it from <span className="text-ghost">our students</span>
            </h2>
            <p className="max-w-[17rem] text-xs leading-relaxed text-ink-soft md:mb-1 md:text-right">
              Short videos from students, <strong className="font-semibold text-ink">in their own words</strong>. Tap for sound.
            </p>
          </div>
          <VideoFeedback items={videoFeedback} />
        </Container>
      </section>

      <div className="px-2 md:px-2.5">
        <section id="reviews" className="rounded-[1.25rem] bg-mist py-16 md:py-20">
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
                    <p className="mt-1 text-[0.6rem] text-muted">{site.googleReviewsCount} Google reviews</p>
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
                  Real <strong className="font-semibold text-ink">Google reviews</strong> from parents and students, plus{" "}
                  <strong className="font-semibold text-ink">{site.justdialReviewsCount} reviews on Justdial</strong>.
                </p>
              </div>
            </div>
            <Testimonials items={withReviewPhotos(testimonials)} />
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
