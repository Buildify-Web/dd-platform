"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Profile, ProfileStep } from "@/content/people";
import { ArrowLeft, ArrowRight, Briefcase, Close, Flask, GradCap } from "@/components/icons";
import { CircleArrow, PillButton, cx } from "@/components/ui";

const stepStyle: Record<ProfileStep["kind"], { Icon: typeof GradCap; cls: string; label: string }> = {
  education: { Icon: GradCap, cls: "bg-sun text-ink", label: "Education" },
  research: { Icon: Flask, cls: "bg-sage text-brand", label: "Research" },
  work: { Icon: Briefcase, cls: "bg-brand text-white", label: "Work" },
};

/** Faces sit in the upper part of every portrait, so crops keep the top. */
const FACE = "object-cover object-[50%_22%]";

function ProfileCard({ t, onOpen }: { t: Profile; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`${t.name}: view profile`}
      className="lift group block h-full w-full rounded-[1.25rem] bg-frame p-1.5 text-left"
    >
      <div className="relative aspect-[4/4.7] overflow-hidden rounded-[1rem] bg-mist">
        {t.photo ? (
          <Image
            src={t.photo}
            alt=""
            fill
            sizes="(min-width:1024px) 25vw, 50vw"
            className={cx(FACE, "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]")}
          />
        ) : null}
        <span className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/55 to-transparent" />
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap gap-1.5 sm:bottom-3 sm:left-3">
          {t.tags.map((tag, i) => (
            <span key={tag} className={cx("tag-pill text-white backdrop-blur-[2px]", i > 0 && "hidden sm:inline-flex")}>
              {tag}
            </span>
          ))}
        </div>
        <span className="absolute right-2.5 top-2.5 rounded-full bg-white/90 px-3 py-1.5 text-[0.7rem] text-ink opacity-0 shadow-sm transition-[opacity,translate] duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 sm:right-3 sm:top-3 [translate:0_-4px] group-hover:[translate:0_0]">
          View profile
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 px-2 pb-2.5 pt-3 sm:gap-3 sm:px-3 sm:pb-3 sm:pt-4">
        <div className="min-w-0">
          <h3 className="truncate text-[0.95rem] font-medium text-ink">{t.name}</h3>
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted sm:line-clamp-1">{t.headline}</p>
        </div>
        <CircleArrow className="hidden sm:grid" />
      </div>
    </button>
  );
}

