import Image from "next/image";
import { HeroFrame } from "@/components/HeroFrame";
import { CtaBand } from "@/components/CtaBand";
import { Container, PillButton, cx } from "@/components/ui";
import { Check, Star } from "@/components/icons";
import { PhoneMockup } from "@/components/home/PhoneMockup";
import { StagesCarousel } from "@/components/home/StagesCarousel";
import { WhyChoose } from "@/components/home/WhyChoose";
import { site } from "@/lib/site";

const trustAvatars = ["/images/avatar-1.webp", "/images/avatar-2.webp", "/images/avatar-3.webp", "/images/avatar-4.webp"];

function HeroArt() {
  return (
    <div aria-hidden className="relative h-[560px] w-full lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[52%]">
      {/* green pill */}
      <span className="absolute right-0 top-[22%] h-[56%] w-[92%] rounded-l-full bg-[radial-gradient(ellipse_at_40%_50%,#2f7a12_0%,#2b7010_55%,#1f5a0a_100%)] lg:top-[27%] lg:h-[53%]" />
      {/* yellow circles */}
      <span className="absolute left-[42%] top-[4%] size-[170px] rounded-full bg-sun lg:left-[44%] lg:top-[11%] lg:size-[215px]" />
      <span className="absolute -right-16 bottom-[2%] size-[170px] rounded-full bg-sun lg:bottom-[6%] lg:size-[210px]" />
      {/* phone */}
      <div className="absolute left-1/2 top-[2%] -translate-x-[40%] -rotate-[7deg] scale-[0.92] lg:left-[36%] lg:top-[7%] lg:translate-x-0 lg:scale-100">
        <PhoneMockup />
      </div>
      {/* floating chips */}
      <div className="absolute left-[2%] top-[40%] w-[170px] rounded-xl bg-sun p-3.5 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.35)] sm:left-[10%] lg:left-[8%] lg:top-[41%] lg:w-[190px]">
        <p className="text-xl font-medium text-ink">Pre-KG-12</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[0.7rem] text-ink-soft">Every grade</span>
          <span className="grid size-5 place-items-center rounded-full bg-brand text-white">
            <Check className="size-3" strokeWidth={2.4} />
          </span>
        </div>
      </div>
      <div className="absolute bottom-[12%] right-[3%] w-[170px] rounded-xl bg-brand p-3.5 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.35)] lg:bottom-[14%] lg:right-[2%] lg:w-[190px]">
        <p className="text-xl font-medium text-white">Daily</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[0.7rem] text-white/80">Class updates</span>
          <span className="grid size-5 place-items-center rounded-full bg-white text-ink">
            <Check className="size-3" strokeWidth={2.4} />
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <HeroFrame>
        <div className="relative lg:min-h-[690px]">
          <div className="relative z-10 px-5 pb-10 pt-12 md:px-8 lg:max-w-[48%] lg:pb-12 lg:pt-[4.5rem]">
            <h1 className="display text-[2.9rem] text-ink sm:text-6xl xl:text-[4.5rem]">
              Tuition &amp;
              <br />
              Coaching <span className="text-olive">for</span>
              <br />
              <span className="text-olive">Every</span> grade &amp;
              <br />
              Goal
            </h1>
            <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
              <p className="max-w-[17rem] text-[0.9rem] leading-snug text-ink-soft">
                From Pre-KG phonics to Grade 12 boards. <strong className="font-semibold text-ink">Find the right course</strong> and
                follow every class from your phone.
              </p>
              <PillButton href="/courses" className="w-fit" size="lg">
                Find a course
              </PillButton>
            </div>
            <div className="mt-12 w-full max-w-[340px] rounded-[1rem] bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2.5">
                  {trustAvatars.map((src, i) => (
                    <Image
                      key={src}
                      src={src}
                      alt=""
                      width={44}
                      height={44}
                      className={cx("size-11 rounded-full object-cover ring-2 ring-white", i === 3 && "grayscale")}
                    />
                  ))}
                  <span className="grid size-11 place-items-center rounded-full bg-ink-soft text-[0.7rem] font-medium text-white ring-2 ring-white">
                    1K+
                  </span>
                </div>
                <div className="text-right">
                  <p className="flex items-center justify-end gap-1 text-base font-semibold text-ink">
                    <Star className="size-4 text-sun" /> {site.rating}
                  </p>
                  <p className="text-[0.65rem] text-muted">Google rating</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink">
                Trusted by <strong className="font-semibold">{site.familiesCount} families</strong>
              </p>
            </div>
          </div>
          <HeroArt />
        </div>
      </HeroFrame>

      <section className="overflow-hidden py-16 md:py-20">
        <Container>
          <StagesCarousel />
        </Container>
      </section>

      <div className="px-2 md:px-2.5">
        <section className="rounded-[1.25rem] bg-mist py-16 md:py-20">
          <Container>
            <p className="text-xs text-ink">Why parents choose us</p>
            <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <h2 className="text-4xl font-medium leading-[1.1] tracking-tight text-ink md:text-[2.6rem]">
                Keeping up with your child’s learning
                <br className="hidden md:block" /> shouldn’t be hard
              </h2>
              <p className="max-w-[18rem] text-xs leading-relaxed text-ink-soft lg:mb-1 lg:text-right">
                From daily class notes to <strong className="font-semibold text-ink">attendance alerts</strong>, we keep you in the
                loop <strong className="font-semibold text-ink">every step of the way.</strong>
              </p>
            </div>
            <WhyChoose />
          </Container>
        </section>
      </div>

      <CtaBand
        title={
          <>
            Let’s find the right
            <br />
            class <span className="text-ghost">for your child</span>
          </>
        }
        actions={
          <>
            <PillButton href="/enquiry" circle="sun">
              Send an enquiry
            </PillButton>
            <a
              href={site.phoneHref}
              className="btn-gloss btn-gloss-light rounded-full bg-mist px-6 py-3.5 text-sm text-ink hover:bg-sun"
            >
              {site.phoneDisplay}
            </a>
          </>
        }
      />
    </>
  );
}
