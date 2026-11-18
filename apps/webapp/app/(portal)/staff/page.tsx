import type { Metadata } from "next";
import Link from "next/link";
import { ICheck, IMegaphone } from "@/components/portal/icons";
import { btn, Card, cx, Empty } from "@/components/ui/kit";
import { api } from "@/lib/api";
import { requireStaff } from "@/lib/portal";

export const metadata: Metadata = { title: "Dashboard" };

type Dash = {
  greeting: string;
  dateLabel: string;
  next: { key: string; label: string; inMinutes: number; started: boolean; time: string; room: string | null; students: number } | null;
  classes: { key: string; label: string; time: string | null; students: number; attendanceDone: boolean; updateDone: boolean; past: boolean }[];
  scheduled: boolean;
  totals: { classes: number; students: number };
  todo: { label: string; done: boolean; href: string }[];
  fromAdmin: { title: string; message: string } | null;
};

const Chip = ({ done, label, href }: { done: boolean; label: string; href: string }) => (
  <Link
    href={href}
    className={cx(
      "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] transition-colors",
      done ? "bg-ok-tint text-brand-deep" : "bg-sun-tint text-[#5c4700] hover:bg-sun",
    )}
  >
    <ICheck className="size-3.5" />
    {label}
  </Link>
);

/** Staff home (design: "Staff Dashboard"). */
export default async function StaffDashboard() {
  await requireStaff("/staff");
  const d = await api<Dash>("/v1/dashboard/staff", "staff");
  const done = d.todo.filter((t) => t.done).length;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="flex flex-wrap items-baseline gap-x-3 text-[clamp(1.4rem,2.2vw,1.65rem)] font-normal">
          {d.greeting}
          <span className="text-[12.5px] text-muted">{d.dateLabel}</span>
        </h1>
        <Link href="/staff/notices/new" className={btn.white}>
          Send class notice
        </Link>
      </div>

      <section className="mb-3 flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-ink px-5 py-6 text-white sm:px-6">
        {d.next ? (
          <div className="min-w-0">
            <p className="text-[12.5px] text-white/75">{d.next.started ? "Class in progress" : `Next class · in ${d.next.inMinutes} minute${d.next.inMinutes === 1 ? "" : "s"}`}</p>
            <p className="mt-1 text-[clamp(1.5rem,3vw,1.9rem)] leading-tight font-semibold">{d.next.label}</p>
            <p className="mt-1 text-[13px] text-white/80">
              {d.next.time}
              {d.next.room ? ` · ${d.next.room}` : ""} · {d.next.students} students
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[12.5px] text-white/75">{d.classes.length ? "No more classes scheduled today" : "No classes assigned yet"}</p>
            <p className="mt-1 text-[clamp(1.3rem,2.6vw,1.7rem)] font-semibold">{d.classes.length ? "You're done for the day" : "Admin will assign your classes"}</p>
          </div>
        )}
        {d.classes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/staff/attendance${d.next ? `?class=${encodeURIComponent(d.next.key)}` : ""}`} className={btn.sun}>
              Mark attendance
            </Link>
            <Link href={`/staff/class-updates${d.next ? `?class=${encodeURIComponent(d.next.key)}` : ""}`} className="inline-flex h-11 shrink-0 items-center rounded-full border border-white/30 px-5 text-[14px] whitespace-nowrap text-white transition-colors hover:border-white/70">
              Post update
            </Link>
          </div>
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <Card title={d.scheduled ? "Today's classes" : "Your classes"} action={<span className="text-[12.5px] text-muted">{d.totals.classes} classes · {d.totals.students} students</span>} pad={false}>
          {d.classes.length === 0 ? (
            <Empty title="No classes yet">Your classes appear here once admin assigns grades and courses to you.</Empty>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {d.classes.map((c) => (
                <li key={c.key} className={cx("flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5", c.past && "opacity-70")}>
                  <span className="w-12 text-[15px] font-semibold tabular-nums">{c.time ?? "—"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px]">{c.label}</span>
                    <span className="block text-[12px] text-muted">{c.students} students</span>
                  </span>
                  <span className="flex gap-2">
                    <Chip done={c.attendanceDone} label="Attendance" href={`/staff/attendance?class=${encodeURIComponent(c.key)}`} />
                    <Chip done={c.updateDone} label="Update" href={`/staff/class-updates?class=${encodeURIComponent(c.key)}`} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="To do" action={<span className="text-[12.5px] text-muted">{done} of {d.todo.length}</span>}>
          <ul className="divide-y divide-line">
            {d.todo.map((t) => (
              <li key={t.label}>
                <Link href={t.href} className="flex items-center gap-3 py-3 text-[14px] hover:text-brand">
                  <span className={cx("grid size-5 shrink-0 place-items-center rounded-md border", t.done ? "border-brand bg-brand text-white" : "border-[#c9ccc2] bg-white")}>
                    {t.done && <ICheck className="size-3.5" />}
                  </span>
                  <span className={cx(t.done && "text-muted line-through decoration-ink/30")}>{t.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          {d.fromAdmin && (
            <div className="mt-3 flex gap-3 rounded-2xl bg-frame p-4">
              <IMegaphone className="mt-0.5 size-5 shrink-0 text-brand" />
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold">From admin</p>
                <p className="text-[13px] text-ink-soft">{d.fromAdmin.message}</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
