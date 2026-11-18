import { formatINR, GRADES, gradeLabel, istDate } from "@dd/shared/domain";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterSelect } from "@/components/ui/client";
import { DateFilter } from "@/components/ui/DateFilter";
import { btn, Card, cx, Empty, PageHeader, Pill, PillTabs, StatCard, StatGrid, Table, td, th } from "@/components/ui/kit";
import { api, param, qs, type SearchParams } from "@/lib/api";
import { addDays } from "@/lib/date-utils";
import { getMeta, requireAdmin } from "@/lib/portal";

export const metadata: Metadata = { title: "Reports" };

type Attendance = {
  range: { label: string };
  threshold: number;
  average: number | null;
  morning: { rate: number | null; checkIns: number };
  evening: { rate: number | null; checkIns: number };
  belowCount: number;
  byGrade: { grade: string; label: string; rate: number }[];
  below: { studentId: string; name: string; grade: string; present: number; absent: number; rate: number }[];
};
type Homework = { totals: { homework: number; expected: number; submitted: number; checked: number; notCompleted: number }; rows: { id: string; title: string; classLabel: string; teacher: string; dueOn: string; total: number; submitted: number; checked: number; notCompleted: number }[] };
type Dues = { total: number; students: number; rows: { studentId: string; name: string; grade: string; parent: string | null; mobile: string; months: string; balance: number; reminders: boolean }[] };
type Collection = { total: number; count: number; byMethod: { method: string; label: string; amount: number; count: number }[]; byDay: { date: string; label: string; amount: number }[]; rows: { id: string; date: string; student: string; grade: string; method: string; reference: string | null; amount: number }[] };

const TABS = [
  { key: "attendance", label: "Attendance", src: "reports/attendance" },
  { key: "homework", label: "Homework", src: "homework/report" },
  { key: "dues", label: "Pending dues", src: "reports/dues" },
  { key: "collection", label: "Fee collection", src: "reports/collection" },
] as const;

