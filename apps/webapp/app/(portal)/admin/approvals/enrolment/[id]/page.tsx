import { formatINR } from "@dd/shared/domain";
import type { Metadata } from "next";
import Link from "next/link";
import { ICheck, IWarn } from "@/components/portal/icons";
import { btn, Card, cx, Pill } from "@/components/ui/kit";
import { api } from "@/lib/api";
import { requireAdmin } from "@/lib/portal";
import { EnrolmentDecision } from "./EnrolmentDecision";

export const metadata: Metadata = { title: "Review enrolment change" };

type Course = { courseId: string; name: string; fee: number; flag: "Required" | "Kept" | "Remove" | "New" };
type Change = {
  id: string;
  code: string;
  status: string;
  note: string | null;
  student: { id: string; name: string; gradeLabel: string };
  current: Course[];
  after: Course[];
  window: { ok: boolean; text: string } | null;
  fee: { currentMonthly: number; newMonthly: number; change: number; takesEffect: string };
};

const flag = (f: Course["flag"]) =>
  f === "Required" ? <Pill tone="ink">Required</Pill> : f === "Remove" ? <Pill tone="red">Remove</Pill> : f === "New" ? <span className="text-[12px] text-brand-deep">New</span> : <Pill tone="grey">Kept</Pill>;

function CourseBox({ c, after }: { c: Course; after?: boolean }) {
  return (
    <div className={cx("flex items-center justify-between gap-3 rounded-2xl px-3.5 py-3", after && c.flag === "New" ? "bg-ok-tint" : "bg-frame")}>
      <div className="min-w-0">
        <p className="truncate text-[14px]">{c.name}</p>
        <p className="text-[12px] text-muted">{formatINR(c.fee)}/month</p>
      </div>
      {flag(c.flag)}
    </div>
  );
}

/** Design: "Review enrolment change" (Approvals / Enrolment changes / ENR-0091). */
export default async function EnrolmentChangePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/admin/approvals/enrolment/${id}`);
  const c = await api<Change>(`/v1/approvals/enrolment/${id}`);
  const sign = c.fee.change > 0 ? "+" : c.fee.change < 0 ? "−" : "±";
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="flex flex-wrap items-baseline gap-x-3 text-[clamp(1.4rem,2.2vw,1.65rem)] font-normal">
          {c.student.name} · {c.student.gradeLabel}
          <span className="text-[12.5px] text-muted">Approvals / Enrolment changes / {c.code}</span>
        </h1>
        <Link href={`/admin/students/${c.student.id}`} className={btn.white}>
          Open student profile
        </Link>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <Card title="Requested change">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid content-start gap-2.5">
              <p className="text-[12.5px] text-ink-soft">Current courses</p>
              {c.current.map((x) => (
                <CourseBox key={x.courseId} c={x} />
              ))}
            </div>
            <div className="grid content-start gap-2.5">
              <p className="text-[12.5px] text-ink-soft">After approval</p>
              {c.after.map((x) => (
                <CourseBox key={x.courseId} c={x} after />
              ))}
            </div>
          </div>
          {c.window && (
            <div className={cx("mt-3 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-[13.5px]", c.window.ok ? "bg-ok-tint text-brand-deep" : "bg-danger-tint text-danger-ink")}>
              {c.window.ok ? <ICheck className="size-4 shrink-0" /> : <IWarn className="size-4 shrink-0" />}
              {c.window.text}
            </div>
          )}
          <EnrolmentDecision id={c.id} status={c.status} note={c.note} blocked={!!c.window && !c.window.ok} part="note" />
        </Card>
        <div className="grid content-start gap-3">
          <Card title="Fee impact">
            <dl className="divide-y divide-line text-[13.5px]">
              {[
                ["Current monthly", formatINR(c.fee.currentMonthly)],
                ["New monthly", formatINR(c.fee.newMonthly)],
                ["Change", <Pill key="c" tone={c.fee.change > 0 ? "sun" : c.fee.change < 0 ? "green" : "grey"}>{`${sign}${formatINR(Math.abs(c.fee.change))}`}</Pill>],
                ["Takes effect", c.fee.takesEffect],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <dt className="text-ink-soft">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <EnrolmentDecision id={c.id} status={c.status} note={c.note} blocked={!!c.window && !c.window.ok} part="buttons" />
        </div>
      </div>
    </>
  );
}
