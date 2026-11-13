import Link from "next/link";
import type { CourseCard as Course, CourseIcon, Tone } from "@/content/courses";
import { Abc, BookNote, Calculator, Chart, Code, Flask, Globe, GradCap, SpellCheck, Trophy } from "./icons";
import { CircleArrow, cx } from "./ui";

const iconMap: Record<CourseIcon, (p: React.SVGProps<SVGSVGElement>) => React.ReactElement> = {
  book: BookNote,
  trophy: Trophy,
  flask: Flask,
  spell: SpellCheck,
  abc: Abc,
  cap: GradCap,
  calc: Calculator,
  globe: Globe,
  code: Code,
  chart: Chart,
};

export const toneStyles: Record<Tone, { bg: string; icon: string; mark: string; tag: string }> = {
  brand: { bg: "bg-brand", icon: "text-sun", mark: "text-[#4d8f2f]", tag: "text-white/90" },
  ink: { bg: "bg-ink", icon: "text-sun", mark: "text-[#34472a]", tag: "text-white/90" },
  sun: { bg: "bg-sun", icon: "text-ink", mark: "text-[#e4b509]", tag: "text-ink" },
  sage: { bg: "bg-sage", icon: "text-brand", mark: "text-[#c3d8ae]", tag: "text-brand" },
};

export function CourseIconGlyph({ icon, className }: { icon: CourseIcon; className?: string }) {
  const Icon = iconMap[icon];
  return <Icon className={className} />;
}

/** Card with a coloured block (icon, watermark, tags) and a title row beneath. */
export function CourseCard({ course, href = "/enquiry" }: { course: Course; href?: string }) {
  const s = toneStyles[course.tone];
  return (
    <Link
      href={`${href}?interest=${encodeURIComponent(course.title)}`}
      className="lift group block rounded-[1.25rem] bg-frame p-1.5"
    >
      <div className={cx("relative h-[200px] overflow-hidden rounded-[1rem] lg:h-[214px]", s.bg)}>
        <CourseIconGlyph icon={course.icon} className={cx("absolute left-5 top-5 size-8 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:scale-110", s.icon)} />
        <CourseIconGlyph
          icon={course.icon}
          className={cx("absolute -right-3 -top-2 size-36 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-6 group-hover:scale-110", s.mark)}
        />
        <div className="absolute bottom-4 left-4 flex flex-wrap gap-1.5">
          {course.tags.map((t) => (
            <span key={t} className={cx("tag-pill", s.tag)}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-start justify-between gap-3 px-3 pb-3 pt-4">
        <div>
          <h3 className="text-[0.95rem] text-ink">{course.title}</h3>
          <p className="mt-1 max-w-[14rem] text-xs leading-snug text-muted">{course.description}</p>
        </div>
        <CircleArrow label={`Enquire about ${course.title}`} />
      </div>
    </Link>
  );
}