/** Design: "Reports & exports" (Finance / Reports). Date-range reports with CSV / Excel. */
export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/reports");
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === param(sp.tab)) ?? TABS[0];
  const today = istDate();
  const f = { from: param(sp.from) || addDays(today, -6), to: param(sp.to) || today, grade: param(sp.grade), courseId: param(sp.courseId) };
  const meta = await getMeta("admin");
  const courses = f.grade ? meta.courses.filter((c) => c.grades.includes(f.grade as never)) : meta.courses;
  const q = qs({ from: f.from, to: f.to, grade: f.grade, courseId: f.courseId });
  const exp = (format: string) => `/api/export${qs({ src: `${tab.src}/export`, from: f.from, to: f.to, grade: f.grade, courseId: f.courseId, format })}`;
  const tabHref = (k: string) => `/admin/reports${qs({ tab: k === "attendance" ? "" : k, from: param(sp.from), to: param(sp.to), grade: f.grade })}`;

  return (
    <>
      <PageHeader
        title="Reports"
        crumb="Finance / Reports"
        actions={
          <>
            <a href={exp("csv")} className={btn.white}>
              Download CSV
            </a>
            <a href={exp("xlsx")} className={btn.dark}>
              Download Excel
            </a>
          </>
        }
      />
      <Card className="mb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PillTabs active={tab.key} tabs={TABS.map((t) => ({ key: t.key, label: t.label, href: tabHref(t.key) }))} />
          <div className="flex flex-wrap items-center gap-2">
            {tab.key !== "dues" && (
              <>
                <DateFilter name="from" label="From" value={f.from} max={f.to} />
                <span className="text-[12.5px] text-muted">to</span>
                <DateFilter name="to" label="To" value={f.to} min={f.from} max={today} />
              </>
            )}
            <FilterSelect name="grade" label="Grade" className="w-[140px]" clear={["courseId"]} value={f.grade} options={[{ value: "", label: "All grades" }, ...GRADES.map((g) => ({ value: g, label: gradeLabel(g) }))]} />
            {(tab.key === "attendance" || tab.key === "homework") && <FilterSelect name="courseId" label="Course" className="w-[150px]" value={f.courseId} options={[{ value: "", label: "All courses" }, ...courses.map((c) => ({ value: c.id, label: c.name }))]} />}
          </div>
        </div>
      </Card>
      {tab.key === "attendance" && <AttendanceReport q={q} />}
      {tab.key === "homework" && <HomeworkReport q={q} />}
      {tab.key === "dues" && <DuesReport grade={f.grade} />}
      {tab.key === "collection" && <CollectionReport q={q} />}
    </>
  );
}

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 10) / 10}%`);

async function AttendanceReport({ q }: { q: string }) {
  const d = await api<Attendance>(`/v1/reports/attendance${q}`);
  const max = Math.max(...d.byGrade.map((g) => g.rate), 0);
  const min = Math.min(...d.byGrade.map((g) => g.rate), 100);
  return (
    <>
      <StatGrid>
        <StatCard tone="green" label="Average attendance" value={pct(d.average)} sub={d.range.label} />
        <StatCard label="Morning session" value={pct(d.morning.rate)} sub={`${d.morning.checkIns.toLocaleString("en-IN")} check-ins`} />
        <StatCard label="Evening session" value={pct(d.evening.rate)} sub={`${d.evening.checkIns.toLocaleString("en-IN")} check-ins`} />
        <StatCard tone="sun" label={`Below ${d.threshold}%`} value={d.belowCount} sub="students flagged" />
      </StatGrid>
      <Card title="Attendance by grade" action={<span className="text-[12px] text-muted">RFID + manual</span>} className="mb-3">
        {d.byGrade.length === 0 ? (
          <p className="py-8 text-center text-[13.5px] text-muted">No attendance in this range.</p>
        ) : (
          <div className="flex h-56 items-end gap-3 border-b border-line pb-0 sm:gap-6" role="img" aria-label={`Attendance by grade: ${d.byGrade.map((g) => `${g.label} ${g.rate}%`).join(", ")}`}>
            {d.byGrade.map((g) => (
              <div key={g.grade} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                <span className="mb-1.5 text-[12px] text-ink-soft tabular-nums">{Math.round(g.rate)}%</span>
                <span className={cx("w-full max-w-[76px] rounded-t-[10px]", (g.rate === max || g.rate === min) && d.byGrade.length > 1 ? "bg-brand" : "bg-sage")} style={{ height: `${Math.max(4, g.rate)}%` }} />
                <span className="mt-2 mb-[-26px] text-[12px] text-ink-soft">{g.label}</span>
              </div>
            ))}
          </div>
        )}
        <div className="h-7" />
      </Card>
      <Card title="Students below threshold" pad={false}>
        {d.below.length === 0 ? (
          <Empty title="Nobody below the threshold" />
        ) : (
          <div className="px-4 sm:px-5">
            <Table>
              <thead>
                <tr>
                  <th className={th}>Student</th>
                  <th className={th}>Grade</th>
                  <th className={`${th} text-right`}>Present</th>
                  <th className={`${th} text-right`}>Absent</th>
                  <th className={th}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {d.below.map((s) => (
                  <tr key={s.studentId}>
                    <td className={td}>
                      <Link href={`/admin/students/${s.studentId}?tab=attendance`} className="hover:underline">
                        {s.name}
                      </Link>
                    </td>
                    <td className={`${td} text-ink-soft`}>{s.grade}</td>
                    <td className={`${td} text-right tabular-nums`}>{s.present}</td>
                    <td className={`${td} text-right tabular-nums`}>{s.absent}</td>
                    <td className={td}>
                      <Pill tone={s.rate < 70 ? "red" : "sun"}>{s.rate}%</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </>
  );
}

async function HomeworkReport({ q }: { q: string }) {
  const d = await api<Homework>(`/v1/homework/report/summary${q}`);
  const rate = d.totals.expected ? Math.round((d.totals.submitted / d.totals.expected) * 100) : null;
  return (
    <>
      <StatGrid>
        <StatCard tone="green" label="Submitted" value={rate === null ? "—" : `${rate}%`} sub={`${d.totals.submitted} of ${d.totals.expected} expected`} />
        <StatCard label="Homework given" value={d.totals.homework} />
        <StatCard label="Checked by teachers" value={d.totals.checked} />
        <StatCard tone="sun" label="Not completed" value={d.totals.notCompleted} sub="Reported to admin each evening" />
      </StatGrid>
      <Card pad={false}>
        {d.rows.length === 0 ? (
          <Empty title="No homework due in this range" />
        ) : (
          <div className="px-4 sm:px-5">
            <Table>
              <thead>
                <tr>
                  <th className={th}>Homework</th>
                  <th className={th}>Class</th>
                  <th className={th}>Teacher</th>
                  <th className={th}>Due</th>
                  <th className={`${th} text-right`}>Submitted</th>
                  <th className={`${th} text-right`}>Checked</th>
                  <th className={`${th} text-right`}>Not completed</th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((r) => (
                  <tr key={r.id}>
                    <td className={td}>{r.title}</td>
                    <td className={`${td} text-ink-soft`}>{r.classLabel}</td>
                    <td className={`${td} text-ink-soft`}>{r.teacher}</td>
                    <td className={td}>{r.dueOn}</td>
                    <td className={`${td} text-right tabular-nums`}>
                      {r.submitted} / {r.total}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{r.checked}</td>
                    <td className={`${td} text-right`}>{r.notCompleted ? <Pill tone="sun">{r.notCompleted}</Pill> : <Pill tone="green">0</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </>
  );
}

async function DuesReport({ grade }: { grade: string }) {
  const d = await api<Dues>(`/v1/reports/dues${qs({ grade })}`);
  return (
    <>
      <StatGrid cols={3}>
        <StatCard tone="sun" label="Total outstanding" value={formatINR(d.total)} sub="All months up to now" />
        <StatCard label="Students with dues" value={d.students} />
        <StatCard label="Exempt from reminders" value={d.rows.filter((r) => !r.reminders).length} />
      </StatGrid>
      <Card pad={false}>
        {d.rows.length === 0 ? (
          <Empty title="No pending dues" />
        ) : (
          <div className="px-4 sm:px-5">
            <Table>
              <thead>
                <tr>
                  <th className={th}>Student</th>
                  <th className={th}>Grade</th>
                  <th className={th}>Parent</th>
                  <th className={th}>Months</th>
                  <th className={`${th} text-right`}>Balance</th>
                  <th className={th}>Reminders</th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((r) => (
                  <tr key={r.studentId}>
                    <td className={td}>
                      <Link href={`/admin/fees/${r.studentId}`} className="hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className={`${td} text-ink-soft`}>{r.grade}</td>
                    <td className={`${td} text-ink-soft`}>
                      {r.parent}
                      <span className="block text-[12px] text-muted">{r.mobile}</span>
                    </td>
                    <td className={td}>{r.months}</td>
                    <td className={`${td} text-right font-semibold tabular-nums`}>{formatINR(r.balance)}</td>
                    <td className={td}>{r.reminders ? <Pill tone="green">On</Pill> : <Pill>Exempt</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </>
  );
}

async function CollectionReport({ q }: { q: string }) {
  const d = await api<Collection>(`/v1/reports/collection${q}`);
  const max = Math.max(...d.byDay.map((x) => x.amount), 1);
  return (
    <>
      <StatGrid>
        <StatCard tone="green" label="Collected" value={formatINR(d.total)} sub={`${d.count} payments`} />
        {d.byMethod.map((m) => (
          <StatCard key={m.method} label={m.label} value={formatINR(m.amount)} sub={`${m.count} payments`} />
        ))}
      </StatGrid>
      {d.byDay.length > 0 && (
        <Card title="By day" className="mb-3">
          <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Collection by day">
            {d.byDay.map((x) => (
              <div key={x.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${x.label}: ${formatINR(x.amount)}`}>
                <span className="w-full max-w-[40px] rounded-t-md bg-sun" style={{ height: `${Math.max(2, (x.amount / max) * 100)}%` }} />
                <span className="mt-1.5 truncate text-[10.5px] text-muted">{x.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Card pad={false}>
        {d.rows.length === 0 ? (
          <Empty title="No payments in this range" />
        ) : (
          <div className="px-4 sm:px-5">
            <Table>
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Student</th>
                  <th className={th}>Method</th>
                  <th className={th}>Reference</th>
                  <th className={`${th} text-right`}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((r) => (
                  <tr key={r.id}>
                    <td className={td}>{r.date}</td>
                    <td className={td}>
                      {r.student}
                      <span className="block text-[12px] text-muted">{r.grade}</span>
                    </td>
                    <td className={`${td} text-ink-soft`}>{r.method}</td>
                    <td className={`${td} text-ink-soft`}>{r.reference ?? "—"}</td>
                    <td className={`${td} text-right font-semibold tabular-nums`}>{formatINR(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </>
  );
}
