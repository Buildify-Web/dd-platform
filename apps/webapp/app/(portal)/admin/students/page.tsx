import { feeStatusShort, GRADES, gradeLabel, type FeeStatus } from "@dd/shared/domain";
import type { Metadata } from "next";
import Link from "next/link";
import { IArrowUpRight, IPlus, IUser, IUsers, IWifi } from "@/components/portal/icons";
import { FilterSelect, ParamSegmented, SearchBox } from "@/components/ui/client";
import { Bar, btn, Card, Empty, PageHeader, Pager, Person, Pill, StatCard, StatGrid, Table, td, th } from "@/components/ui/kit";
import { api, param, qs, type SearchParams } from "@/lib/api";
import { getMeta, requireAdmin } from "@/lib/portal";
import { PendingRegistrations, type PendingRow } from "./PendingRegistrations";

export const metadata: Metadata = { title: "Students" };

type Row = {
  id: string;
  name: string;
  parentName: string | null;
  gradeLabel: string;
  courses: string[];
  modeLabel: string | null;
  attendance: number | null;
  fee: { status: FeeStatus; balance: number } | null;
  status: "ACTIVE" | "INACTIVE";
};
type Data = { stats: { active: number; inactive: number; oneOnOne: number; newThisMonth: number }; total: number; page: number; pageSize: number; rows: Row[] };

const feeTone = { PAID: "green", PARTIAL: "sun", UNPAID: "red" } as const;

/** Design: "Students" (People / Students). */
export default async function StudentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/students");
  const sp = await searchParams;
  const f = { q: param(sp.q), grade: param(sp.grade), courseId: param(sp.courseId), mode: param(sp.mode), status: param(sp.status), page: Number(param(sp.page)) || 1 };
  const [d, meta, pending] = await Promise.all([
    api<Data>(`/v1/students${qs(f)}`),
    getMeta("admin"),
    api<{ rows: PendingRow[] }>("/v1/students/registrations"),
  ]);
  const exportQs = qs({ src: "students/export", q: f.q, grade: f.grade, courseId: f.courseId, mode: f.mode, status: f.status });
  const courses = f.grade ? meta.courses.filter((c) => c.grades.includes(f.grade as never)) : meta.courses;

  return (
    <>
      <PageHeader
        title="Students"
        crumb="People / Students"
        actions={
          <>
            <Link href="/admin/courses" className={btn.white}>
              By course
            </Link>
            <a href={`/api/export${exportQs}&format=csv`} className={btn.white}>
              Export CSV
            </a>
            <a href={`/api/export${exportQs}&format=xlsx`} className={btn.dark}>
              Export Excel
            </a>
          </>
        }
      />
      <StatGrid>
        <StatCard label="Active" value={d.stats.active} icon={<IUser className="size-[18px]" />} iconClass="bg-brand text-white" href="/admin/students?status=ACTIVE" />
        <StatCard label="Inactive" value={d.stats.inactive} icon={<IUser className="size-[18px]" />} iconClass="bg-sage text-brand" href="/admin/students?status=INACTIVE" />
        <StatCard label="One-on-one (online)" value={d.stats.oneOnOne} icon={<IWifi className="size-[18px]" />} iconClass="bg-sun text-ink" href="/admin/students?mode=ONE_ON_ONE" />
        <StatCard label="New this month" value={`+${d.stats.newThisMonth}`} icon={<IPlus className="size-[18px]" />} iconClass="bg-ink text-sun" />
      </StatGrid>

      <PendingRegistrations rows={pending.rows} />

      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-2 p-4 sm:px-5">
          <SearchBox value={f.q} placeholder="Name, parent or mobile" className="w-full sm:w-[300px]" />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <FilterSelect name="grade" label="Grade" clear={["courseId"]} value={f.grade} className="w-[140px]" options={[{ value: "", label: "All grades" }, ...GRADES.map((g) => ({ value: g, label: gradeLabel(g) }))]} />
            <FilterSelect name="courseId" label="Course" value={f.courseId} className="w-[150px]" options={[{ value: "", label: "All courses" }, ...courses.map((c) => ({ value: c.id, label: c.name }))]} />
            <FilterSelect
              name="mode"
              label="Session and mode"
              value={f.mode}
              className="w-[160px]"
              options={[
                { value: "", label: "Online + offline" },
                { value: "ONLINE", label: "Online" },
                { value: "OFFLINE", label: "Offline" },
                { value: "ONE_ON_ONE", label: "One-on-one" },
                { value: "GROUP", label: "Group" },
              ]}
            />
            <ParamSegmented name="status" label="Status" value={f.status} options={[{ value: "", label: "All" }, { value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} />
          </div>
        </div>
        {d.rows.length === 0 ? (
          <Empty title="No students match" icon={<IUsers className="size-5" />}>
            Try another search or filter. New students appear here once their registration is approved.
          </Empty>
        ) : (
          <div className="px-4 sm:px-5">
            <Table>
              <thead>
                <tr>
                  <th className={th}>Student</th>
                  <th className={th}>Grade</th>
                  <th className={th}>Courses</th>
                  <th className={th}>Session · mode</th>
                  <th className={th}>Attendance</th>
                  <th className={th}>Fees</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Open</th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((s) => (
                  <tr key={s.id} className="hover:bg-frame/60">
                    <td className={td}>
                      <Person name={s.name} sub={s.parentName ? `Parent: ${s.parentName}` : undefined} href={`/admin/students/${s.id}`} />
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{s.gradeLabel}</td>
                    <td className={`${td} max-w-[180px] text-ink-soft`}>{s.courses.length ? s.courses.join(", ") : "—"}</td>
                    <td className={`${td} whitespace-nowrap text-ink-soft`}>{s.modeLabel ?? "—"}</td>
                    <td className={td}>
                      <span className="flex items-center gap-2.5">
                        <Bar value={s.attendance ?? 0} className="w-14" tone={s.attendance !== null && s.attendance < 75 ? "sun" : "green"} />
                        <span className="w-9 text-[13px] tabular-nums">{s.attendance === null ? "—" : `${s.attendance}%`}</span>
                      </span>
                    </td>
                    <td className={td}>{s.fee ? <Pill tone={feeTone[s.fee.status]}>{feeStatusShort[s.fee.status]}</Pill> : <Pill>—</Pill>}</td>
                    <td className={td}>
                      <Pill tone={s.status === "ACTIVE" ? "green" : "grey"}>{s.status === "ACTIVE" ? "Active" : "Inactive"}</Pill>
                    </td>
                    <td className={`${td} text-right`}>
                      <Link href={`/admin/students/${s.id}`} className={btn.icon} aria-label={`Open ${s.name}`}>
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
          <Pager page={d.page} pageSize={d.pageSize} total={d.total} href={(p) => `/admin/students${qs({ ...f, page: p === 1 ? "" : p })}`} />
        </div>
      </Card>
    </>
  );
}
