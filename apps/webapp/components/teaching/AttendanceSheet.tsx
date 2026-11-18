"use client";

import type { AttendanceStatus } from "@dd/shared/domain";
import { useMemo, useState } from "react";
import { useAction } from "@/components/ui/client";
import { Avatar, btn, Card, cx, Pill, StatCard } from "@/components/ui/kit";
import { saveAttendance } from "@/lib/actions";

export type Sheet = {
  date: string;
  grade: string;
  gradeLabel: string;
  courseId: string | null;
  session: "DAY" | "MORNING" | "EVENING";
  sessions: ("DAY" | "MORNING" | "EVENING")[];
  deadline: string;
  rows: { studentId: string; name: string; rollNo: number | null; status: AttendanceStatus | null; saved: boolean; source: string; leave: string | null }[];
};

const LABEL: Record<AttendanceStatus, string> = { PRESENT: "Present", ABSENT: "Absent", LEAVE: "Leave", NA: "NA" };
const SHORT: Record<AttendanceStatus, string> = { PRESENT: "P", ABSENT: "A", LEAVE: "L", NA: "NA" };
const ON: Record<AttendanceStatus, string> = {
  PRESENT: "bg-brand text-white",
  ABSENT: "bg-absent text-ink",
  LEAVE: "bg-sun text-ink",
  NA: "bg-ink-soft text-white",
};
const ON_STAFF: Record<AttendanceStatus, string> = { ...ON, ABSENT: "bg-danger text-white" };

