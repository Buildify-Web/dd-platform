import { sessionLabel } from "@dd/shared/domain";
import type { Metadata } from "next";
import { AttendanceSheet, type Sheet } from "@/components/teaching/AttendanceSheet";
import { ClassTabs } from "@/components/teaching/ClassTabs";
import { ParamSegmented } from "@/components/ui/client";
import { Card, Empty } from "@/components/ui/kit";
import { api, param, qs, type SearchParams } from "@/lib/api";
import { getMeta, pickClass, requireStaff } from "@/lib/portal";

export const metadata: Metadata = { title: "Mark attendance" };

const today = () => new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date());

/** Design (staff): "Mark attendance" with class tabs and P / A / L. */
export default async function StaffAttendancePage({ searchParams }: { searchParams: SearchParams }) {
  await requireStaff("/staff/attendance");
  const sp = await searchParams;
  const meta = await getMeta("staff");
  const cls = pickClass(meta.classes, param(sp.class));
  if (!cls)
    return (
      <Card>
        <Empty title="No classes assigned yet">Admin assigns your grades and courses. Then your classes appear here.</Empty>
      </Card>
    );
  const sheet = await api<Sheet>(`/v1/attendance/sheet${qs({ grade: cls.grade, courseId: cls.courseId, session: param(sp.session) })}`, "staff");
  return (
    <>
      <h1 className="mb-3 flex flex-wrap items-baseline gap-x-3 text-[clamp(1.4rem,2.2vw,1.65rem)] font-normal">
        Mark attendance <span className="text-[12.5px] text-muted">Main menu · {today()}</span>
      </h1>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ClassTabs classes={meta.classes} active={cls.key} href={(k) => `/staff/attendance?class=${encodeURIComponent(k)}`} />
        {sheet.sessions.length > 1 && <ParamSegmented name="session" label="Session" value={sheet.session} options={sheet.sessions.map((s) => ({ value: s, label: sessionLabel(s) }))} />}
      </div>
      <AttendanceSheet key={`${cls.key}${sheet.session}`} sheet={sheet} variant="staff" />
    </>
  );
}
