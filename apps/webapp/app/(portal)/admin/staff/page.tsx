import type { Metadata } from "next";
import Link from "next/link";
import { IUser } from "@/components/portal/icons";
import { ParamSegmented, SearchBox } from "@/components/ui/client";
import { btn, Card, Empty, PageHeader, Person, Pill, StatCard, StatGrid, Table, td, th } from "@/components/ui/kit";
import { api, param, qs, type SearchParams } from "@/lib/api";
import { requireAdmin } from "@/lib/portal";
import { AddStaffButton } from "./AddStaff";

export const metadata: Metadata = { title: "Staff" };

type Row = { id: string; name: string; mobile: string | null; subject: string | null; gradesLabel: string; courses: string[]; students: number; today: boolean | null; status: string };
type Data = { stats: { active: number; unassigned: number; notMarked: number; updatesToday: number }; pendingRegistrations: number; rows: Row[] };

const statusPill = (s: string) =>
  s === "ACTIVE" ? <Pill tone="green">Active</Pill> : s === "INVITED" || s === "PENDING_APPROVAL" ? <Pill tone="blue">Invited</Pill> : s === "DISABLED" ? <Pill tone="red">Disabled</Pill> : <Pill>{s}</Pill>;

/** Design: "Staff" (People / Staff). */
export default async function StaffPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/staff");
  const sp = await searchParams;
  const f = { q: param(sp.q), filter: param(sp.filter) || "all" };
  const d = await api<Data>(`/v1/staff${qs({ q: f.q, filter: f.filter === "all" ? "" : f.filter })}`);
  return (
    <>
      <PageHeader
        title="Staff"
        crumb="People / Staff"
        actions={
          <>
            {d.pendingRegistrations > 0 && (
              <Link href="/admin/approvals?tab=staff" className={btn.white}>
                {d.pendingRegistrations} pending registration{d.pendingRegistrations > 1 ? "s" : ""}
              </Link>
            )}
            <AddStaffButton />
            <a href={`/api/export${qs({ src: "staff/export", q: f.q, filter: f.filter === "all" ? "" : f.filter, format: "xlsx" })}`} className={btn.dark}>
              Export
            </a>
          </>
        }
      />
      <StatGrid>
        <StatCard label="Active teachers" value={d.stats.active} />
        <StatCard tone="sun" label="Without assignment" value={d.stats.unassigned} href="/admin/staff?filter=unassigned" />
        <StatCard label="Attendance not marked today" value={d.stats.notMarked} />
        <StatCard label="Updates posted today" value={d.stats.updatesToday} href="/admin/class-updates" />
      </StatGrid>
      <Card pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 sm:px-5">
          <SearchBox value={f.q} placeholder="Name, subject or mobile" className="w-full sm:w-[300px]" />
          <ParamSegmented name="filter" label="Show" value={f.filter === "all" ? "" : f.filter} options={[{ value: "", label: "All" }, { value: "active", label: "Active" }, { value: "unassigned", label: "Unassigned" }]} />
        </div>
        {d.rows.length === 0 ? (
          <Empty title="No staff match" icon={<IUser className="size-5" />}>
            Approve staff registrations or add a teacher.
          </Empty>
        ) : (
          <div className="px-4 pb-2 sm:px-5">
            <Table>
              <thead>
                <tr>
                  <th className={th}>Teacher</th>
                  <th className={th}>Assigned grades</th>
                  <th className={th}>Courses</th>
                  <th className={`${th} text-right`}>Students</th>
                  <th className={th}>Today</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Open</th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((s) => (
                  <tr key={s.id}>
                    <td className={td}>
                      <Person name={s.name} sub={[s.mobile, s.subject].filter(Boolean).join(" · ")} href={`/admin/staff/${s.id}`} />
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{s.gradesLabel}</td>
                    <td className={`${td} text-ink-soft`}>{s.courses.join(", ") || "—"}</td>
                    <td className={`${td} text-right tabular-nums`}>{s.students}</td>
                    <td className={td}>{s.today === null ? <span className="text-muted">—</span> : s.today ? <Pill tone="green">Attendance done</Pill> : <Pill tone="sun">Not marked</Pill>}</td>
                    <td className={td}>{statusPill(s.status)}</td>
                    <td className={`${td} text-right`}>
                      <Link href={`/admin/staff/${s.id}`} className={btn.whiteSm}>
                        Manage
                      </Link>
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
