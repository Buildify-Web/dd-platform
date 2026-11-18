"use client";

import { GRADES, gradeLabel, type Grade } from "@dd/shared/domain";
import { useMemo, useState } from "react";
import { Chip } from "@/components/ui/client";
import { cx } from "@/components/ui/kit";

export type EditorCourse = { id: string; name: string; grades: string[]; subjects: string[] };
/** One grade × course. subjects [] = the whole course (also the answer for a course with no subjects). */
export type EditorSelection = { grade: string; courseId: string; subjects: string[] };

/**
 * Teaching editor, grade by grade. Pick a grade tab, then the courses taught in that grade. A
 * course with subjects can narrow to some of them. The same course can be taught in one grade
 * and not in another.
 */
export function GradeCourseEditor({
  courses,
  value,
  onChange,
  disabled = false,
}: {
  courses: EditorCourse[];
  value: EditorSelection[];
  onChange: (next: EditorSelection[]) => void;
  disabled?: boolean;
}) {
  const grades = useMemo(() => GRADES.filter((g) => courses.some((c) => c.grades.includes(g))) as string[], [courses]);
  const countFor = (g: string) => value.filter((s) => s.grade === g).length;
  const [picked, setPicked] = useState<string | null>(null);
  const active = picked && grades.includes(picked) ? picked : (grades.find((g) => countFor(g) > 0) ?? grades[0]);

  if (!active) return <p className="text-[13.5px] text-muted">No courses are set up yet. Add courses first.</p>;

  const offered = courses.filter((c) => c.grades.includes(active));
  const find = (courseId: string) => value.find((s) => s.grade === active && s.courseId === courseId);
  const toggleCourse = (courseId: string) => {
    const on = find(courseId);
    onChange(on ? value.filter((s) => !(s.grade === active && s.courseId === courseId)) : [...value, { grade: active, courseId, subjects: [] }]);
  };
  const toggleSubject = (courseId: string, subject: string) =>
    onChange(
      value.map((s) => {
        if (!(s.grade === active && s.courseId === courseId)) return s;
        return { ...s, subjects: s.subjects.includes(subject) ? s.subjects.filter((x) => x !== subject) : [...s.subjects, subject] };
      }),
    );
  const courseCount = value.length;
  const gradeCount = new Set(value.map((s) => s.grade)).size;

  return (
    <div className="grid gap-4">
      <div role="tablist" aria-label="Grades" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {grades.map((g) => {
          const on = g === active;
          const n = countFor(g);
          return (
            <button
              key={g}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setPicked(g)}
              className={cx(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-[14px] transition-colors",
                on ? "border-ink bg-ink text-white" : "border-line-2 bg-white text-ink hover:border-ink/30",
              )}
            >
              {gradeLabel(g as Grade)}
              <span className={cx("grid min-w-5 place-items-center rounded-full px-1.5 text-[11px]", n ? "bg-sun text-ink" : on ? "bg-white/15 text-white/70" : "bg-soft text-muted")}>{n}</span>
            </button>
          );
        })}
      </div>

      <div>
        <p className="mb-2.5 text-[13px] text-ink-soft">
          Courses taught in <span className="text-ink">{gradeLabel(active as Grade)}</span>
        </p>
        <ul className="grid gap-2.5">
          {offered.map((c) => {
            const sel = find(c.id);
            return (
              <li key={c.id} className={cx("rounded-2xl border p-4 transition-colors", sel ? "border-ink/25 bg-sun/25" : "border-line bg-white")}>
                <div className="flex items-center justify-between gap-3">
                  <button type="button" aria-pressed={!!sel} disabled={disabled} onClick={() => toggleCourse(c.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-60">
                    <span className={cx("grid size-5 shrink-0 place-items-center rounded-md border text-[12px]", sel ? "border-ink bg-ink text-white" : "border-line-2 bg-white")} aria-hidden>
                      {sel ? "✓" : ""}
                    </span>
                    <span className="truncate text-[14.5px] text-ink">{c.name}</span>
                  </button>
                  {sel && <span className="shrink-0 text-[12px] text-ink-soft">{sel.subjects.length ? `${sel.subjects.length} subject${sel.subjects.length === 1 ? "" : "s"}` : "Whole course"}</span>}
                </div>
                {sel && c.subjects.length > 0 && (
                  <div className="mt-3 border-t border-line pt-3">
                    <p className="mb-2 text-[12.5px] text-ink-soft">
                      Subjects you take <span className="text-muted">(none selected = the whole course)</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {c.subjects.map((s) => (
                        <Chip key={s} selected={sel.subjects.includes(s)} disabled={disabled} onClick={() => toggleSubject(c.id, s)}>
                          {s}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {offered.length === 0 && <li className="text-[13.5px] text-muted">No courses are offered for this grade.</li>}
        </ul>
      </div>

      <p className="text-[12.5px] text-muted">
        {courseCount === 0 ? "Nothing selected yet." : `${courseCount} course${courseCount === 1 ? "" : "s"} across ${gradeCount} grade${gradeCount === 1 ? "" : "s"}.`}
      </p>
    </div>
  );
}