const fmtDeadline = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${(h ?? 0) % 12 || 12}:${String(m ?? 0).padStart(2, "0")} ${(h ?? 0) >= 12 ? "PM" : "AM"}`;
};

/**
 * Mark attendance for one grade (+ course) and session. RFID taps and approved leave arrive
 * pre-filled; anything can be changed before saving. Only changed rows are sent; changing a
 * saved mark is a correction (audited). Parents are notified when a child is marked Absent.
 */
export function AttendanceSheet({ sheet, variant, filters }: { sheet: Sheet; variant: "admin" | "staff"; filters?: React.ReactNode }) {
  const initial = useMemo(() => Object.fromEntries(sheet.rows.map((r) => [r.studentId, r.status])) as Record<string, AttendanceStatus | null>, [sheet.rows]);
  const [marks, setMarks] = useState(initial);
  const [pending, run] = useAction();
  const options: AttendanceStatus[] = variant === "admin" ? ["PRESENT", "ABSENT", "LEAVE", "NA"] : ["PRESENT", "ABSENT", "LEAVE"];

  const count = (s: AttendanceStatus | null) => Object.values(marks).filter((v) => v === s).length;
  const changed = sheet.rows.filter((r) => marks[r.studentId] && (marks[r.studentId] !== r.status || !r.saved));
  const markRest = () => setMarks((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v ?? "PRESENT"])) as typeof m);

  const save = () =>
    run(
      () =>
        saveAttendance({
          date: sheet.date,
          grade: sheet.grade,
          courseId: sheet.courseId ?? undefined,
          session: sheet.session,
          entries: changed.map((r) => ({ studentId: r.studentId, status: marks[r.studentId]! })),
        }),
      { success: (d) => `Attendance saved for ${d.saved} student${d.saved === 1 ? "" : "s"}${d.corrections ? ` (${d.corrections} correction${d.corrections > 1 ? "s" : ""} logged)` : ""}.` },
    );

  const statusControl = (id: string) => (
    <div role="radiogroup" aria-label="Attendance" className="inline-flex rounded-full bg-soft p-1">
      {options.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={marks[id] === s}
          aria-label={LABEL[s]}
          onClick={() => setMarks((m) => ({ ...m, [id]: s }))}
          className={cx(
            "h-8 rounded-full text-[12.5px] transition-colors",
            variant === "admin" ? "px-3 sm:px-3.5" : "w-11 font-medium",
            marks[id] === s ? (variant === "admin" ? ON[s] : ON_STAFF[s]) : "text-muted hover:text-ink",
          )}
        >
          {variant === "admin" ? LABEL[s] : SHORT[s]}
        </button>
      ))}
    </div>
  );

  if (variant === "admin")
    return (
      <>
        <Card className="mb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            {filters}
            <button type="button" className={btn.white} disabled={!count(null)} onClick={markRest}>
              Mark all unmarked present
            </button>
          </div>
        </Card>
        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard tone="green" label="Present" value={count("PRESENT")} />
          <StatCard label="Absent" value={count("ABSENT")} />
          <StatCard tone="sun" label="Leave applied" value={count("LEAVE")} />
          <StatCard label="Not marked" value={count(null)} />
        </div>
        <Card pad={false}>
          {sheet.rows.length === 0 ? (
            <p className="p-8 text-center text-[14px] text-muted">No active students in this grade and course.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[13.5px]">
                <thead>
                  <tr className="text-[12px] text-muted">
                    <th className="border-b border-line px-4 py-3 font-normal sm:pl-5">Student</th>
                    <th className="border-b border-line px-4 py-3 font-normal">RFID / source</th>
                    <th className="border-b border-line px-4 py-3 font-normal">Leave</th>
                    <th className="border-b border-line px-4 py-3 font-normal sm:pr-5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.rows.map((r) => (
                    <tr key={r.studentId}>
                      <td className="border-b border-line px-4 py-3 sm:pl-5">
                        <span className="flex items-center gap-3">
                          <Avatar name={r.name} size={30} />
                          <span>
                            <span className="block text-[14px]">{r.name}</span>
                            <span className="block text-[12px] text-muted">Roll {String(r.rollNo ?? "—").padStart(2, "0")}</span>
                          </span>
                        </span>
                      </td>
                      <td className="border-b border-line px-4 py-3 text-ink-soft">{r.source}</td>
                      <td className="border-b border-line px-4 py-3">{r.leave && <Pill tone={r.leave === "Approved leave" ? "cream" : "blue"}>{r.leave}</Pill>}</td>
                      <td className="border-b border-line px-4 py-3 sm:pr-5">{statusControl(r.studentId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <p className="text-[12.5px] text-muted">Not marked by {fmtDeadline(sheet.deadline)} → reminder to the teacher and admin.</p>
            <div className="flex gap-2">
              <button type="button" className={btn.white} disabled={pending || !changed.length} onClick={() => setMarks(initial)}>
                Cancel
              </button>
              <button type="button" className={btn.dark} disabled={pending || !changed.length} onClick={() => void save()}>
                {pending && <span className="spinner" />}
                Save attendance
              </button>
            </div>
          </div>
        </Card>
      </>
    );

  return (
    <>
      <Card pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
          <p className="text-[12.5px] text-muted">Students who tapped their RFID card are already marked Present. Change anything before saving.</p>
          <button type="button" onClick={markRest} className="text-[13.5px] font-medium text-brand hover:underline" disabled={!count(null)}>
            Mark the rest present
          </button>
        </div>
        {sheet.rows.length === 0 ? (
          <p className="p-8 text-center text-[14px] text-muted">No active students in this class yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {sheet.rows.map((r) => (
              <li key={r.studentId} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar name={r.name} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{r.name}</span>
                  <span className="block truncate text-[12px] text-muted">{r.leave && r.source === "No tap" ? r.leave : r.source}</span>
                </span>
                {statusControl(r.studentId)}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div className="sticky bottom-3 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-ink px-4 py-3.5 text-white shadow-[0_18px_40px_-20px_rgba(23,38,15,.7)] sm:px-5">
        <p className="text-[13.5px] text-white/80">
          <span className="font-semibold text-white">{count("PRESENT")} present</span> · {count("ABSENT")} absent · {count("LEAVE")} leave · {count(null)} not marked
        </p>
        <button type="button" className={btn.sun} disabled={pending || !changed.length} onClick={() => void save()}>
          {pending && <span className="spinner" />}
          Save attendance
        </button>
      </div>
    </>
  );
}
