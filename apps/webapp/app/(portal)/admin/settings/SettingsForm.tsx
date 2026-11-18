"use client";

import { useState } from "react";
import { Field, Toggle, useAction } from "@/components/ui/client";
import { btn, Card, inputCls } from "@/components/ui/kit";
import { saveSettings } from "@/lib/actions";

export type Settings = {
  instituteName: string;
  attendanceDeadline: string;
  sessionSplit: string;
  lateAfterMorning: string;
  lateAfterEvening: string;
  lateAfterDay: string;
  rfidDedupeMinutes: number;
  rfidOfflineMinutes: number;
  attendanceThreshold: number;
  homeworkReportTime: string;
  upiId: string;
  gpayNumber: string;
  bankDetails: string;
  feeReminders: boolean;
};

const TIMES: [keyof Settings, string][] = [
  ["attendanceDeadline", "Attendance deadline (reminder to teacher and admin)"],
  ["sessionSplit", "Taps before this time are the morning session"],
  ["lateAfterMorning", "Late after (morning)"],
  ["lateAfterEvening", "Late after (evening)"],
  ["lateAfterDay", "Late after (Grade 8 and below)"],
  ["homeworkReportTime", "Homework 'not completed' report at"],
];

/** Settings form: only changed fields are saved (each change is audited). */
export function SettingsForm({ s }: { s: Settings }) {
  const [v, setV] = useState<Settings>(s);
  const [pending, run] = useAction();
  const dirty = JSON.stringify(v) !== JSON.stringify(s);
  const set = <K extends keyof Settings>(k: K, val: Settings[K]) => setV((x) => ({ ...x, [k]: val }));
  return (
    <Card title="Attendance, RFID and reports">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const patch = Object.fromEntries(Object.entries(v).filter(([k, val]) => JSON.stringify(val) !== JSON.stringify((s as Record<string, unknown>)[k])));
          void run(() => saveSettings(patch), { success: "Settings saved." });
        }}
      >
        <Field label="Institute name">{(id) => <input id={id} maxLength={100} value={v.instituteName} onChange={(e) => set("instituteName", e.target.value)} className={inputCls} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {TIMES.map(([k, label]) => (
            <Field key={k} label={label}>
              {(id) => <input id={id} type="time" value={v[k] as string} onChange={(e) => set(k, e.target.value as never)} className={inputCls} />}
            </Field>
          ))}
          <Field label="Repeat taps ignored within (minutes)">
            {(id) => <input id={id} inputMode="numeric" value={v.rfidDedupeMinutes} onChange={(e) => set("rfidDedupeMinutes", Number(e.target.value.replace(/\D/g, "")) || 0)} className={inputCls} />}
          </Field>
          <Field label="Reader offline after (minutes)">
            {(id) => <input id={id} inputMode="numeric" value={v.rfidOfflineMinutes} onChange={(e) => set("rfidOfflineMinutes", Number(e.target.value.replace(/\D/g, "")) || 0)} className={inputCls} />}
          </Field>
          <Field label="Attendance threshold (%)" hint="Students below this are flagged in reports">
            {(id) => <input id={id} inputMode="numeric" value={v.attendanceThreshold} onChange={(e) => set("attendanceThreshold", Number(e.target.value.replace(/\D/g, "")) || 0)} className={inputCls} />}
          </Field>
        </div>
        <div id="payments" className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <Field label="UPI ID (shown on the payment page)">{(id) => <input id={id} maxLength={60} value={v.upiId} onChange={(e) => set("upiId", e.target.value)} className={inputCls} />}</Field>
          <Field label="GPay number">{(id) => <input id={id} maxLength={15} value={v.gpayNumber} onChange={(e) => set("gpayNumber", e.target.value)} className={inputCls} />}</Field>
          <Field label="Bank details" className="sm:col-span-2">
            {(id) => <textarea id={id} rows={2} maxLength={300} value={v.bankDetails} onChange={(e) => set("bankDetails", e.target.value)} className="block w-full resize-none rounded-xl border border-field bg-white px-3.5 py-3 text-base outline-none focus:border-ink/40 sm:text-[14px]" />}
          </Field>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-2xl bg-frame p-4 text-[14px]">
          <span>
            Automatic fee reminders
            <span className="block text-[12px] text-muted">On the 10th, 20th and last day while unpaid</span>
          </span>
          <Toggle checked={v.feeReminders} label="Automatic fee reminders" onChange={(x) => set("feeReminders", x)} />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className={btn.white} disabled={!dirty || pending} onClick={() => setV(s)}>
            Discard
          </button>
          <button type="submit" className={btn.dark} disabled={!dirty || pending}>
            {pending && <span className="spinner" />}
            Save settings
          </button>
        </div>
      </form>
    </Card>
  );
}
