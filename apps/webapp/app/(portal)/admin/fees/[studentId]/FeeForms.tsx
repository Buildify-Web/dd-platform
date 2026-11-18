"use client";

import { formatINR, istDate, type FeeStatus, type PaymentMethod } from "@dd/shared/domain";
import { useState } from "react";
import { ActionButton, Dialog, Field, SelectBox, Toggle, useAction } from "@/components/ui/client";
import { btn, Card, cx, inputCls } from "@/components/ui/kit";
import { addOneTimeCharge, overrideFee, recordPayment, removeCharge, setFeeReminders, setFeeStatus } from "@/lib/actions";

const digits = (v: string) => v.replace(/\D/g, "");

/** Right card: record an offline payment. Status updates automatically; the parent is notified. */
export function RecordPayment({ studentId, month, balance }: { studentId: string; month: string; balance: number }) {
  const [f, setF] = useState({ amount: "", method: "GPAY" as PaymentMethod, paidOn: istDate(), reference: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useAction();
  const methods: [PaymentMethod, string][] = [
    ["CASH", "Cash at office"],
    ["GPAY", "GPay"],
    ["BANK_TRANSFER", "Bank transfer"],
  ];
  return (
    <Card title="Record payment">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => recordPayment(studentId, { month, amount: Number(f.amount), method: f.method, paidOn: f.paidOn, reference: f.reference.trim() }), {
            success: (d) => (d.balance ? `Payment saved. Balance now ${formatINR(d.balance)}.` : "Payment saved. Fees fully paid."),
            onOk: () => setF({ ...f, amount: "", reference: "" }),
            onError: (x) => setErrors(x.fields ?? {}),
          });
        }}
      >
        <Field label="Amount received (₹)" error={errors.amount} hint={balance ? `Balance ${formatINR(balance)}` : undefined}>
          {(id) => <input id={id} inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: digits(e.target.value) })} className={inputCls} />}
        </Field>
        <div>
          <p className="mb-1.5 text-[12.5px] text-ink-soft">Method</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Method">
            {methods.map(([m, l]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={f.method === m}
                onClick={() => setF({ ...f, method: m })}
                className={cx("h-10 rounded-full border px-4 text-[13.5px] transition-colors", f.method === m ? "border-ink bg-ink text-white" : "border-line-2 bg-white hover:border-ink/30")}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" error={errors.paidOn}>
            {(id) => <input id={id} type="date" max={istDate()} value={f.paidOn} onChange={(e) => setF({ ...f, paidOn: e.target.value })} className={inputCls} />}
          </Field>
          <Field label="Reference" error={errors.reference}>
            {(id) => <input id={id} maxLength={60} placeholder={f.method === "CASH" ? "Optional" : "UTR / IMPS"} value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} className={inputCls} />}
          </Field>
        </div>
        <button type="submit" className={cx(btn.dark, "w-full")} disabled={pending || !Number(f.amount)}>
          {pending && <span className="spinner" />}
          Save payment
        </button>
        <p className="-mt-1 text-[12px] text-muted">Status updates automatically. Parent is notified.</p>
      </form>
    </Card>
  );
}

export function RemindersToggle({ studentId, enabled }: { studentId: string; enabled: boolean }) {
  const [pending, run] = useAction();
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[14.5px]">Automatic reminders</p>
          <p className="text-[12px] text-muted">{enabled ? "10th · 20th · last day while unpaid" : "Exempt: no automatic reminders"}</p>
        </div>
        <Toggle checked={enabled} disabled={pending} label="Automatic reminders" onChange={(v) => void run(() => setFeeReminders(studentId, v), { success: v ? "Reminders on." : "Exempted from reminders." })} />
      </div>
    </Card>
  );
}

export function ManualStatus({ recordId, status, override }: { recordId: string; status: FeeStatus; override: FeeStatus | null }) {
  const [pending, run] = useAction();
  const opts: [FeeStatus, string][] = [
    ["PAID", "Paid completely"],
    ["PARTIAL", "Paid partially"],
    ["UNPAID", "Unpaid"],
  ];
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14.5px]">Manual status</p>
        <div role="radiogroup" aria-label="Manual status" className={cx("inline-flex max-w-full overflow-x-auto rounded-full bg-soft p-1", pending && "opacity-60")}>
          {opts.map(([s, l]) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={status === s}
              disabled={pending}
              onClick={() => status !== s && void run(() => setFeeStatus(recordId, s), { success: `Status set to ${l}.` })}
              className={cx("h-8 shrink-0 rounded-full px-3.5 text-[12.5px] transition-colors", status === s ? "bg-white text-ink shadow-[0_1px_3px_rgba(23,38,15,.12)]" : "text-muted hover:text-ink")}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[12px] text-muted">For Paid partially, remaining balance is recorded and used in reminders.</p>
      {override && (
        <button type="button" className="mt-2 text-[12.5px] text-brand hover:underline" disabled={pending} onClick={() => void run(() => setFeeStatus(recordId, null), { success: "Status is automatic again." })}>
          Go back to automatic status
        </button>
      )}
    </Card>
  );
}

