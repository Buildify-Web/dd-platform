"use client";

import { emailSchema } from "@dd/shared/auth";
import { mobileIssue, personNameSchema } from "@dd/shared/domain";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IPlus } from "@/components/portal/icons";
import { Dialog, Field, useAction } from "@/components/ui/client";
import { btn, inputCls } from "@/components/ui/kit";
import { createStaff } from "@/lib/actions";

/** "Add staff": creates the account and emails a temporary password (same as approving a registration). */
export function AddStaffButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", email: "", mobile: "", subject: "" });
  const [server, setServer] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [pending, run] = useAction();
  const errors: Record<string, string | undefined> = {
    name: personNameSchema.safeParse(f.name).success ? undefined : "Letters, . and spaces only.",
    email: emailSchema.safeParse(f.email).success ? undefined : "Enter a valid email address.",
    mobile: mobileIssue(f.mobile) ?? undefined,
  };
  const err = (k: string) => server[k] || (touched ? errors[k] : undefined);
  const field = (k: keyof typeof f, label: string, mode?: "numeric" | "email", required = true) => (
    <Field label={label} required={required} error={err(k)}>
      {(id) => <input id={id} value={f[k]} inputMode={mode} aria-invalid={!!err(k) || undefined} onChange={(e) => (setF((x) => ({ ...x, [k]: e.target.value })), setServer({}))} className={inputCls} />}
    </Field>
  );
  return (
    <>
      <button type="button" className={btn.white} onClick={() => setOpen(true)}>
        <IPlus className="size-4" />
        Add staff
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add a teacher">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (Object.values(errors).some(Boolean)) return;
            void run(() => createStaff({ ...f, subject: f.subject.trim() }), {
              success: "Teacher added. Login details were emailed.",
              onOk: (d) => (setOpen(false), router.push(`/admin/staff/${d.id}`)),
              onError: (x) => setServer(x.fields ?? {}),
            });
          }}
        >
          {field("name", "Full name")}
          <div className="grid gap-4 sm:grid-cols-2">
            {field("email", "Email (username)", "email")}
            {field("mobile", "Mobile", "numeric")}
          </div>
          {field("subject", "Subject", undefined, false)}
          <p className="text-[12.5px] text-muted">They get an email with a temporary password and activate their account at the staff portal. Then assign their grades and courses.</p>
          <div className="flex justify-end gap-2">
            <button type="button" className={btn.white} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className={btn.dark} disabled={pending}>
              {pending && <span className="spinner" />}
              Add & send login
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
