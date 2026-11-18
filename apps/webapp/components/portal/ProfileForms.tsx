"use client";

import { mobileIssue, personNameSchema } from "@dd/shared/domain";
import { useState } from "react";
import { Field, Toggle, useAction } from "@/components/ui/client";
import { btn, Card, inputCls } from "@/components/ui/kit";
import { changePassword, revokeOtherSessions, savePreferences, updateProfile } from "@/lib/actions";
import { newPasswordSchema } from "@dd/shared/auth";

type P = { id: string; name: string; email: string; mobile: string | null; designation: string; subject: string | null; staffCode: string | null; role: "ADMIN" | "STAFF"; isMainAdmin: boolean; preferences: Record<string, boolean>; appearsAs: string | null; parentLabel: string | null; classesLabel: string | null };

const PREFS: [string, string][] = [
  ["approvals", "Approvals and leave requests"],
  ["payments", "Payments to verify"],
  ["system", "System alerts (RFID offline, attendance not marked)"],
  ["classes", "Class and homework updates"],
];

/** The three tabs' forms. Staff can't change their designation; admin can. */
export function ProfileForms({ tab, portal, profile: p }: { tab: string; portal: "admin" | "staff"; profile: P }) {
  if (tab === "security") return <Security />;
  if (tab === "notifications") return <Notifications prefs={p.preferences} admin={p.role === "ADMIN"} />;
  return <Details p={p} portal={portal} />;
}

function Details({ p, portal }: { p: P; portal: "admin" | "staff" }) {
  const [v, setV] = useState({ name: p.name, mobile: p.mobile ?? "", designation: p.designation });
  const [err, setErr] = useState<Record<string, string>>({});
  const [pending, run] = useAction();
  const nameOk = personNameSchema.safeParse(v.name).success;
  const mobOk = !mobileIssue(v.mobile);
  const dirty = v.name !== p.name || v.mobile !== (p.mobile ?? "") || v.designation !== p.designation;
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card title="Personal details">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const body: Record<string, string> = {};
            if (v.name !== p.name) body.name = v.name.trim();
            if (v.mobile !== (p.mobile ?? "")) body.mobile = v.mobile.trim();
            if (p.role === "ADMIN" && v.designation !== p.designation) body.designation = v.designation.trim();
            void run(() => updateProfile(body), { success: "Details saved.", onError: (x) => setErr(x.fields ?? {}) });
          }}
        >
          <Field label="Full name" error={err.name || (v.name && !nameOk ? "Letters, . and spaces only." : undefined)}>
            {(id) => <input id={id} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={inputCls} />}
          </Field>
          <Field label="Mobile" error={err.mobile || (v.mobile && !mobOk ? mobileIssue(v.mobile) ?? undefined : undefined)}>
            {(id) => <input id={id} inputMode="numeric" value={v.mobile} onChange={(e) => setV({ ...v, mobile: e.target.value })} className={inputCls} />}
          </Field>
          <Field label="Email" hint="Used for sign-in and password reset. Changed by admin.">
            {(id) => <input id={id} value={p.email} disabled className={inputCls} />}
          </Field>
          <Field label="Designation" hint={p.role === "ADMIN" ? undefined : "Set by admin"}>
            {(id) => <input id={id} value={v.designation} disabled={p.role !== "ADMIN"} onChange={(e) => setV({ ...v, designation: e.target.value })} className={inputCls} />}
          </Field>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className={btn.dark} disabled={!dirty || !nameOk || !mobOk || pending}>
              {pending && <span className="spinner" />}
              Save details
            </button>
          </div>
        </form>
      </Card>
      <Card title="How you appear" className="self-start">
        <p className="mb-3 text-[12.5px] text-muted">{portal === "admin" ? "Shown on announcements and in the audit log." : "Shown on class notices and updates."}</p>
        <div className="flex items-center gap-3 rounded-2xl bg-frame p-3.5">
          <span className="grid size-10 place-items-center rounded-full bg-sun text-[14px] font-semibold">{p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
          <span className="min-w-0">
            <span className="block text-[14px]">{portal === "admin" ? "Dynamic Donalds" : (p.parentLabel ?? p.name)}</span>
            <span className="block text-[12px] text-muted">{portal === "admin" ? (p.appearsAs ?? "") : (p.classesLabel ?? "")}</span>
          </span>
        </div>
      </Card>
    </div>
  );
}

function Security() {
  const [v, setV] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [err, setErr] = useState<Record<string, string>>({});
  const [pending, run] = useAction();
  const pw = newPasswordSchema.safeParse(v.newPassword);
  const ok = pw.success && v.newPassword === v.confirm && !!v.currentPassword;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card title="Change password">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword }), {
              success: "Password changed. Other devices were signed out.",
              onOk: () => setV({ currentPassword: "", newPassword: "", confirm: "" }),
              onError: (x) => setErr(x.fields ?? {}),
            });
          }}
        >
          <Field label="Current password" error={err.currentPassword}>
            {(id) => <input id={id} type="password" autoComplete="current-password" value={v.currentPassword} onChange={(e) => setV({ ...v, currentPassword: e.target.value })} className={inputCls} />}
          </Field>
          <Field label="New password" error={err.newPassword || (v.newPassword && !pw.success ? pw.error.issues[0]?.message : undefined)} hint="At least 8 characters, with a letter and a number. Not one you used recently.">
            {(id) => <input id={id} type="password" autoComplete="new-password" value={v.newPassword} onChange={(e) => setV({ ...v, newPassword: e.target.value })} className={inputCls} />}
          </Field>
          <Field label="Confirm new password" error={v.confirm && v.confirm !== v.newPassword ? "Passwords don't match." : undefined}>
            {(id) => <input id={id} type="password" autoComplete="new-password" value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} className={inputCls} />}
          </Field>
          <div className="flex justify-end">
            <button type="submit" className={btn.dark} disabled={!ok || pending}>
              {pending && <span className="spinner" />}
              Change password
            </button>
          </div>
        </form>
      </Card>
      <Card title="Other devices" className="self-start">
        <p className="mb-4 text-[13.5px] text-ink-soft">Sign out everywhere except this browser if you think someone else has access.</p>
        <button type="button" className={btn.white} disabled={pending} onClick={() => void run(() => revokeOtherSessions(), { success: "Other devices signed out." })}>
          Sign out other devices
        </button>
      </Card>
    </div>
  );
}

function Notifications({ prefs, admin }: { prefs: Record<string, boolean>; admin: boolean }) {
  const [v, setV] = useState<Record<string, boolean>>({ approvals: true, payments: true, system: true, classes: true, ...prefs });
  const [pending, run] = useAction();
  const items = PREFS.filter(([k]) => admin || k !== "approvals" || true);
  return (
    <Card title="Notify me about" className="max-w-2xl">
      <ul className="divide-y divide-line">
        {items.map(([k, label]) => (
          <li key={k} className="flex items-center justify-between gap-3 py-3.5 text-[14px]">
            <span>{label}</span>
            <Toggle checked={v[k] ?? true} label={label} disabled={pending} onChange={(x) => setV({ ...v, [k]: x })} />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end">
        <button type="button" className={btn.dark} disabled={pending} onClick={() => void run(() => savePreferences(v), { success: "Preferences saved." })}>
          {pending && <span className="spinner" />}
          Save preferences
        </button>
      </div>
    </Card>
  );
}
