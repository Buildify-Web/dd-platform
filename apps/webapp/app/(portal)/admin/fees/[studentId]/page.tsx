import { formatINR, monthKey, monthLabel, type FeeStatus } from "@dd/shared/domain";
import type { Metadata } from "next";
import Link from "next/link";
import { btn, Card, cx, Empty, Pill } from "@/components/ui/kit";
import { MonthFilter } from "@/components/ui/MonthFilter";
import { api, param, type SearchParams } from "@/lib/api";
import { requireAdmin } from "@/lib/portal";
import { ChargeButtons, ManualStatus, RecordPayment, RemindersToggle, RemoveCharge } from "./FeeForms";

export const metadata: Metadata = { title: "Fee record" };

export type FeeView = {
  student: { id: string; name: string; code: string; grade: string; feeRemindersEnabled: boolean; parentName: string | null };
  month: string;
  monthLabel: string;
  enrolments: { id: string; courseId: string; name: string; fee: number; override: number | null }[];
  record: {
    id: string;
    totalDue: number;
    paid: number;
    balance: number;
    status: FeeStatus;
    statusOverride: FeeStatus | null;
    charges: { id: string; type: "COURSE" | "OVERRIDE" | "ONE_TIME" | "COMPETITION"; label: string; detail: string | null; amount: number }[];
    history: { id: string; when: string; text: string; actor: string; amount: number | null }[];
    reminders: string[];
  } | null;
};

const typePill = { COURSE: <Pill tone="sage">Course</Pill>, OVERRIDE: <Pill tone="sun">Override</Pill>, ONE_TIME: <Pill tone="blue">One-time</Pill>, COMPETITION: <Pill tone="blue">Competition</Pill> };
const statusPill = (s: FeeStatus) => (s === "PAID" ? <Pill tone="green">Paid completely</Pill> : s === "PARTIAL" ? <Pill tone="sun">Paid partially</Pill> : <Pill tone="red">Unpaid</Pill>);

/** Design: "Student fee record" (Fee record · November 2026). */
export default async function FeeRecordPage({ params, searchParams }: { params: Promise<{ studentId: string }>; searchParams: SearchParams }) {
  const { studentId } = await params;
  await requireAdmin(`/admin/fees/${studentId}`);
  const month = param((await searchParams).month) || monthKey();
  const v = await api<FeeView>(`/v1/fees/students/${studentId}?month=${month}`);
  const r = v.record;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="flex flex-wrap items-baseline gap-x-3 text-[clamp(1.4rem,2.2vw,1.65rem)] font-normal">
          Fee record · {monthLabel(v.month)}
          <span className="text-[12.5px] text-muted">
            <Link href="/admin/fees" className="hover:text-ink">
              Fees
            </Link>{" "}
            / {v.student.name}
          </span>
        </h1>
        <div className="flex flex-wrap gap-2">
          <MonthFilter value={v.month} max={monthKey()} />
          <Link href={`/admin/students/${v.student.id}`} className={btn.white}>
            Student profile
          </Link>
        </div>
      </div>
      {!r ? (
        <Card>
          <Empty title={`No fee record for ${monthLabel(v.month)}`}>The student had no courses that month, or it&apos;s in the future.</Empty>
        </Card>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-[18px] border border-line bg-white px-5 py-4">
              <p className="text-[13px] text-ink-soft">Due this month</p>
              <p className="mt-2 text-[clamp(1.6rem,2.6vw,2rem)] leading-none font-semibold tabular-nums">{formatINR(r.totalDue)}</p>
            </div>
            <div className="rounded-[18px] bg-brand px-5 py-4 text-white">
              <p className="text-[13px] text-white/85">Paid</p>
              <p className="mt-2 text-[clamp(1.6rem,2.6vw,2rem)] leading-none font-semibold tabular-nums">{formatINR(r.paid)}</p>
            </div>
            <div className="rounded-[18px] bg-sun px-5 py-4">
              <p className="text-[13px] text-ink/80">Remaining balance</p>
              <p className="mt-2 text-[clamp(1.6rem,2.6vw,2rem)] leading-none font-semibold tabular-nums">{formatINR(r.balance)}</p>
            </div>
            <div className="rounded-[18px] border border-line bg-white px-5 py-4">
              <p className="text-[13px] text-ink-soft">Status</p>
              <div className="mt-2.5">{statusPill(r.status)}</div>
              {r.statusOverride && <p className="mt-1.5 text-[11.5px] text-muted">Set manually</p>}
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <div className="grid content-start gap-3">
              <Card title="Charges" action={<ChargeButtons studentId={v.student.id} month={v.month} enrolments={v.enrolments} />} pad={false}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-[13.5px]">
                    <thead>
                      <tr className="text-[12px] text-muted">
                        <th className="border-y border-line px-4 py-3 font-normal sm:pl-5">Item</th>
                        <th className="border-y border-line px-4 py-3 font-normal">Type</th>
                        <th className="border-y border-line px-4 py-3 text-right font-normal sm:pr-5">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.charges.map((c) => (
                        <tr key={c.id} className="group">
                          <td className="border-b border-line px-4 py-3 sm:pl-5">
                            <p>{c.label}</p>
                            {c.detail && <p className="text-[12px] text-muted">{c.detail}</p>}
                          </td>
                          <td className="border-b border-line px-4 py-3">{typePill[c.type]}</td>
                          <td className="border-b border-line px-4 py-3 text-right tabular-nums sm:pr-5">
                            <span className="inline-flex items-center gap-2">
                              {(c.type === "ONE_TIME" || c.type === "COMPETITION") && <RemoveCharge id={c.id} label={c.label} />}
                              {c.amount.toLocaleString("en-IN")}
                            </span>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className="px-4 py-3.5 font-semibold sm:pl-5" colSpan={2}>
                          Total due
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold tabular-nums sm:pr-5">{r.totalDue.toLocaleString("en-IN")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
              <Card title="Payment & change history" action={<span className="text-[12px] text-muted">Kept permanently</span>} pad={false}>
                <ul className="divide-y divide-line border-t border-line">
                  {r.history.map((h) => (
                    <li key={h.id} className="grid grid-cols-[110px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-[13.5px] sm:grid-cols-[130px_minmax(0,1fr)_80px_90px] sm:px-5">
                      <span className="text-[12.5px] text-muted">{h.when}</span>
                      <span className="min-w-0">{h.text}</span>
                      <span className="hidden text-[12.5px] text-muted sm:block">{h.actor}</span>
                      <span className={cx("text-right tabular-nums", h.amount && h.amount > 0 && h.text.toLowerCase().includes("payment") ? "text-brand" : "")}>
                        {h.amount === null ? "—" : `${h.text.toLowerCase().includes("payment") ? "+" : ""}${formatINR(h.amount)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
            <div className="grid content-start gap-3">
              <RecordPayment studentId={v.student.id} month={v.month} balance={r.balance} />
              <RemindersToggle studentId={v.student.id} enabled={v.student.feeRemindersEnabled} />
              <ManualStatus recordId={r.id} status={r.status} override={r.statusOverride} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
