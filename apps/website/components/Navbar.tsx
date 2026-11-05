"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navLinks, site } from "@/lib/site";
import { useLang } from "@/lib/i18n";
import { Close, MenuIcon } from "./icons";
import { cx } from "./ui";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

function LangToggle() {
  const { lang, toggle, t } = useLang();
  const ta = lang === "ta";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={ta}
      aria-label={t("switchLang")}
      className="group flex items-center gap-2.5 text-sm text-ink"
    >
      <span className="min-w-6 text-right">{ta ? "TA" : "EN"}</span>
      <span className="relative h-5 w-10 rounded-full bg-white shadow-[inset_0_1px_2px_rgba(23,38,15,0.12)] transition-shadow group-hover:shadow-[inset_0_1px_2px_rgba(23,38,15,0.12),0_0_0_3px_rgba(246,201,14,0.25)]">
        <span
          className={cx(
            "absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-sun shadow-sm transition-all duration-300",
            ta ? "left-[calc(100%-1.125rem)]" : "left-1",
          )}
        />
      </span>
    </button>
  );
}

/** Desktop link list with a glassy pill that glides to whichever link is hovered or focused. */
function DesktopNav({ pathname, scrolled }: { pathname: string; scrolled: boolean }) {
  const { t } = useLang();
  const [glass, setGlass] = useState<{ left: number; width: number } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const moveTo = (el: HTMLElement) => setGlass({ left: el.offsetLeft, width: el.offsetWidth });

  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul
        ref={listRef}
        onMouseLeave={() => setGlass(null)}
        onBlur={(e) => {
          if (!listRef.current?.contains(e.relatedTarget as Node)) setGlass(null);
        }}
        className={cx(
          "relative flex items-center gap-0.5 rounded-full p-1 transition-[background-color,box-shadow] duration-300",
          scrolled ? "bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-white/70" : "bg-white",
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-1 top-1 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(225,230,216,0.75)_100%)] shadow-[inset_0_1px_0_#fff,0_4px_14px_-4px_rgba(23,38,15,0.25)] ring-1 ring-ink/5 transition-[left,width,opacity] duration-200 ease-out will-change-[left,width]"
          style={{ left: glass?.left ?? 0, width: glass?.width ?? 0, opacity: glass ? 1 : 0 }}
        />
        {navLinks.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <li key={l.href} onMouseEnter={(e) => moveTo(e.currentTarget)} onFocus={(e) => moveTo(e.currentTarget)}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative z-10 block rounded-full px-4 py-2 text-sm text-ink transition-colors xl:px-[1.1rem]",
                  active && "bg-sun font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_6px_-2px_rgba(158,124,6,0.5)]",
                )}
              >
                {t(l.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Fixed navbar. Sits inside the hero frame at the top of the page and turns into a
 * frosted-glass bar once the page is scrolled, so it stays available everywhere.
 */
export function Navbar() {
  const pathname = usePathname();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setScrolled(window.scrollY > 24); // React skips the render when the value is unchanged
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Close the mobile menu on route change and lock scroll while it is open.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close menu when route changes
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const glassy = scrolled || open;

  return (
    <header className="fixed inset-x-2 top-3.5 z-50 transform-gpu md:inset-x-2.5 lg:top-[18px]">
      <div
        className={cx(
          "flex items-center justify-between gap-4 rounded-[1.25rem] px-4 py-2.5 transition-[background-color,box-shadow] duration-300 ease-out md:px-6 lg:px-8",
          glassy
            ? "bg-mist/80 shadow-[0_10px_40px_-12px_rgba(23,38,15,0.28),inset_0_1px_0_rgba(255,255,255,0.7)] ring-1 ring-white/60 backdrop-blur-lg"
            : "bg-transparent",
        )}
      >
        <Link href="/" prefetch className="flex items-center gap-3 lg:gap-4" aria-label={`${site.name} — home`}>
          <Image
            src="/logo.png"
            alt=""
            width={96}
            height={85}
            priority
            className={cx("h-11 w-auto origin-left transition-transform duration-300 lg:h-[54px]", glassy && "scale-90")}
          />
          <span className="text-[0.95rem] font-medium text-ink lg:text-base">{site.name}</span>
        </Link>

        <DesktopNav pathname={pathname} scrolled={glassy} />

        <div className="hidden items-center gap-6 lg:flex">
          <LangToggle />
          <Link href="/enquiry" className="btn-gloss btn-gloss-light rounded-full bg-white px-6 py-3 text-sm text-ink hover:bg-sun">
            {t("enquireNow")}
          </Link>
        </div>

        <button
          type="button"
          className="btn-gloss btn-gloss-light grid size-11 place-items-center rounded-full bg-white text-ink lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? t("close") : t("menu")}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <Close className="size-5" /> : <MenuIcon className="size-5" />}
        </button>
      </div>

      {open ? (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full mt-2 rounded-[1.25rem] bg-white/85 p-3 shadow-xl ring-1 ring-white/70 backdrop-blur-xl lg:hidden"
        >
          <ul className="flex flex-col">
            {navLinks.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "block rounded-full px-5 py-3 text-base text-ink transition-colors",
                      active ? "bg-sun font-medium" : "hover:bg-mist/80",
                    )}
                  >
                    {t(l.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-line px-2 pt-3">
            <LangToggle />
            <Link href="/enquiry" className="btn-gloss rounded-full bg-ink px-6 py-3 text-sm text-white hover:bg-brand">
              {t("enquireNow")}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
