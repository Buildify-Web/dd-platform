import Link from "next/link";
import type { Profile } from "@/content/people";
import { ProfileGrid } from "@/components/ProfileGrid";
import { ArrowUpRight, Quote } from "@/components/icons";

/**
 * Wide ink tile after the alumni cards. With 2 alumni it spans the remaining 2 columns at `lg`
 * (full width on phones) so the row is complete. Keep it short so it never sets the row height.
 */
function JourneyTile() {
  return (
    <div className="lift group relative col-span-2 flex min-w-0 flex-col justify-between gap-8 overflow-hidden rounded-[1.25rem] bg-ink p-6 sm:p-8">
      <span aria-hidden className="absolute -right-20 -top-24 size-64 rounded-full bg-[radial-gradient(circle_at_30%_30%,#2b7010,#3fa61a_70%,#56c92c)] opacity-80 transition-transform duration-700 group-hover:scale-110" />
      <Quote aria-hidden className="absolute bottom-6 right-6 size-24 text-white/[0.06] sm:size-32" />
      <div className="relative">
        <p className="text-xs text-white/60">Our alumni</p>
        <p className="mt-4 max-w-[26rem] text-[1.9rem] font-light leading-[1.15] tracking-tight text-white sm:text-[2.4rem]">
          From our classrooms to <span className="font-normal text-sun">medicine</span> and{" "}
          <span className="font-normal text-sun">technology</span>
        </p>
        <p className="mt-4 max-w-[22rem] text-sm leading-snug text-white/70">
          Every story here began with steady practice and a tutor who knew them by name.
        </p>
      </div>
      <div className="relative">
        <Link
          href="/enquiry"
          className="btn-gloss btn-gloss-light group/cta inline-flex items-center gap-3 whitespace-nowrap rounded-full bg-sun py-1.5 pl-5 pr-1.5 text-sm text-ink hover:bg-white sm:gap-4"
        >
          Start your child’s journey
          <span className="grid size-8 place-items-center rounded-full bg-ink text-white transition-transform duration-300 group-hover/cta:rotate-45">
            <ArrowUpRight className="size-4" />
          </span>
        </Link>
      </div>
    </div>
  );
}

export function AlumniGrid({ alumni }: { alumni: Profile[] }) {
  return (
    <ProfileGrid
      people={alumni}
      hashPrefix="alumni"
      noun="former student"
      eyebrow="Alumni profile"
      cta={{ href: "/enquiry", label: "Send an enquiry" }}
      tile={<JourneyTile />}
    />
  );
}
