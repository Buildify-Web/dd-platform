import type { Metadata } from "next";
import { HeroFrame } from "@/components/HeroFrame";
import { Mail, Phone } from "@/components/icons";
import { ENQUIRY_INTERESTS, type EnquiryInterest } from "@/lib/constants";
import { site } from "@/lib/site";
import { EnquiryForm } from "./EnquiryForm";

export const metadata: Metadata = {
  title: "Enquiry",
  description: "Ask Dynamic Donalds about any course — timings, fees and the right batch for your child.",
};

/** Map a course name passed from a course card (?interest=...) to an enquiry chip. */
function toInterest(raw?: string): EnquiryInterest | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase();
  if ((ENQUIRY_INTERESTS as readonly string[]).includes(raw)) return raw as EnquiryInterest;
  if (v.includes("olympiad")) return "Olympiad";
  if (v.includes("spell")) return "Spell Bee";
  if (v.includes("phonics")) return "Phonics";
  if (["maths", "physics", "chemistry", "computer science", "commerce", "accounts", "applied maths", "economics"].includes(v))
    return "Grade 11–12 subjects";
  if (v.includes("tuition") || ["maths & science", "tamil", "english", "social"].includes(v)) return "Regular tuition";
  return undefined;
}

export default async function EnquiryPage({ searchParams }: { searchParams: Promise<{ interest?: string | string[] }> }) {
  const { interest } = await searchParams;
  const initial = toInterest(typeof interest === "string" ? interest.slice(0, 60) : undefined);

  return (
    <HeroFrame>
      <div className="grid gap-8 px-5 pb-5 pt-12 md:px-8 md:pb-8 lg:grid-cols-[1fr_1.32fr] lg:gap-12 lg:pt-16">
        <div className="flex flex-col justify-between gap-10">
          <div>
            <p className="eyebrow">Enquiry</p>
            <h1 className="display mt-8 text-[2.7rem] text-ink sm:text-6xl lg:text-[4rem]">
              Ask us <span className="text-brand">about</span>
              <br />
              <span className="text-sun">any</span> course
            </h1>
            <p className="mt-8 max-w-[22rem] text-[0.85rem] leading-snug text-ink-soft">
              Tell us your child’s grade and what you’re looking for. We’ll get back with{" "}
              <strong className="font-semibold text-ink">timings, fees and the right batch.</strong>
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <a href={site.phoneHref} className="lift group flex h-[120px] flex-col justify-between rounded-[1.25rem] bg-white p-4 sm:h-[150px]">
              <span className="flex items-start justify-between text-xs text-muted">
                Call us <Phone className="size-5 text-ink transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110" />
              </span>
              <span className="text-2xl font-semibold text-ink-soft">{site.phoneDisplay}</span>
            </a>
            <a href={site.emailHref} className="lift group flex h-[120px] flex-col justify-between rounded-[1.25rem] bg-sun p-4 sm:h-[150px]">
              <span className="flex items-start justify-between text-xs text-ink-soft">
                Email us <Mail className="size-5 text-ink transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110" />
              </span>
              <span className="break-all text-base font-semibold text-ink-soft">{site.email}</span>
            </a>
          </div>
        </div>

        <div className="relative rounded-[1.5rem] bg-white p-6 md:p-8">
          <EnquiryForm initialInterest={initial} />
        </div>
      </div>
    </HeroFrame>
  );
}
