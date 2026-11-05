"use client";

import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import { useLang } from "@/lib/i18n";
import { Mail, MapPin, Phone } from "./icons";

export function Footer() {
  const { t } = useLang();
  const explore = [
    { href: "/courses", label: t("courses") },
    { href: "/about-tutors", label: t("tutors") },
    { href: "/achievements", label: t("achievements") },
    { href: "/gallery", label: t("gallery") },
    { href: "/alumni", label: t("alumniFeedback") },
  ];
  const programmes = [
    { href: "/courses?grade=foundation", label: "Pre‑KG – Grade 8" },
    { href: "/courses?grade=9-10", label: "Grades 9 – 10" },
    { href: "/courses?grade=11-12", label: "Grades 11 – 12" },
    { href: "/achievements", label: "Olympiad & Spell Bee" },
  ];
  const contact = [
    { Icon: Phone, label: site.phoneDisplay, href: site.phoneHref },
    { Icon: Mail, label: site.email, href: site.emailHref },
    { Icon: MapPin, label: site.addressShort, href: site.mapsHref },
  ];

  return (
    <footer className="mx-auto mt-16 w-full max-w-[1320px] px-3 pb-3 md:mt-20 md:px-8 md:pb-0">
      <div className="relative overflow-hidden rounded-[1.25rem] bg-paper md:rounded-b-none">
        <div className="grid gap-10 px-6 pt-12 sm:grid-cols-2 md:px-10 lg:grid-cols-[1.3fr_0.8fr_0.9fr_1.25fr] lg:gap-8 lg:px-14 lg:pt-14">
          {/* brand */}
          <div>
            <Link href="/" aria-label={`${site.name} — home`} className="inline-block">
              <Image src="/logo.png" alt={site.name} width={160} height={141} className="h-[84px] w-auto lg:h-[96px]" />
            </Link>
            <p className="mt-5 max-w-[17rem] text-[0.95rem] leading-relaxed text-ink-soft">{t("footerTagline")}</p>
          </div>

          <FooterCol title={t("explore")}>
            {explore.map((l) => (
              <li key={l.href}>
                <FooterLink href={l.href}>{l.label}</FooterLink>
              </li>
            ))}
          </FooterCol>

          <FooterCol title={t("programmes")}>
            {programmes.map((l) => (
              <li key={l.label}>
                <FooterLink href={l.href}>{l.label}</FooterLink>
              </li>
            ))}
          </FooterCol>

          <FooterCol title={t("contact")}>
            {contact.map(({ Icon, label, href }) => (
              <li key={label}>
                <a
                  href={href}
                  {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group flex items-start gap-3 text-ink-soft transition-colors hover:text-brand"
                >
                  <span className="mt-px grid size-7 shrink-0 place-items-center rounded-full bg-white text-brand shadow-[inset_0_1px_0_#fff,0_1px_2px_rgba(23,38,15,0.08)] transition-colors group-hover:bg-sun group-hover:text-ink">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="pt-0.5 [overflow-wrap:anywhere]">{label}</span>
                </a>
              </li>
            ))}
          </FooterCol>
        </div>

        <div className="mx-6 mt-12 flex flex-col gap-2 border-t border-line py-6 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between md:mx-10 lg:mx-14">
          <p>
            © {new Date().getFullYear()} {site.name}
          </p>
          <p>{t("appNote")}</p>
        </div>

        <p
          aria-hidden
          className="pointer-events-none -mb-[0.24em] mt-6 select-none whitespace-nowrap px-4 text-center text-[min(8.6vw,7.6rem)] font-normal uppercase leading-none tracking-[0.02em] text-[#e2e8d9] md:mt-8"
        >
          Dynamic Donalds
        </p>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2 text-ink-soft transition-colors hover:text-brand">
      <span className="h-px w-0 bg-brand transition-all duration-300 group-hover:w-3" />
      {children}
    </Link>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="lg:pt-6">
      <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-ink">{title}</h2>
      <ul className="mt-5 space-y-3.5 text-[0.95rem]">{children}</ul>
    </div>
  );
}
