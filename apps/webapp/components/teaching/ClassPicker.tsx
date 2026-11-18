import { gradeLabel, type Grade } from "@dd/shared/domain";
import Link from "next/link";
import { FilterSelect } from "@/components/ui/client";
import { cx } from "@/components/ui/kit";
import type { ClassOpt } from "@/lib/portal";

/**
 * Class chooser. Staff: grade tabs first, then only that grade's courses (with student counts).
 * Admin: Grade + Subject selects over every course.
 */
export function ClassPicker({
  portal,
  options,
  picked,
  base,
  clear = [],
}: {
  portal: "admin" | "staff";
  options: ClassOpt[];
  picked: { grades: Grade[]; grade?: Grade; inGrade: ClassOpt[]; cls?: ClassOpt };
  base: string;
  clear?: string[];
}) {
  if (portal === "staff") {
    const grades = [...new Set(options.map((o) => o.grade))];
    const activeGrade = picked.cls?.grade ?? grades[0];
    const inGrade = options.filter((o) => o.grade === activeGrade);
    return (
      <div className="grid gap-2">
        <nav aria-label="Grades" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {grades.map((g) => {
            const first = options.find((o) => o.grade === g);
            const on = g === activeGrade;
            return (
              <Link
                key={g}
                href={`${base}?class=${encodeURIComponent(first?.key ?? "")}`}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={cx(
                  "inline-flex h-10 shrink-0 items-center rounded-xl border px-4 text-[14px] font-medium transition-colors",
                  on ? "border-ink bg-ink text-white" : "border-line-2 bg-white text-ink hover:border-ink/30",
                )}
              >
                {gradeLabel(g)}
              </Link>
            );
          })}
        </nav>
        <nav aria-label="Courses in this grade" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {inGrade.map((c) => {
            const on = c.key === picked.cls?.key;
            return (
              <Link
                key={c.key}
                href={`${base}?class=${encodeURIComponent(c.key)}`}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={cx(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-[13.5px] transition-colors",
                  on ? "border-sun bg-sun text-ink" : "border-line-2 bg-white text-ink-soft hover:border-ink/30",
                )}
              >
                {c.short}
                <span className={cx("text-[12px]", on ? "text-ink/70" : "text-muted")}>{c.studentCount}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <FilterSelect name="grade" label="Grade" className="w-[150px]" clear={["class", ...clear]} value={picked.grade ?? ""} options={picked.grades.map((g) => ({ value: g, label: gradeLabel(g) }))} />
      <FilterSelect name="class" label="Subject" className="w-[180px]" clear={clear} value={picked.cls?.key ?? ""} options={picked.inGrade.map((c) => ({ value: c.key, label: c.short }))} />
    </div>
  );
}
