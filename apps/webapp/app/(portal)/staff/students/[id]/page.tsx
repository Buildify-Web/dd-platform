import type { Metadata } from "next";
import Link from "next/link";
import { Card, cx, Empty, PageHeader, Pill, Table, td, th } from "@/components/ui/kit";
import { api, param, type SearchParams } from "@/lib/api";
import { requireStaff } from "@/lib/portal";
import { LinkTabs } from "@/components/ui/kit";
import { attendanceStatusLabel, gradeLabel, type AttendanceStatus, type Grade } from "@dd/shared/domain";

type Cell = string | number | null | undefined;
type Row = Record<string, Cell>;

export const metadata: Metadata = { title: "Student" };

type Profile = { student: { id: string; name: string; code: string; grade: Grade; parentName: string | null; mobile: string; sessionType: string; learningMode: string; status: string }; stats: { attendance: number | null; homework: { done: number; total: number } }; enrolments: { id: string; name: string }[] };

/** Staff view of one student in their classes (read-only; admin edits are in the admin portal). */
export default async function StaffStudentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const { id } = await params;
  await requireStaff(`/staff/students/${id}`);
  const tab = param((await searchParams).tab) || "overview";
  const p = await api<Profile>(`/v1/students/${id}`, "staff");
  const s = p.student;
  const base = `/staff/students/${id}`;
  return (
    <>
      <PageHeader title={s.name} crumb={`${gradeLabel(s.grade)} · ${s.code}`} back={{ href: "/staff/students", label: "‹ My students" }} />
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-[18px] border border-line bg-white px-5 py-4">
          <p className="text-[13px] text-ink-soft">Attendance</p>
          <p className="mt-2 text-[28px] leading-none font-semibold tabular-nums">{p.stats.attendance === null ? "—" : `${p.stats.attendance}%`}</p>
        </div>
        <div className="rounded-[18px] bg-brand px-5 py-4 text-white">
          <p className="text-[13px] text-white/85">Homework checked</p>
          <p className="mt-2 text-[28px] leading-none font-semibold tabular-nums">
            {p.stats.homework.done}/{p.stats.homework.total}
          </p>
        </div>
        <div className="rounded-[18px] border border-line bg-white px-5 py-4">
          <p className="text-[13px] text-ink-soft">Parent</p>
          <p className="mt-2 text-[15px]">{s.parentName ?? "—"}</p>
          <p className="text-[12px] text-muted">{s.mobile.slice(0, 2)}XXXXXX{s.mobile.slice(-2)}</p>
        </div>
      </div>
      <Card>
        <LinkTabs
          active={tab}
          tabs={[
            { key: "overview", label: "Overview", href: base },
            { key: "attendance", label: "Attendance", href: `${base}?tab=attendance` },
            { key: "homework", label: "Homework", href: `${base}?tab=homework` },
            { key: "marks", label: "Marks", href: `${base}?tab=marks` },
          ]}
        />
        <div className="pt-4">
          {tab === "overview" && (
            <dl className="grid gap-4 text-[14px] sm:grid-cols-2">
              <div>
                <dt className="text-[12.5px] text-muted">Courses</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">{p.enrolments.map((e) => <Pill key={e.id} tone="sage">{e.name}</Pill>)}</dd>
              </div>
              <div>
                <dt className="text-[12.5px] text-muted">Session · mode</dt>
                <dd className="mt-1">{s.sessionType === "ONLINE" ? "Online" : "Offline"} · {s.learningMode === "ONE_ON_ONE" ? "One-on-one" : "Group"}</dd>
              </div>
            </dl>
          )}
          {tab === "attendance" && <StaffTable path={`/v1/students/${id}/attendance`} cols={["Date", "Session", "Status"]} map={(r: Row) => [r.date, r.session, attendanceStatusLabel[String(r.status) as AttendanceStatus]]} rowsKey="rows" />}
          {tab === "homework" && <StaffTable path={`/v1/students/${id}/homework`} cols={["Homework", "Due", "Status"]} map={(r: Row) => [r.title, r.dueOn, r.status === "NOT_SUBMITTED" ? "Not submitted" : r.status]} rowsKey="rows" />}
          {tab === "marks" && <StaffTable path={`/v1/students/${id}/marks`} cols={["Test", "Subject", "Marks"]} map={(r: Row) => [r.test, r.subject, `${r.score} / ${r.max}`]} rowsKey="rows" />}
        </div>
      </Card>
      <p className="mt-3 text-[12.5px] text-muted">
        <Link href="/staff/attendance" className="hover:text-ink">
          Mark attendance
        </Link>{" "}
        · edits to student details are made by admin.
      </p>
    </>
  );
}

async function StaffTable({ path, cols, map, rowsKey }: { path: string; cols: string[]; map: (r: Row) => Cell[]; rowsKey: string }) {
  const d = (await api<Record<string, Row[]>>(path, "staff"))[rowsKey] ?? [];
  if (!d.length) return <Empty title="Nothing here yet" />;
  return (
    <Table>
      <thead>
        <tr>
          {cols.map((c) => (
            <th key={c} className={th}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {d.map((r, i) => (
          <tr key={i}>
            {map(r).map((v, j) => (
              <td key={j} className={cx(td, j === 0 && "font-medium")}>{v}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
