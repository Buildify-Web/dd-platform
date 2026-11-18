import { GRADES, gradeLabel, istDate, sessionLabel } from "@dd/shared/domain";
import type { Metadata } from "next";
import { AttendanceSheet, type Sheet } from "@/components/teaching/AttendanceSheet";
import { FilterSelect, ParamSegmented } from "@/components/ui/client";
import { labelCls, PageHeader } from "@/components/ui/kit";
import { api, param, qs, type SearchParams } from "@/lib/api";
import { getMeta, requireAdmin } from "@/lib/portal";
import { DateFilter } from "@/components/ui/DateFilter";

export const metadata: Metadata = { title: "Mark attendance" };

/** Design: "Mark attendance" (Academics / Attendance / Mark). Admin can mark any grade. */
export default async function AdminAttendancePage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/attendance");
  const sp = await searchParams;
  const meta = await getMeta("admin");
  const grade = param(sp.grade) || "GRADE_9";
  const courses = meta.courses.filter((c) => c.grades.includes(grade as never));
  const courseId = courses.some((c) => c.id === param(sp.courseId)) ? param(sp.courseId) : "";
  const date = param(sp.date) || istDate();
  const sheet = await api<Sheet>(`/v1/attendance/sheet${qs({ date, grade, courseId, session: param(sp.session) })}`);

  const filters = (
    <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={labelCls} htmlFor="att-date">
            Date
          </label>
          <DateFilter id="att-date" value={sheet.date} max={istDate()} />
        </div>
        <div className="w-[170px]">
          <p className={labelCls}>
            Grade <span className="text-danger">*</span>
          </p>
          <FilterSelect name="grade" label="Grade" clear={["courseId", "session"]} value={grade} options={GRADES.map((g) => ({ value: g, label: gradeLabel(g) }))} />
        </div>
        <div className="w-[190px]">
          <p className={labelCls}>
            Course <span className="text-danger">*</span>
          </p>
          <FilterSelect name="courseId" label="Course" value={courseId} options={[{ value: "", label: "All courses" }, ...courses.map((c) => ({ value: c.id, label: c.name }))]} />
        </div>
        <div>
          <p className={labelCls}>Session</p>
          {sheet.sessions.length > 1 ? (
            <ParamSegmented name="session" label="Session" value={sheet.session} options={sheet.sessions.map((s) => ({ value: s, label: sessionLabel(s) }))} />
          ) : (
            <p className="flex h-10 items-center text-[13.5px] text-muted">One entry per day</p>
          )}
        </div>
    </div>
  );

  return (
    <>
      <PageHeader title="Mark attendance" crumb="Academics / Attendance / Mark" note="RFID taps pre-fill Present. Edit anything before saving." />
      <AttendanceSheet key={`${sheet.date}${sheet.grade}${sheet.courseId}${sheet.session}`} sheet={sheet} variant="admin" filters={filters} />
    </>
  );
}
