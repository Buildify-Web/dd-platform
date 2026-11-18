import { formatINR, sessionLabel, type AttendanceSession } from "@dd/shared/domain";
import type { Metadata } from "next";
import Link from "next/link";
import { IArrowRight, ICalendarCheck, IClock, IDollar, ITrophy, IUsers } from "@/components/portal/icons";
import { Bar, btn, Card, Empty, Notice, PageHeader, Pill, StatCard, StatGrid } from "@/components/ui/kit";
import { api } from "@/lib/api";
import { requireAdmin } from "@/lib/portal";

export const metadata: Metadata = { title: "Dashboard" };

type Dash = {
  greeting: string;
  dateLabel: string;
  kpis: {
    active: number;
    attendance: { present: number; marked: number; rate: number | null; absent: number; leave: number };
    approvals: number;
    payments: number;
    outstanding: number;
    collected: number;
    due: number;
    monthLabel: string;
  };
  sessions: { session: AttendanceSession; present: number; absent: number; leave: number }[];
  attention: { key: string; label: string; count: number; href: string }[];
  notMarked: { deadline: string; pastDeadline: boolean; classes: string[]; total: number };
  recent: { id: string; actor: string; summary: string; area: string; time: string }[];
  competitions: { id: string; name: string; date: string; registrations: number }[];
};

/** Admin home: today at a glance and everything that needs a decision. */
export default async function AdminDashboard() {
  await requireAdmin("/admin");
  const d = await api<Dash>("/v1/dashboard/admin");
  const k = d.kpis;
  const collectedPct = k.due ? Math.round((k.collected / k.due) * 100) : 0;
  return (
    <>
      <PageHeader
        title={d.greeting}
        crumb={d.dateLabel}
        actions={
          <>
            <Link href="/admin/attendance" className={btn.white}>
              Mark attendance
            </Link>
            <Link href="/admin/payments" className={btn.dark}>
              Payments to review
            </Link>
          </>
        }
      />
      <StatGrid>
        <StatCard label="Active students" value={k.active} sub="Enrolled and receiving notifications" icon={<IUsers className="size-[18px]" />} href="/admin/students" />
        <StatCard tone="green" label="Attendance today" value={k.attendance.rate === null ? "—" : `${k.attendance.rate}%`} sub={k.attendance.marked ? `${k.attendance.present} present · ${k.attendance.absent} absent · ${k.attendance.leave} leave` : "Nothing marked yet today"} href="/admin/attendance" />
        <StatCard tone="sun" label="Awaiting approval" value={k.approvals} sub="Registrations, course changes, leave" href="/admin/approvals" />
        <StatCard label={`Outstanding · ${k.monthLabel.split(" ")[0]}`} value={formatINR(k.outstanding)} sub={`${formatINR(k.collected)} collected of ${formatINR(k.due)}`} icon={<IDollar className="size-[18px]" />} href="/admin/fees" />
      </StatGrid>

      {d.notMarked.pastDeadline && d.notMarked.total > 0 && (
        <Notice className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <IClock className="size-4" />
          <span>
            Attendance not marked by {d.notMarked.deadline}: {d.notMarked.classes.join(", ")}
            {d.notMarked.total > d.notMarked.classes.length ? ` and ${d.notMarked.total - d.notMarked.classes.length} more` : ""}. Teachers and admin were reminded.
          </span>
        </Notice>
      )}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-3">
          <Card title="Needs your attention">
            {d.attention.length === 0 ? (
              <Empty title="All caught up" icon={<ICalendarCheck className="size-5" />}>
                No approvals, payments or alerts waiting.
              </Empty>
            ) : (
              <ul className="divide-y divide-line">
                {d.attention.map((a) => (
                  <li key={a.key}>
                    <Link href={a.href} className="group flex items-center gap-3 py-3">
                      <span className="grid h-8 min-w-8 place-items-center rounded-full bg-sun px-2 text-[13px] font-semibold tabular-nums">{a.count}</span>
                      <span className="flex-1 text-[14px]">{a.label}</span>
                      <IArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Recent activity" action={<Link href="/admin/audit" className="text-[12.5px] text-muted hover:text-ink">Audit log →</Link>}>
            {d.recent.length === 0 ? (
              <p className="text-[13.5px] text-muted">Nothing yet.</p>
            ) : (
              <ul className="space-y-3">
                {d.recent.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 text-[13.5px]">
                    <Pill tone="sage">{r.area}</Pill>
                    <p className="min-w-0 flex-1 text-ink-soft">
                      <span className="text-ink">{r.actor}</span> {r.summary}
                    </p>
                    <span className="shrink-0 text-[12px] text-muted">{r.time}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid content-start gap-3">
          <Card title="Today by session">
            <ul className="space-y-4">
              {d.sessions
                .filter((s) => s.present + s.absent + s.leave > 0 || s.session !== "DAY")
                .map((s) => {
                  const total = s.present + s.absent + s.leave;
                  return (
                    <li key={s.session}>
                      <div className="mb-1.5 flex items-center justify-between text-[13.5px]">
                        <span>{s.session === "DAY" ? "Day (Grade 8 and below)" : sessionLabel(s.session)}</span>
                        <span className="text-muted tabular-nums">
                          {s.present} / {total || "—"}
                        </span>
                      </div>
                      <Bar value={total ? (s.present / total) * 100 : 0} />
                    </li>
                  );
                })}
            </ul>
          </Card>
          <Card title={`Fee collection · ${k.monthLabel}`}>
            <p className="text-[28px] leading-none font-semibold tabular-nums">{collectedPct}%</p>
            <p className="mt-1 text-[12.5px] text-muted">
              {formatINR(k.collected)} of {formatINR(k.due)} · {k.payments} payment{k.payments === 1 ? "" : "s"} to verify
            </p>
            <Bar value={collectedPct} tone="sun" className="mt-3 h-2" />
            <div className="mt-4 flex gap-2">
              <Link href="/admin/reports?tab=dues" className={btn.whiteSm}>
                Pending dues
              </Link>
              <Link href="/admin/fees" className={btn.darkSm}>
                Fees
              </Link>
            </div>
          </Card>
          <Card title="Upcoming competitions" action={<Link href="/admin/competitions" className="text-[12.5px] text-muted hover:text-ink">All →</Link>}>
            {d.competitions.length === 0 ? (
              <p className="text-[13.5px] text-muted">None scheduled.</p>
            ) : (
              <ul className="space-y-3">
                {d.competitions.map((c) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-sun-soft text-ink">
                      <ITrophy className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px]">{c.name}</span>
                      <span className="block text-[12px] text-muted">
                        {c.date} · {c.registrations} registered
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
