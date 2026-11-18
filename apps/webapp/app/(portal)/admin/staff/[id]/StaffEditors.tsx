"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GradeCourseEditor, type EditorSelection } from "@/components/teaching/GradeCourseEditor";
import { ActionButton, useAction } from "@/components/ui/client";
import { btn, Card, cx, inputBase } from "@/components/ui/kit";
import { deleteStaff, resetStaffPassword, saveAssignment, saveTimetable, setStaffStatus } from "@/lib/actions";
import type { ClassInfo, CourseLite } from "@/lib/portal";

/** Reset password / Disable (or Enable) / Delete account. */
export function AccountActions({ id, status, name }: { id: string; status: string; name: string }) {
  const router = useRouter();
  const disabled = status === "DISABLED";
  return (
    <>
      {!disabled && (
        <ActionButton
          className={btn.white}
          action={() => resetStaffPassword(id)}
          success={status === "ACTIVE" ? "Password reset link sent." : "New login details sent."}
          confirm={{ title: "Reset password?", body: status === "ACTIVE" ? `${name} gets an email with a link to set a new password.` : `${name} hasn't activated yet. They'll get a fresh temporary password.`, confirmLabel: "Send email" }}
        >
          Reset password
        </ActionButton>
      )}
      <ActionButton
        className={disabled ? btn.dark : btn.danger}
        action={() => setStaffStatus(id, disabled ? "ACTIVE" : "DISABLED")}
        success={disabled ? "Account enabled." : "Account disabled. They were signed out everywhere."}
        confirm={
          disabled
            ? { title: "Enable this account?", confirmLabel: "Enable" }
            : { title: `Disable ${name}'s account?`, body: "They are signed out on every device and can't sign in until you enable the account again.", confirmLabel: "Disable", danger: true }
        }
      >
        {disabled ? "Enable account" : "Disable account"}
      </ActionButton>
      <ActionButton
        className={btn.danger}
        action={() => deleteStaff(id)}
        success="Staff account deleted."
        onDone={() => router.push("/admin/staff")}
        confirm={{
          title: `Delete ${name}'s account?`,
          body: "This permanently removes the login, assignments, timetable, RFID cards and leave requests. Class updates, homework, tests and attendance they recorded stay in the records. This can't be undone. To keep the account but block sign-in, use Disable instead.",
          confirmLabel: "Delete permanently",
          danger: true,
        }}
      >
        Delete account
      </ActionButton>
    </>
  );
}

/** Teaching assignment, grade by grade: which courses (and subjects) this teacher takes in each grade. */
export function AssignmentEditor({ staffId, initial, courses }: { staffId: string; initial: { selection: EditorSelection[] }; courses: CourseLite[] }) {
  const [value, setValue] = useState<EditorSelection[]>(initial.selection);
  const [pending, run] = useAction();
  const catalog = useMemo(() => courses.map((c) => ({ id: c.id, name: c.name, grades: c.grades, subjects: c.subjects })), [courses]);

  const norm = (s: EditorSelection[]) =>
    JSON.stringify(
      [...s]
        .map((x) => ({ ...x, subjects: [...x.subjects].sort() }))
        .sort((a, b) => `${a.grade}|${a.courseId}`.localeCompare(`${b.grade}|${b.courseId}`)),
    );
  const dirty = norm(value) !== norm(initial.selection);

  return (
    <Card title="Teaching assignment" action={<span className="text-[12px] text-muted">The teacher sees students of these grades and courses</span>}>
      <GradeCourseEditor courses={catalog} value={value} onChange={setValue} disabled={pending} />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-[12.5px] text-muted">Saving updates the teacher&rsquo;s courses straight away.</p>
        <div className="flex gap-2">
          <button type="button" className={btn.white} disabled={!dirty || pending} onClick={() => setValue(initial.selection)}>
            Discard
          </button>
          <button type="button" className={btn.dark} disabled={!dirty || pending} onClick={() => void run(() => saveAssignment(staffId, { selection: value }), { success: "Assignment saved." })}>
            {pending && <span className="spinner" />}
            Save assignment
          </button>
        </div>
      </div>
    </Card>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Timetable per class (drives the staff dashboard's "Next class" and today's list). */
export function TimetableEditor({ staffId, classes }: { staffId: string; classes: ClassInfo[] }) {
  const init = () => classes.map((c) => ({ key: c.key, label: c.label, days: c.days, startTime: c.startTime ?? "", endTime: c.endTime ?? "", room: c.room ?? "" }));
  const [rows, setRows] = useState(init);
  const [pending, run] = useAction();
  if (!classes.length) return null;
  const dirty = JSON.stringify(rows) !== JSON.stringify(init());
  const set = (i: number, patch: Partial<(typeof rows)[number]>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <Card title="Timetable" action={<span className="text-[12px] text-muted">Shown on the teacher&rsquo;s dashboard</span>}>
      <ul className="divide-y divide-line">
        {rows.map((r, i) => (
          <li key={r.key} className="grid gap-3 py-3.5 first:pt-0 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <p className="text-[14px]">{r.label}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {DAYS.map((d, n) => {
                  const on = r.days.includes(n);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set(i, { days: on ? r.days.filter((x) => x !== n) : [...r.days, n].sort() })}
                      className={cx("h-8 w-11 rounded-full text-[12px] transition-colors", on ? "bg-ink text-white" : "bg-soft text-muted hover:text-ink")}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input type="time" aria-label={`${r.label} start`} value={r.startTime} onChange={(e) => set(i, { startTime: e.target.value })} className={cx(inputBase, "h-11 px-3 w-[120px]")} />
              <span className="text-muted">–</span>
              <input type="time" aria-label={`${r.label} end`} value={r.endTime} onChange={(e) => set(i, { endTime: e.target.value })} className={cx(inputBase, "h-11 px-3 w-[120px]")} />
              <input aria-label={`${r.label} room`} placeholder="Room" maxLength={30} value={r.room} onChange={(e) => set(i, { room: e.target.value })} className={cx(inputBase, "h-11 px-3 w-[110px]")} />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className={btn.dark}
          disabled={!dirty || pending}
          onClick={() => void run(() => saveTimetable(staffId, rows.map(({ key, days, startTime, endTime, room }) => ({ key, days, startTime, endTime, room }))), { success: "Timetable saved." })}
        >
          {pending && <span className="spinner" />}
          Save timetable
        </button>
      </div>
    </Card>
  );
}