export function RemoveCharge({ id, label }: { id: string; label: string }) {
  return (
    <ActionButton className="text-[11.5px] text-muted opacity-0 group-hover:opacity-100 hover:text-danger-ink focus-visible:opacity-100" action={() => removeCharge(id)} success="Charge removed." confirm={{ title: `Remove "${label}"?`, confirmLabel: "Remove", danger: true }}>
      Remove
    </ActionButton>
  );
}

/** "Override course fee" and "+ One-time payment" (charges card header). */
export function ChargeButtons({ studentId, month, enrolments }: { studentId: string; month: string; enrolments: { courseId: string; name: string; fee: number; override: number | null }[] }) {
  const [dialog, setDialog] = useState<"override" | "one" | null>(null);
  const [o, setO] = useState({ courseId: enrolments[0]?.courseId ?? "", amount: "", reason: "", ongoing: true });
  const [t, setT] = useState({ label: "", detail: "", amount: "" });
  const [pending, run] = useAction();
  const course = enrolments.find((e) => e.courseId === o.courseId);
  return (
    <span className="flex flex-wrap gap-2">
      <button type="button" className={btn.whiteSm} disabled={!enrolments.length} onClick={() => setDialog("override")}>
        Override course fee
      </button>
      <button type="button" className={btn.whiteSm} onClick={() => setDialog("one")}>
        + One-time payment
      </button>
      <Dialog open={dialog === "override"} onClose={() => setDialog(null)} title="Override course fee">
        <div className="grid gap-4">
          <Field label="Course">
            {(id) => <SelectBox id={id} value={o.courseId} onChange={(v) => setO({ ...o, courseId: v })} options={enrolments.map((e) => ({ value: e.courseId, label: `${e.name} · ${formatINR(e.fee)}${e.override !== null ? ` (now ${formatINR(e.override)})` : ""}` }))} />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="New monthly fee (₹)" hint={course ? `Standard ${formatINR(course.fee)}` : undefined}>
              {(id) => <input id={id} inputMode="numeric" value={o.amount} onChange={(e) => setO({ ...o, amount: digits(e.target.value) })} className={inputCls} />}
            </Field>
            <Field label="Reason">
              {(id) => <input id={id} maxLength={120} placeholder="e.g. sibling concession" value={o.reason} onChange={(e) => setO({ ...o, reason: e.target.value })} className={inputCls} />}
            </Field>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-2xl bg-frame p-3.5 text-[13.5px]">
            <span>
              Keep for future months
              <span className="block text-[12px] text-muted">Off = this month only</span>
            </span>
            <Toggle checked={o.ongoing} label="Keep for future months" onChange={(v) => setO({ ...o, ongoing: v })} />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className={btn.white} onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={btn.dark}
              disabled={pending || o.amount === "" || !o.courseId}
              onClick={() => void run(() => overrideFee(studentId, { month, courseId: o.courseId, amount: Number(o.amount), reason: o.reason.trim(), ongoing: o.ongoing }), { success: "Fee override saved.", onOk: () => setDialog(null) })}
            >
              {pending && <span className="spinner" />}
              Save override
            </button>
          </div>
        </div>
      </Dialog>
      <Dialog open={dialog === "one"} onClose={() => setDialog(null)} title="One-time payment">
        <div className="grid gap-4">
          <p className="text-[13px] text-muted">Counts toward the outstanding balance and reminders for this month.</p>
          <Field label="Item">
            {(id) => <input id={id} maxLength={120} placeholder="e.g. Science Olympiad · Level 1" value={t.label} onChange={(e) => setT({ ...t, label: e.target.value })} className={inputCls} />}
          </Field>
          <Field label="Details (optional)">
            {(id) => <input id={id} maxLength={200} placeholder="e.g. Registration ₹250 + transport ₹300" value={t.detail} onChange={(e) => setT({ ...t, detail: e.target.value })} className={inputCls} />}
          </Field>
          <Field label="Amount (₹)">
            {(id) => <input id={id} inputMode="numeric" value={t.amount} onChange={(e) => setT({ ...t, amount: digits(e.target.value) })} className={inputCls} />}
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className={btn.white} onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={btn.dark}
              disabled={pending || !t.label.trim() || !Number(t.amount)}
              onClick={() => void run(() => addOneTimeCharge(studentId, { month, label: t.label.trim(), detail: t.detail.trim(), amount: Number(t.amount) }), { success: "Charge added. The parent was notified.", onOk: () => (setDialog(null), setT({ label: "", detail: "", amount: "" })) })}
            >
              {pending && <span className="spinner" />}
              Add charge
            </button>
          </div>
        </div>
      </Dialog>
    </span>
  );
}
