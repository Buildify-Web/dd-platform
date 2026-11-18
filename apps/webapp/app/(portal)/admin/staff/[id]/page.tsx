import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Card } from "@/components/ui/kit";
import { api } from "@/lib/api";
import { getMeta, requireAdmin, type ClassInfo } from "@/lib/portal";
import { AccountActions, AssignmentEditor, TimetableEditor } from "./StaffEditors";

export const metadata: Metadata = { title: "Staff member" };

type Detail = {
  staff: { id: string; name: string; email: string; mobileMasked: string | null; subject: string | null; designation: string; staffCode: string | null; status: string; rfid: string | null };
  assignment: { selection: { grade: string; courseId: string; subjects: string[] }[] };
  classes: ClassInfo[];
  studentsVisible: number;
  week: { attendanceDays: number; workdays: number; updates: number; reviewed: number; papersUploaded: number; papersAwaiting: number };
};

const rfidShort = (u: string) => {
  const h = u.replace(/:/g, "");
  return h.length > 8 ? `${h.slice(0, 4)}…${h.slice(-4)}` : h;
};

/** Design: "Staff detail & assignment" (Staff / Lakshmi N.). */
export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/admin/staff/${id}`);
  const [d, meta] = await Promise.all([api<Detail>(`/v1/staff/${id}`), getMeta("admin")]);
  const s = d.staff;
  const grades = new Set(d.classes.map((c) => c.grade)).size;
  const courses = new Set(d.classes.map((c) => c.courseId)).size;
  const short = `${s.name.split(" ")[0]} ${s.name.split(" ")[1]?.[0] ?? ""}.`.replace(" .", "");
  return (
    <>
      <p className="mb-2 text-[12.5px] text-muted">
        <Link href="/admin/staff" className="hover:text-ink">
          Staff
        </Link>{" "}
        / {short}
      </p>
      <Card className="mb-3">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={s.name} size={76} tone="bg-sun" square />
          <div className="min-w-0 flex-1">
            <h1 className="text-[clamp(1.35rem,2.4vw,1.6rem)] font-normal">{s.name}</h1>
            <p className="mt-0.5 text-[12.5px] text-muted [overflow-wrap:break-word]">
              {[s.designation, s.subject, s.mobileMasked, s.email, s.rfid ? `RFID ${rfidShort(s.rfid)}` : "No RFID card", s.staffCode].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex h-9 items-center rounded-full px-4 text-[13px] ${s.status === "ACTIVE" ? "bg-ok-tint text-brand-deep" : s.status === "DISABLED" ? "bg-danger-tint text-danger-ink" : "bg-info-tint text-info-ink"}`}>
              {s.status === "ACTIVE" ? "Active" : s.status === "DISABLED" ? "Disabled" : "Invited · not activated"}
            </span>
            <AccountActions id={s.id} status={s.status} name={s.name} />
          </div>
        </div>
      </Card>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-3">
          <AssignmentEditor staffId={s.id} initial={d.assignment} courses={meta.courses} />
          <TimetableEditor staffId={s.id} classes={d.classes} />
        </div>
        <div className="grid content-start gap-3">
          <section className="rounded-[18px] bg-ink p-5 text-white">
            <p className="text-[13px] text-white/75">Students visible</p>
            <p className="mt-1 text-[40px] leading-none font-semibold tabular-nums">{d.studentsVisible}</p>
            <p className="mt-2 text-[12.5px] text-white/75">
              {grades} grade{grades === 1 ? "" : "s"} · {courses} course{courses === 1 ? "" : "s"}
            </p>
          </section>
          <Card title="This week">
            <dl className="divide-y divide-line text-[13.5px]">
              {[
                ["Attendance marked", `${d.week.attendanceDays} / ${d.week.workdays} days`],
                ["Class updates posted", d.week.updates],
                ["Homework reviewed", d.week.reviewed],
                ["Papers uploaded", d.week.papersAwaiting ? `${d.week.papersUploaded} · ${d.week.papersAwaiting} awaiting activation` : d.week.papersUploaded],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <dt className="text-ink-soft">{k}</dt>
                  <dd className="tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
