"use client";

import { gradeLabel, learningModeLabel, sessionTypeLabel, type Grade, type LearningMode, type SessionType } from "@dd/shared/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton, useAction } from "@/components/ui/client";
import { btn, Card, cx, Empty, inputCls, Pill, Table, td, th } from "@/components/ui/kit";
import { allocateStudent, approveRegistration } from "@/lib/actions";

export type Roster = {
  course: { id: string; name: string; grades: Grade[]; monthlyFee: number; archived: boolean };
  pending: {
    id: string;
    code: string;
    status: "PENDING" | "INFO_REQUESTED";
    submittedAt: string;
    studentName: string;
    grade: string;
    parentName: string;
    mobile: string;
    learningMode: string;
    sessionType: string;
  }[];
  students: {
    id: string;
    code: string;
    name: string;
    grade: string;
    parentName: string | null;
    mobile: string;
    allocation: { staffId: string; staffName: string } | null;
  }[];
  /** One entry per teacher; `grades` lists every grade they teach this course in. */
  staff: { staffId: string; name: string; subject: string; grades: string[]; allocated: number }[];
};

const gradeOf = (g: string) => gradeLabel(g as Grade);
const when = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Teacher picker for one student. Only teachers who teach this course for the student's grade. */
function AllocationSelect({
  courseId,
  student,
  staff,
}: {
  courseId: string;
  student: Roster["students"][number];
  staff: Roster["staff"];
}) {
  const router = useRouter();
  const [pending, run] = useAction();
  const current = student.allocation?.staffId ?? "";
  const [value, setValue] = useState(current);
  const options = staff.filter((s) => s.grades.includes(student.grade));

  if (options.length === 0) {
    return <span className="text-[13px] text-muted">No teacher for {gradeOf(student.grade)} yet</span>;
  }

  return (
    <select
      aria-label={`Teacher for ${student.name}`}
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        void run(() => allocateStudent(courseId, student.id, next || null), {
          success: next ? "Teacher allocated." : "Allocation cleared.",
          onOk: () => router.refresh(),
          onError: () => setValue(current),
        });
      }}
      className={cx(inputCls, "h-10 max-w-[240px] text-[13.5px]")}
    >
      <option value="">Not allocated</option>
      {options.map((s) => (
        <option key={s.staffId} value={s.staffId}>
          {s.name}
          {s.subject ? ` · ${s.subject}` : ""}
        </option>
      ))}
    </select>
  );
}

export function RosterView({ roster }: { roster: Roster }) {
  const router = useRouter();
  const { course, pending, students, staff } = roster;
  const unallocated = students.filter((s) => !s.allocation).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:items-start">
      <div className="grid gap-4">
        <Card
          pad={false}
          title={
            <span className="flex items-center gap-2.5">
              Waiting for approval <Pill tone={pending.length ? "sun" : "grey"}>{pending.length}</Pill>
            </span>
          }
        >
          {pending.length === 0 ? (
            <div className="px-4 pb-5 sm:px-5">
              <Empty title="No one is waiting">New registrations for this course appear here.</Empty>
            </div>
          ) : (
            <div className="px-4 pb-2 sm:px-5">
              <Table>
                <thead>
                  <tr>
                    <th className={th}>Student</th>
                    <th className={th}>Parent</th>
                    <th className={th}>Mode</th>
                    <th className={`${th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((r) => (
                    <tr key={r.id}>
                      <td className={td}>
                        <p className="text-[14px] text-ink">{r.studentName}</p>
                        <p className="text-[12px] text-muted">
                          {gradeOf(r.grade)} · {r.code} · {when(r.submittedAt)}
                        </p>
                      </td>
                      <td className={td}>
                        <p className="text-[13.5px] text-ink-soft">{r.parentName || "—"}</p>
                        <p className="text-[12px] text-muted">{r.mobile}</p>
                      </td>
                      <td className={`${td} text-[13px] text-ink-soft`}>
                        {learningModeLabel(r.learningMode as LearningMode)} · {sessionTypeLabel(r.sessionType as SessionType)}
                      </td>
                      <td className={`${td} whitespace-nowrap text-right`}>
                        <Link href={`/admin/approvals/registrations/${r.id}`} className="mr-3 text-[13px] font-medium text-brand underline-offset-4 hover:underline">
                          Review
                        </Link>
                        <ActionButton
                          className={btn.dark}
                          action={() => approveRegistration(r.id, {})}
                          success={`${r.studentName} is now active. The parent has been emailed.`}
                          onDone={() => router.refresh()}
                          confirm={{
                            title: `Approve ${r.studentName}?`,
                            body: "This creates the student record, enrols them in the courses they chose and emails login details to the parent.",
                            confirmLabel: "Approve",
                          }}
                        >
                          Approve
                        </ActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card>

        <Card
          pad={false}
          title={
            <span className="flex items-center gap-2.5">
              Students in this course <Pill tone="grey">{students.length}</Pill>
              {unallocated > 0 && <Pill tone="sun">{unallocated} not allocated</Pill>}
            </span>
          }
        >
          {students.length === 0 ? (
            <div className="px-4 pb-5 sm:px-5">
              <Empty title="No active students yet">Approve a registration above to add a student here.</Empty>
            </div>
          ) : (
            <div className="px-4 pb-2 sm:px-5">
              <Table>
                <thead>
                  <tr>
                    <th className={th}>Student</th>
                    <th className={th}>Parent</th>
                    <th className={th}>Teacher for this course</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td className={td}>
                        <Link href={`/admin/students/${s.id}`} className="text-[14px] text-ink hover:underline">
                          {s.name}
                        </Link>
                        <p className="text-[12px] text-muted">
                          {gradeOf(s.grade)} · {s.code}
                        </p>
                      </td>
                      <td className={`${td} text-[13px] text-ink-soft`}>
                        {s.parentName || "—"}
                        <span className="block text-[12px] text-muted">{s.mobile}</span>
                      </td>
                      <td className={td}>
                        <AllocationSelect courseId={course.id} student={s} staff={staff} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <Card title="Teachers for this course" action={<span className="text-[12px] text-muted">{staff.length} assigned</span>}>
        {staff.length === 0 ? (
          <Empty title="No teacher teaches this course yet">
            Assign a teacher to this course and grade in <Link href="/admin/staff" className="text-brand underline-offset-4 hover:underline">Staff</Link>, then they can be allocated students here.
          </Empty>
        ) : (
          <ul className="grid gap-2">
            {staff.map((s) => (
              <li key={s.staffId} className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] text-ink">{s.name}</p>
                  <p className="text-[12px] text-muted">
                    {s.grades.map(gradeOf).join(", ")}
                    {s.subject ? ` · ${s.subject}` : ""}
                  </p>
                </div>
                <Pill tone={s.allocated ? "green" : "grey"}>{s.allocated} student{s.allocated === 1 ? "" : "s"}</Pill>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-[12px] leading-relaxed text-muted">
          Teachers see the students of their grade and course. Allocating a student records which teacher handles them for this course.
        </p>
      </Card>
    </div>
  );
}
