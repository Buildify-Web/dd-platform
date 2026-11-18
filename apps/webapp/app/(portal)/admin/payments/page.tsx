import { formatINR, paymentMethodLabel, type PaymentMethod } from "@dd/shared/domain";
import type { Metadata } from "next";
import Link from "next/link";
import { IDollar } from "@/components/portal/icons";
import { FilterSelect } from "@/components/ui/client";
import { btn, Card, cx, Empty, PageHeader, Pill, PillTabs, StatCard, StatGrid } from "@/components/ui/kit";
import { api, param, qs, type SearchParams } from "@/lib/api";
import { requireAdmin } from "@/lib/portal";
import { ReviewPanel, type PaymentDetail } from "./ReviewPanel";

export const metadata: Metadata = { title: "Payment verification" };

type Data = {
  stats: { pending: number; verifiedCount: number; verifiedAmount: number; cash: number; rejected: number };
  rows: { id: string; submitted: string; student: string; parent: string | null; method: PaymentMethod; reference: string | null; amount: number; status: string; source: string }[];
};

/** Design: "Payments to review" (Payment verification · Finance / Payments). */
export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/payments");
  const sp = await searchParams;
  const status = (["PENDING", "VERIFIED", "ALL"].includes(param(sp.status)) ? param(sp.status) : "PENDING") as "PENDING" | "VERIFIED" | "ALL";
  const method = param(sp.method);
  const d = await api<Data>(`/v1/payments${qs({ status, method })}`);
  const selectedId = d.rows.find((r) => r.id === param(sp.id))?.id ?? (status === "PENDING" ? d.rows[0]?.id : undefined);
  const detail = selectedId ? await api<{ payment: PaymentDetail; applyOptions: { id: string; label: string }[]; suggestedRecordId: string | null }>(`/v1/payments/${selectedId}`) : null;
  const href = (patch: Record<string, string>) => `/admin/payments${qs({ status: status === "PENDING" ? "" : status, method, ...patch })}`;

  return (
    <>
      <PageHeader
        title="Payment verification"
        crumb="Finance / Payments"
        actions={
          <>
            <Link href="/admin/settings#payments" className={btn.white}>
              Payment details
            </Link>
            <a href={`/api/export${qs({ src: "payments/export", status, method, format: "xlsx" })}`} className={btn.dark}>
              Export
            </a>
          </>
        }
      />
      <StatGrid>
        <StatCard tone="sun" label="Awaiting verification" value={d.stats.pending} sub="Parent-submitted GPay / bank" />
        <StatCard label="Verified this month" value={d.stats.verifiedCount} sub={formatINR(d.stats.verifiedAmount)} />
        <StatCard label="Cash at office" value={formatINR(d.stats.cash)} sub="Recorded by admin" />
        <StatCard label="Rejected" value={d.stats.rejected} sub="Parent asked to resubmit" />
      </StatGrid>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card pad={false} className="self-start">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
            <PillTabs
              active={status}
              tabs={[
                { key: "PENDING", label: "Pending", href: href({ status: "", id: "" }) },
                { key: "VERIFIED", label: "Verified", href: href({ status: "VERIFIED", id: "" }) },
                { key: "ALL", label: "All", href: href({ status: "ALL", id: "" }) },
              ]}
            />
            <FilterSelect name="method" label="Method" className="w-[160px]" value={method} options={[{ value: "", label: "All methods" }, { value: "GPAY", label: "GPay" }, { value: "BANK_TRANSFER", label: "Bank transfer" }, { value: "CASH", label: "Cash at office" }]} />
          </div>
          {d.rows.length === 0 ? (
            <Empty title={status === "PENDING" ? "Nothing to verify" : "No payments"} icon={<IDollar className="size-5" />}>
              Payments parents submit from the app appear here.
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13.5px]">
                <thead>
                  <tr className="text-[12px] text-muted">
                    <th className="border-b border-line px-4 py-3 font-normal sm:pl-5">Submitted</th>
                    <th className="border-b border-line px-4 py-3 font-normal">Student</th>
                    <th className="border-b border-line px-4 py-3 font-normal">Method</th>
                    <th className="border-b border-line px-4 py-3 font-normal">Reference</th>
                    <th className="border-b border-line px-4 py-3 text-right font-normal">Amount</th>
                    <th className="border-b border-line px-4 py-3 font-normal sm:pr-5" />
                  </tr>
                </thead>
                <tbody>
                  {d.rows.map((r) => {
                    const sel = r.id === selectedId;
                    return (
                      <tr key={r.id} className={sel ? "bg-[#fdf9e6]" : undefined}>
                        <td className="border-b border-line px-4 py-3 whitespace-nowrap text-ink-soft sm:pl-5">{r.submitted}</td>
                        <td className="border-b border-line px-4 py-3">
                          <p>{r.student}</p>
                          <p className="text-[12px] text-muted">{r.parent}</p>
                        </td>
                        <td className="border-b border-line px-4 py-3">
                          <Pill tone={r.method === "GPAY" ? "blue" : r.method === "CASH" ? "sage" : "grey"}>{paymentMethodLabel[r.method]}</Pill>
                        </td>
                        <td className="border-b border-line px-4 py-3 whitespace-nowrap text-ink-soft">{r.reference ?? "—"}</td>
                        <td className="border-b border-line px-4 py-3 text-right font-semibold tabular-nums">{formatINR(r.amount)}</td>
                        <td className="border-b border-line px-4 py-3 text-right sm:pr-5">
                          {r.status === "PENDING" ? (
                            <Link href={href({ id: r.id })} scroll={false} className={cx(sel ? btn.darkSm : btn.whiteSm)}>
                              Review
                            </Link>
                          ) : (
                            <Pill tone={r.status === "VERIFIED" ? "green" : "red"}>{r.status === "VERIFIED" ? "Verified" : "Rejected"}</Pill>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        {detail && <ReviewPanel key={detail.payment.id} p={detail.payment} options={detail.applyOptions} suggested={detail.suggestedRecordId} />}
      </div>
    </>
  );
}
