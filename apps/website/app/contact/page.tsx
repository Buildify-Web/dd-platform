import type { Metadata } from "next";
import { HeroFrame } from "@/components/HeroFrame";
import { MapIllustration } from "@/components/MapIllustration";
import { Container, PillButton, cx } from "@/components/ui";
import { ArrowUpRight, Mail, MapPin, Phone } from "@/components/icons";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Call, email or visit Dynamic Donalds. Office hours and directions.",
};

export default function ContactPage() {
  const cards = [
    { label: "Call us", value: site.phoneDisplay, href: site.phoneHref, Icon: Phone, cls: "bg-white", text: "text-ink", sub: "text-muted", icon: "bg-mist text-brand", btn: "bg-brand text-white" },
    { label: "Email us", value: site.email, href: site.emailHref, Icon: Mail, cls: "bg-brand", text: "text-white", sub: "text-white/75", icon: "bg-white/15 text-white", btn: "bg-white text-ink" },
    { label: "Visit us", value: site.addressFull, href: site.mapsHref, Icon: MapPin, cls: "bg-white", text: "text-ink", sub: "text-muted", icon: "bg-mist text-brand", btn: "bg-sun text-ink" },
  ];

  return (
    <>
      <HeroFrame>
        <div className="grid gap-10 pb-6 pt-12 lg:grid-cols-[1fr_1.15fr] lg:pt-14">
          <div className="px-5 md:px-8">
            <p className="eyebrow">Contact</p>
            <h1 className="display mt-8 text-[2.7rem] text-ink sm:text-6xl lg:text-[4rem]">
              We’d love to
              <br />
              hear from you
            </h1>
            <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
              <p className="max-w-[15rem] text-[0.8rem] leading-snug text-ink-soft">
                Call, email or drop by. For course questions, <strong className="font-semibold text-ink">the enquiry form is quickest.</strong>
              </p>
              <PillButton href="/enquiry" size="lg" className="w-fit">
                Send an enquiry
              </PillButton>
            </div>
          </div>

          <div className="relative h-[280px] lg:h-[320px]">
            <div className="absolute inset-y-0 left-5 right-0 overflow-hidden rounded-l-[160px] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.35)] lg:left-0">
              <MapIllustration />
              <div className="absolute left-1/2 top-[48%] flex -translate-x-1/2 -translate-y-full flex-col items-center">
                <span className="rounded-lg bg-ink px-3 py-2 text-xs text-white">{site.name}</span>
                <span className="-mt-1 size-2.5 rotate-45 bg-ink" />
                <span className="mt-1 size-5 rounded-full border-[3px] border-white bg-sun shadow" />
              </div>
            </div>
            <a
              href={site.mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gloss btn-gloss-light group absolute -bottom-4 right-6 inline-flex items-center gap-4 rounded-full bg-white py-1.5 pl-5 pr-1.5 text-xs text-ink lg:right-8"
            >
              Open in Google Maps
              <span className="grid size-8 place-items-center rounded-full bg-sun transition-transform duration-300 group-hover:rotate-45">
                <ArrowUpRight className="size-3.5" />
              </span>
            </a>
          </div>
        </div>

        <ul className="grid gap-3 px-5 pb-5 pt-8 md:grid-cols-3 md:px-8 md:pb-6">
          {cards.map((c) => (
            <li key={c.label}>
              <a
                href={c.href}
                {...(c.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={cx(
                  "lift group flex h-full items-center gap-4 rounded-[1rem] px-4 py-4",
                  c.cls,
                )}
              >
                <span className={cx("grid size-11 shrink-0 place-items-center rounded-full transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110", c.icon)}>
                  <c.Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cx("block text-xs", c.sub)}>{c.label}</span>
                  <span className={cx("mt-0.5 block font-semibold leading-snug [overflow-wrap:anywhere]", c.text, c.label === "Call us" ? "text-lg" : "text-[0.95rem]")}>
                    {c.value}
                  </span>
                </span>
                <span className={cx("grid size-8 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover:rotate-45", c.btn)}>
                  <ArrowUpRight className="size-3.5" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </HeroFrame>

      <section className="pt-20 md:pt-24">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <p className="eyebrow">Office hours</p>
            <h2 className="section-title mt-8 text-4xl text-ink md:text-[2.75rem]">When you can reach us</h2>
            <p className="mt-4 max-w-[17rem] text-xs leading-relaxed text-ink-soft">
              Call outside these hours? Leave an enquiry and <strong className="font-semibold text-ink">we’ll call you back.</strong>
            </p>
          </div>
          <ul className="space-y-2">
            {site.officeHours.map((h, i) => (
              <li
                key={h.day}
                className={cx(
                  "lift group relative flex h-[72px] items-center justify-end gap-10 overflow-hidden rounded-[1rem] px-5",
                  i === 1 ? "bg-sun" : "bg-paper",
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    "absolute -bottom-5 left-4 text-[5rem] font-medium leading-none tracking-tight transition-[translate] duration-500 group-hover:-translate-y-1.5",
                    i === 1 ? "text-[#e9bc0b]" : "text-[#e2e5dc]",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="relative text-sm text-ink-soft">{h.day}</span>
                <span className="relative w-32 text-right text-sm font-semibold text-ink">{h.hours}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}
