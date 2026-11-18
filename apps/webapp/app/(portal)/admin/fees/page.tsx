import { formatINR, GRADES, gradeLabel, monthKey, type FeeStatus } from "@dd/shared/domain";
import type { Metadata } from "next";
import Link from "next/link";
import { IArrowUpRight, IBell, ICard } from "@/components/portal/icons";
import { FilterSelect, ParamSegmented, SearchBox } from "@/components/ui/client";
import { MonthFilter } from "@/components/ui/MonthFilter";
import { btn, Card, Empty, PageHeader, Pager, Person, Pill, StatCard, StatGrid, Table, td, th } from "@/components/ui/kit";
import { api, param, qs, type SearchParams } from "@/lib/api";
import { requireAdmin } from "@/lib/portal";

export const metadata: Metadata = { title: "Fees" };

type Data = {
  month: string;
  monthLabel: string;
  stats: { due: number; collected: number; outstanding: number; paid: number; partial: number; unpaid: number };
  total: number;
  page: number;
  pageSize: number;
  rows: { recordId: string; studentId: string; name: string; code: string; grade: string; parentName: string | null; totalDue: number; paid: number; balance: number; status: FeeStatus; manual: boolean; reminders: boolean }[];
};
const tone = { PAID: "green", PARTIAL: "sun", UNPAID: "red" } as const;
const label = { PAID: "Paid", PARTIAL: "Partial", UNPAID: "Unpaid" };

/** Monthly fee status for every student, with export and links to each fee record. */
export default async function FeesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/fees");
  const sp = await searchParams;
  const f = { month: param(sp.month) || monthKey(), status: param(sp.status), grade: param(sp.grade), q: param(sp.q), page: Number(param(sp.page)) || 1 };
  const d = await api<Data>(`/v1/fees${qs(f)}`);
  const exp = qs({ src: "fees/export", month: f.month, status: f.status, grade: f.grade, q: f.q });
  return (
    <>
      <PageHeader
        title="Fees"
        crumb={`Finance / Fees · ${d.monthLabel}`}
        actions={
          <>
            <MonthFilter value={f.month} max={monthKey()} />
            <a href={`/api/export${exp}&format=csv`} className={btn.white}>
              Export CSV
            </a>
            <a href={`/api/export${exp}&format=xlsx`} className={btn.dark}>
              Export Excel
            </a>
          </>
        }
      />
      <StatGrid>
        <StatCard label="Due this month" value={formatINR(d.stats.due)} sub={`${d.stats.paid + d.stats.partial + d.stats.unpaid} students`} />
        <StatCard tone="green" label="Collected" value={formatINR(d.stats.collected)} sub={`${d.stats.paid} paid completely`} />
        <StatCard tone="sun" label="Outstanding" value={formatINR(d.stats.outstanding)} sub={`${d.stats.partial} partial · ${d.stats.unpaid} unpaid`} href="/admin/reports?tab=dues" />
        <StatCard label="Payments to review" value="Verify" sub="Parent-submitted GPay / bank" href="/admin/payments" />
      </StatGrid>
      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-2 p-4 sm:px-5">
          <SearchBox value={f.q} placeholder="Student, parent or mobile" className="w-full sm:w-[280px]" />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <FilterSelect name="grade" label="Grade" className="w-[140px]" value={f.grade} options={[{ value: "", label: "All grades" }, ...GRADES.map((g) => ({ value: g, label: gradeLabel(g) }))]} />
            <ParamSegmented name="status" label="Status" value={f.status} options={[{ value: "", label: "All" }, { value: "UNPAID", label: "Unpaid" }, { value: "PARTIAL", label: "Partial" }, { value: "PAID", label: "Paid" }]} />
          </div>
        </div>
        {d.rows.length === 0 ? (
          <Empty title="No fee records" icon={<ICard className="size-5" />}>
            Records are created each month for active students with courses.
          </Empty>
        ) : (
          <div className="px-4 sm:px-5">
            <Table>
              <thead>
                <tr>
                  <th className={th}>Student</th>
                  <th className={th}>Grade</th>
                  <th className={`${th} text-right`}>Due</th>
                  <th className={`${th} text-right`}>Paid</th>
                  <th className={`${th} text-right`}>Balance</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Open</th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((r) => (
                  <tr key={r.recordId}>
                    <td className={td}>
                      <Person name={r.name} sub={r.parentName ? `Parent: ${r.parentName}` : r.code} href={`/admin/fees/${r.studentId}?month=${d.month}`} />
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{r.grade}</td>
                    <td className={`${td} text-right tabular-nums`}>{formatINR(r.totalDue)}</td>
                    <td className={`${td} text-right tabular-nums`}>{formatINR(r.paid)}</td>
                    <td className={`${td} text-right font-semibold tabular-nums`}>{formatINR(r.balance)}</td>
                    <td className={td}>
                      <span className="flex items-center gap-1.5">
                        <Pill tone={tone[r.status]}>{label[r.status]}</Pill>
                        {r.manual && <span className="text-[11px] text-muted">manual</span>}
                        {!r.reminders && (
                          <span title="Exempt from reminders" className="text-muted">
                            <IBell className="size-3.5 opacity-60" />
                          </span>
                        )}
                      </span>
                    </td>
                    <td className={`${td} text-right`}>
                      <Link href={`/admin/fees/${r.studentId}?month=${d.month}`} className={btn.icon} aria-label={`Open ${r.name}'s fee record`}>
                        <IArrowUpRight className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <p className="text-[12.5px] text-muted">
            Showing {d.rows.length} of {d.total}
          </p>
          <Pager page={d.page} pageSize={d.pageSize} total={d.total} href={(p) => `/admin/fees${qs({ ...f, page: p === 1 ? "" : p })}`} />
        </div>
      </Card>
    </>
  );
}
