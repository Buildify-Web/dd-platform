"use client";

import { formatINR, paymentMethodLabel, type PaymentMethod } from "@dd/shared/domain";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IImage } from "@/components/portal/icons";
import { SelectBox, useAction } from "@/components/ui/client";
import { btn, Card, cx, inputCls, Pill } from "@/components/ui/kit";
import { rejectPayment, verifyPayment } from "@/lib/actions";

export type PaymentDetail = {
  id: string;
  status: string;
  student: string;
  parent: string | null;
  method: PaymentMethod;
  reference: string | null;
  amount: number;
  paidOn: string;
  screenshotFileId: string | null;
  note: string | null;
  balanceBefore: number;
};

/** Right panel: screenshot, details, "Apply to", note, Reject / Verify & mark paid. */
export function ReviewPanel({ p, options, suggested }: { p: PaymentDetail; options: { id: string; label: string }[]; suggested: string | null }) {
  const router = useRouter();
  const [recordId, setRecordId] = useState(suggested ?? "");
  const [note, setNote] = useState("");
  const [pending, run] = useAction();
  const done = () => router.replace("/admin/payments", { scroll: false });
  const rows: [string, React.ReactNode][] = [
    ["Student", p.student],
    ["Parent", p.parent ?? "—"],
    ["Method", paymentMethodLabel[p.method]],
    ["UTR / reference", p.reference ?? "—"],
    ["Amount", formatINR(p.amount)],
    ["Balance before", <span key="b" className="font-semibold">{formatINR(p.balanceBefore)}</span>],
  ];
  return (
    <Card title="Review payment" action={<Pill tone={p.status === "PENDING" ? "sun" : p.status === "VERIFIED" ? "green" : "red"}>{p.status === "PENDING" ? "Pending" : p.status === "VERIFIED" ? "Verified" : "Rejected"}</Pill>} className="self-start">
      {p.screenshotFileId ? (
        <a href={`/api/files/${p.screenshotFileId}`} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl border border-line bg-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/files/${p.screenshotFileId}`} alt="Payment screenshot uploaded by the parent" className="max-h-56 w-full object-contain" />
        </a>
      ) : (
        <div className="grid h-40 place-items-center rounded-2xl border border-line bg-frame text-center text-[12.5px] text-muted">
          <span className="flex flex-col items-center gap-2">
            <IImage className="size-6" />
            {p.method === "CASH" ? "Recorded at the office" : "No screenshot uploaded by parent"}
          </span>
        </div>
      )}
      <dl className="mt-2 divide-y divide-line text-[13.5px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-3">
            <dt className="text-ink-soft">{k}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
      </dl>
      {p.status === "PENDING" && (
        <div className="mt-1 grid gap-3">
          <div>
            <label className="mb-1.5 block text-[12.5px] text-ink-soft">Apply to</label>
            <SelectBox aria-label="Apply to" value={recordId} onChange={setRecordId} placeholder={options.length ? undefined : "Current month"} options={options.map((o) => ({ value: o.id, label: o.label }))} />
          </div>
          <div>
            <label htmlFor="pnote" className="mb-1.5 block text-[12.5px] text-ink-soft">
              Note (optional)
            </label>
            <input id="pnote" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="Shown to the parent if rejected" />
          </div>
          <div className="grid grid-cols-[1fr_1.4fr] gap-2">
            <button type="button" className={btn.danger} disabled={pending} onClick={() => void run(() => rejectPayment(p.id, note.trim()), { success: "Rejected. The parent was asked to resubmit.", onOk: done })}>
              Reject
            </button>
            <button type="button" className={cx(btn.dark)} disabled={pending} onClick={() => void run(() => verifyPayment(p.id, recordId || null, note.trim()), { success: (d) => (d.status === "PAID" ? "Verified. Fees fully paid." : `Verified. Balance ${formatINR(d.balance)}.`), onOk: done })}>
              {pending && <span className="spinner" />}
              Verify &amp; mark paid
            </button>
          </div>
          <p className="text-[12px] text-muted">Verifying updates the fee status and notifies the parent.</p>
        </div>
      )}
    </Card>
  );
}