function Path({ steps }: { steps: ProfileStep[] }) {
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const { Icon, cls, label } = stepStyle[s.kind];
        const last = i === steps.length - 1;
        return (
          <li key={`${s.title}-${i}`} className="relative grid grid-cols-[2.25rem_1fr] gap-3.5 pb-5 last:pb-0">
            {!last ? <span aria-hidden className="absolute bottom-0 left-[1.125rem] top-10 w-px -translate-x-1/2 bg-line" /> : null}
            <span className={cx("relative grid size-9 place-items-center rounded-full", cls)}>
              <Icon className="size-4" />
              <span className="sr-only">{label}</span>
            </span>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-[0.95rem] font-semibold leading-snug text-ink">{s.title}</p>
                {s.when ? <p className="shrink-0 text-xs tabular-nums text-muted">{s.when}</p> : null}
              </div>
              {s.place ? <p className="mt-0.5 text-sm leading-snug text-ink-soft">{s.place}</p> : null}
              {s.note ? (
                <span className="mt-2 inline-flex items-center rounded-full bg-sun px-2.5 py-1 text-[0.7rem] font-medium text-ink">{s.note}</span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Shared people grid used by the Tutors and Alumni pages: photo cards + a profile dialog
 * (photo, headline, optional "Teaches" chips, education / work timeline).
 * Arrow keys / buttons move between people; the open profile is reflected in the URL hash
 * (#<hashPrefix>-<id>) so a profile can be shared and opens on load.
 * `tile` is an extra grid cell rendered after the cards (used to complete the last row).
 */
export function ProfileGrid({
  people,
  hashPrefix,
  noun,
  eyebrow,
  cta,
  tile,
}: {
  people: Profile[];
  /** e.g. "tutor" → #tutor-bashir */
  hashPrefix: string;
  /** singular, used in labels: "tutor", "alumna" */
  noun: string;
  /** small label above the name in the dialog */
  eyebrow: string;
  /** button in the dialog footer */
  cta: { href: string; label: string };
  tile?: ReactNode;
}) {
    const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const t = index === null ? null : (people[index] ?? null);

  const step = useCallback((dir: 1 | -1) => setIndex((i) => (i === null ? i : (i + dir + people.length) % people.length)), [people.length]);

  // open from a shared link (#tutor-bashir), on load and when the hash changes in place
  useEffect(() => {
    const fromHash = () => {
      const prefix = `#${hashPrefix}-`;
      const h = window.location.hash;
      const id = h.startsWith(prefix) ? h.slice(prefix.length) : null;
      const i = id ? people.findIndex((x) => x.id === id) : -1;
      if (i >= 0) setIndex(i);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [people, hashPrefix]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (t && !d.open) d.showModal();
    if (!t && d.open) d.close();
    const url = window.location.pathname + window.location.search + (t ? `#${hashPrefix}-${t.id}` : "");
    window.history.replaceState(window.history.state, "", url);
    document.body.style.overflow = t ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [t, hashPrefix]);

  const prev = index === null ? null : people[(index - 1 + people.length) % people.length];
  const next = index === null ? null : people[(index + 1) % people.length];

  return (
    <>
      <div className="mt-10 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {people.map((x, i) => (
          <ProfileCard key={x.id} t={x} onOpen={() => setIndex(i)} />
        ))}
        {tile}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setIndex(null)}
        onClick={(e) => e.target === e.currentTarget && setIndex(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        aria-labelledby="profile-dialog-name"
        className="m-auto max-h-[92dvh] w-[min(94vw,1000px)] max-w-none overflow-hidden rounded-[1.5rem] bg-white p-0 shadow-2xl backdrop:bg-ink/75 backdrop:backdrop-blur-sm"
      >
        {t && index !== null ? (
          <div
            key={t.id}
            className={cx(
              "anim-rise grid max-h-[92dvh] overflow-y-auto md:grid-cols-[0.85fr_1.15fr] md:overflow-hidden",
              // short profiles get a shorter dialog so there's no empty band above the footer
              !t.teaches && t.path.length <= 3 ? "md:h-[min(540px,88dvh)]" : "md:h-[min(660px,88dvh)]",
            )}
          >
            {/* photo */}
            <div className="p-2 md:h-full">
              <div className="relative aspect-[4/3.6] overflow-hidden rounded-[1.1rem] bg-mist sm:aspect-[4/3] md:aspect-auto md:h-full">
                {t.photo ? (
                  <Image src={t.photo} alt={`${t.name}, ${noun}`} fill sizes="(min-width:768px) 420px, 94vw" className={FACE} />
                ) : null}
                <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[0.7rem] tabular-nums text-ink shadow-sm">
                  {index + 1} of {people.length}
                </span>
                <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
                  {t.tags.map((tag) => (
                    <span key={tag} className="tag-pill text-white backdrop-blur-[2px]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* details */}
            <div className="flex min-h-0 flex-col md:overflow-hidden">
              <div className="flex-1 p-5 pt-3 sm:p-7 sm:pb-6 md:min-h-0 md:overflow-y-auto md:pl-5">
                <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="eyebrow">{eyebrow}</p>
                  <h2 id="profile-dialog-name" className="mt-2 text-3xl font-medium leading-tight tracking-tight text-ink sm:text-4xl">
                    {t.name}
                  </h2>
                  <p className="mt-2 text-sm leading-snug text-ink-soft">{t.headline}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIndex(null)}
                  aria-label="Close profile"
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-mist text-ink transition-colors hover:bg-sun"
                >
                  <Close className="size-4" />
                </button>
              </div>

              {t.teaches ? (
                <section className="mt-7">
                  <h3 className="text-xs text-ghost">Teaches</h3>
                  <div className="mt-3 space-y-2.5">
                    {t.teaches.map((g) => (
                      <div key={g.group} className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-ink px-2.5 py-1 text-[0.7rem] font-medium text-white">{g.group}</span>
                        {g.subjects.map((s) => (
                          <span key={s} className="rounded-full bg-mist px-2.5 py-1 text-xs text-ink">
                            {s}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="mt-7">
                <h3 className="text-xs text-ghost">{t.path.some((s) => s.kind === "work") ? "Education & experience" : "Education"}</h3>
                <div className="mt-4">
                  <Path steps={t.path} />
                </div>
              </section>

              </div>
              {/* pinned footer: stays visible while a long profile scrolls */}
              <div className="mx-5 flex shrink-0 flex-col-reverse gap-4 border-t border-line py-5 sm:mx-7 sm:flex-row md:ml-5 sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label={`Previous ${noun}: ${prev?.name}`}
                    className="grid size-10 place-items-center rounded-full bg-mist text-ink transition-colors hover:bg-sun"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    className="group flex h-10 items-center gap-2 rounded-full bg-mist pl-4 pr-1 text-sm text-ink transition-colors hover:bg-sun"
                  >
                    <span className="max-w-[9rem] truncate">
                      <span className="text-muted group-hover:text-ink">Next:</span> {next?.name}
                    </span>
                    <span className="grid size-8 place-items-center rounded-full bg-white">
                      <ArrowRight className="size-4" />
                    </span>
                  </button>
                </div>
                <PillButton href={cta.href} circle="sun" className="w-fit">
                  {cta.label}
                </PillButton>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
