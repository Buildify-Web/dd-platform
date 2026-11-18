import Link from "next/link";
import type { AttendanceStatus } from "@dd/shared/domain";
import { Avatar, Bar, Card, cx, Empty, PageHeader, Pill } from "@/components/ui/kit";
import { SearchBox } from "@/components/ui/client";
import { api, param, type SearchParams } from "@/lib/api";
import { requireStaff } from "@/lib/portal";
import { ClassTabs } from "./ClassTabs";

type Data = {
  classes: {
    key: string;
    label: string;
    students: { id: string; name: string; rollNo: number | null; parentName: string | null; attendance: number | null; today: AttendanceStatus | null }[];
  }[];
};

/** Design: "My students" (Main menu). Only students in the teacher's classes. */
export async function MyStudents({ searchParams }: { searchParams: SearchParams }) {
  await requireStaff("/staff/students");
  const sp = await searchParams;
  const d = await api<Data>("/v1/students/mine", "staff");
  const cls = d.classes.find((c) => c.key === param(sp.class)) ?? d.classes[0];
  const q = param(sp.q).toLowerCase();
  const list = (cls?.students ?? []).filter((s) => !q || s.name.toLowerCase().includes(q));
  const tabs = d.classes.map((c) => ({ key: c.key, label: c.label, studentCount: c.students.length }));
  return (
    <>
      <PageHeader title="My students" crumb="Main menu" />
      {!cls ? (
        <Card>
          <Empty title="No classes assigned yet">Admin assigns your grades and courses. Then your students appear here.</Empty>
        </Card>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <ClassTabs classes={tabs as never} active={cls.key} href={(k) => `/staff/students?class=${encodeURIComponent(k)}`} />
            <SearchBox value={param(sp.q)} placeholder="Search" className="w-full sm:w-64" />
          </div>
          {list.length === 0 ? (
            <Card>
              <Empty title="No students match" />
            </Card>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {list.map((s) => {
                const flag = s.today === "ABSENT" ? <Pill tone="red">Absent today</Pill> : s.today === "LEAVE" ? <Pill tone="blue">On leave</Pill> : s.attendance !== null && s.attendance < 75 ? <Pill tone="sun">Low attendance</Pill> : null;
                return (
                  <li key={s.id}>
                    <Link href={`/staff/students/${s.id}`} className="lift block h-full rounded-[18px] border border-line bg-white p-4">
                      <div className="flex items-start justify-between gap-2">
                        <Avatar name={s.name} size={44} />
                        {flag}
                      </div>
                      <p className="mt-3 truncate text-[15px] font-semibold">{s.name}</p>
                      <p className="text-[12.5px] text-muted">{s.rollNo ? `Roll ${String(s.rollNo).padStart(2, "0")}` : "—"}{s.parentName ? ` · ${s.parentName}` : ""}</p>
                      <div className="mt-4 flex items-center justify-between text-[12.5px] text-ink-soft">
                        <span>Attendance</span>
                        <span className={cx("tabular-nums", s.attendance !== null && s.attendance < 75 && "text-[#8a6d00]")}>{s.attendance === null ? "—" : `${s.attendance}%`}</span>
                      </div>
                      <Bar value={s.attendance ?? 0} className="mt-1.5" tone={s.attendance !== null && s.attendance < 75 ? "sun" : "green"} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </>
  );
}
