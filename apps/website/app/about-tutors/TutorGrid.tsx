import Link from "next/link";
import type { Tutor } from "@/content/people";
import { ProfileGrid } from "@/components/ProfileGrid";
import { ArrowUpRight } from "@/components/icons";

/** Ink tile that completes the last row of the 4-column grid. Keep it short so it never sets the row height. */
function TeamTile({ count }: { count: number }) {
  return (
    <div className="lift group relative flex min-w-0 flex-col justify-between gap-6 overflow-hidden rounded-[1.25rem] bg-ink p-4 sm:gap-8 sm:p-7">
      <span aria-hidden className="absolute -right-14 -top-14 size-32 rounded-full bg-[radial-gradient(circle_at_30%_30%,#2b7010,#3fa61a_70%,#56c92c)] opacity-80 transition-transform duration-700 group-hover:scale-110 sm:-right-16 sm:-top-16 sm:size-48" />
      <div className="relative">
        <p className="text-xs text-white/60">Our team</p>
        <p className="mt-3 text-[2.4rem] font-medium leading-none tracking-tight text-white sm:text-5xl">
          {count} <span className="text-sun">tutors</span>
        </p>
        <p className="mt-3 max-w-[16rem] text-xs leading-snug text-white/75 sm:text-sm">Sciences, humanities and engineering, under one roof.</p>
      </div>
      <div className="relative">
        <Link
          href="/enquiry?interest=Meet+a+tutor"
          className="btn-gloss btn-gloss-light group/cta inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-sun py-1.5 pl-3.5 pr-1.5 text-xs text-ink hover:bg-white sm:gap-4 sm:pl-5 sm:text-sm"
        >
          Meet a tutor
          <span className="grid size-8 place-items-center rounded-full bg-ink text-white transition-transform duration-300 group-hover/cta:rotate-45">
            <ArrowUpRight className="size-4" />
          </span>
        </Link>
      </div>
    </div>
  );
}

export function TutorGrid({ tutors }: { tutors: Tutor[] }) {
  return (
    <ProfileGrid
      people={tutors}
      hashPrefix="tutor"
      noun="tutor"
      eyebrow="Tutor profile"
      cta={{ href: "/enquiry?interest=Meet+a+tutor", label: "Ask about classes" }}
      tile={<TeamTile count={tutors.length} />}
    />
  );
}
