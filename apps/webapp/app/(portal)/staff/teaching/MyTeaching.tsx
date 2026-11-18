"use client";

import { gradeLabel, type Grade } from "@dd/shared/domain";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GradeCourseEditor, type EditorCourse, type EditorSelection } from "@/components/teaching/GradeCourseEditor";
import { useAction } from "@/components/ui/client";
import { btn, Card, Notice } from "@/components/ui/kit";
import { cancelTeachingRequest, submitTeachingRequest } from "@/lib/actions";

export type TeachingData = {
  catalog: EditorCourse[];
  /** What the teacher teaches now (approved). */
  current: EditorSelection[];
  /** A change waiting for the admin, if any. */
  pending: { submittedAt: string; selection: EditorSelection[] } | null;
  lastDecision: { status: string; note: string | null; reviewedAt: string | null } | null;
};

const norm = (s: EditorSelection[]) =>
  JSON.stringify(
    [...s]
      .map((x) => ({ ...x, subjects: [...x.subjects].sort() }))
      .sort((a, b) => `${a.grade}|${a.courseId}`.localeCompare(`${b.grade}|${b.courseId}`)),
  );

/** The teacher's own courses. Changes are sent to the admin; they take effect only once approved. */
export function MyTeaching({ data }: { data: TeachingData }) {
  const router = useRouter();
  const [pending, run] = useAction();
  const saved = data.pending?.selection ?? data.current;
  const [value, setValue] = useState<EditorSelection[]>(saved);
  const dirty = norm(value) !== norm(saved);
  const courseName = useMemo(() => new Map(data.catalog.map((c) => [c.id, c.name])), [data.catalog]);

  // The approved courses, grouped by grade, for the "teaching now" list.
  const teachingNow = useMemo(() => {
    const byGrade = new Map<string, string[]>();
    for (const s of data.current) {
      const name = courseName.get(s.courseId) ?? "Course";
      const label = s.subjects.length ? `${name} (${s.subjects.join(", ")})` : name;
      byGrade.set(s.grade, [...(byGrade.get(s.grade) ?? []), label]);
    }
    return [...byGrade.entries()];
  }, [data.current, courseName]);

  const sentOn = data.pending ? new Date(data.pending.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
      <div className="grid gap-4">
        {data.pending && (
          <Notice tone="sun">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>Your changes were sent on {sentOn} and are waiting for the admin. Until they are approved, you keep teaching what is listed on the right.</span>
              <button
                type="button"
                className={btn.white}
                disabled={pending}
                onClick={() => void run(() => cancelTeachingRequest(), { success: "Request withdrawn.", onOk: () => (setValue(data.current), router.refresh()) })}
              >
                Withdraw request
              </button>
            </div>
          </Notice>
        )}
        {data.lastDecision?.status === "REJECTED" && !data.pending && (
          <Notice tone="red">
            The admin didn&rsquo;t approve your last change{data.lastDecision.note ? `: “${data.lastDecision.note}”` : "."} Send a new one when it&rsquo;s ready.
          </Notice>
        )}

        <Card title={data.pending ? "Your proposed courses" : "Courses you teach"}>
          <GradeCourseEditor courses={data.catalog} value={value} onChange={setValue} disabled={pending} />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-[12.5px] text-muted">Submitting sends these courses to the admin for approval.</p>
            <div className="flex gap-2">
              <button type="button" className={btn.white} disabled={!dirty || pending} onClick={() => setValue(saved)}>
                Discard
              </button>
              <button
                type="button"
                className={btn.dark}
                disabled={!dirty || pending}
                onClick={() => void run(() => submitTeachingRequest(value), { success: "Sent to the admin for approval.", onOk: () => router.refresh() })}
              >
                {pending && <span className="spinner" />}
                Submit for approval
              </button>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Teaching now" action={<span className="text-[12px] text-muted">Approved</span>}>
        {teachingNow.length === 0 ? (
          <p className="text-[13.5px] text-muted">You don&rsquo;t teach any course yet. Choose yours and submit it for approval.</p>
        ) : (
          <ul className="grid gap-2.5">
            {teachingNow.map(([grade, names]) => (
              <li key={grade} className="rounded-2xl bg-cream px-4 py-3">
                <p className="text-[13.5px] text-ink">{gradeLabel(grade as Grade)}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-soft">{names.join(" · ")}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
