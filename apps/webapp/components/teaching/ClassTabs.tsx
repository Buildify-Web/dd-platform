import Link from "next/link";
import { cx } from "@/components/ui/kit";
import type { ClassInfo } from "@/lib/portal";

/** Staff class switcher ("Grade 10 · Maths 32 | Grade 9 · Maths 28 | …"). Link-based. */
export function ClassTabs({ classes, active, href, counts = true }: { classes: ClassInfo[]; active: string; href: (key: string) => string; counts?: boolean }) {
  return (
    <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Classes">
      {classes.map((c) => (
        <Link
          key={c.key}
          href={href(c.key)}
          scroll={false}
          aria-current={c.key === active ? "page" : undefined}
          className={cx(
            "inline-flex h-10 shrink-0 items-center gap-2.5 rounded-xl border px-4 text-[14px] transition-colors",
            c.key === active ? "border-ink bg-ink text-white" : "border-line-2 bg-white text-ink hover:border-ink/30",
          )}
        >
          {c.label}
          {counts && <span className={cx("text-[12px]", c.key === active ? "text-white/70" : "text-muted")}>{c.studentCount}</span>}
        </Link>
      ))}
    </nav>
  );
}
