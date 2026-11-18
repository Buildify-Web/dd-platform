"use client";

import { emailSchema } from "@dd/shared/auth";
import { ADDRESS_MAX, effectiveSessionType, formatINR, GRADES, gradeLabel, mobileIssue, personNameSchema, type Grade, type LearningMode, type SessionType } from "@dd/shared/domain";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ITrash } from "@/components/portal/icons";
import { ActionButton, Field, SelectBox, useAction } from "@/components/ui/client";
import { btn, cx, inputCls, Pill, textareaCls } from "@/components/ui/kit";
import { addEnrolment, deleteStudent, removeEnrolment, updateStudent } from "@/lib/actions";

export type StudentDetail = {
  id: string;
  name: string;
  grade: Grade;
  fatherName: string | null;
  motherName: string | null;
  mobile: string;
  email: string | null;
  address: string | null;
  sessionType: SessionType;
  learningMode: LearningMode;
  status: "ACTIVE" | "INACTIVE";
};

/** Active / Inactive pill toggle in the profile header (Inactive only with no courses). */
/** Permanent delete. The server refuses students with payment records; the message says so. */
export function DeleteStudentButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <ActionButton
      className={btn.danger}
      action={() => deleteStudent(id)}
      success={`${name} was deleted.`}
      onDone={() => router.push("/admin/students")}
      confirm={{
        title: `Delete ${name}?`,
        body: "This permanently removes the student, their enrolments, attendance, marks and homework, along with their approved registration, photo and school ID card. Students with payment records can't be deleted; mark them inactive instead. This can't be undone.",
        confirmLabel: "Delete permanently",
        danger: true,
      }}
    >
      Delete student
    </ActionButton>
  );
}

export function StatusToggle({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) {
  const [pending, run] = useAction();
  const set = (next: "ACTIVE" | "INACTIVE") => next !== status && run(() => updateStudent(id, { status: next }), { success: next === "ACTIVE" ? "Student is active again." : "Student marked inactive." });
  return (
    <div role="radiogroup" aria-label="Student status" className={cx("inline-flex rounded-full bg-white/10 p-1", pending && "opacity-60")}>
      {(["ACTIVE", "INACTIVE"] as const).map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={status === s}
          disabled={pending}
          onClick={() => void set(s)}
          className={cx("h-8 rounded-full px-4 text-[13px] transition-colors", status === s ? "bg-white text-ink" : "text-white/75 hover:text-white")}
        >
          {s === "ACTIVE" ? "Active" : "Inactive"}
        </button>
      ))}
    </div>
  );
}

const nameErr = (v: string, optional = false) => {
  if (optional && !v.trim()) return undefined;
  const r = personNameSchema.safeParse(v);
  return r.success ? undefined : r.error.issues[0]?.message;
};

/** Overview tab: every field is editable by admin at any time (changes are audited). */
export function OverviewForm({ s }: { s: StudentDetail }) {
  const initial = {
    name: s.name,
    grade: s.grade,
    fatherName: s.fatherName ?? "",
    motherName: s.motherName ?? "",
    mobile: s.mobile,
    email: s.email ?? "",
    address: s.address ?? "",
    sessionType: s.sessionType,
    learningMode: s.learningMode,
  };
  const [f, setF] = useState(initial);
  const [server, setServer] = useState<Record<string, string>>({});
  const [pending, run] = useAction();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => (setF((x) => ({ ...x, [k]: v })), setServer((e) => ({ ...e, [k]: "" })));
  const errors: Record<string, string | undefined> = {
    name: nameErr(f.name),
    fatherName: nameErr(f.fatherName, true),
    motherName: nameErr(f.motherName, true),
    mobile: mobileIssue(f.mobile) ?? undefined,
    email: f.email && !emailSchema.safeParse(f.email).success ? "Enter a valid email address." : undefined,
    address: f.address.length > ADDRESS_MAX ? `Max ${ADDRESS_MAX} characters.` : undefined,
  };
  const err = (k: string) => server[k] || errors[k];
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);
  const invalid = Object.values(errors).some(Boolean);
  const changed = Object.fromEntries(Object.entries(f).filter(([k, v]) => v !== initial[k as keyof typeof initial]));

  const input = (k: "name" | "fatherName" | "motherName" | "mobile" | "email", label: string, mode?: "numeric" | "email") => (
    <Field label={label} error={err(k)}>
      {(id) => <input id={id} value={f[k]} inputMode={mode} aria-invalid={!!err(k) || undefined} onChange={(e) => set(k, e.target.value)} className={inputCls} />}
    </Field>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run(() => updateStudent(s.id, { ...changed, ...(changed.learningMode || changed.sessionType ? { sessionType: effectiveSessionType(f.learningMode, f.sessionType) } : {}) }), {
          success: "Changes saved.",
          onError: (x) => setServer(x.fields ?? {}),
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {input("name", "Student name")}
        <Field label="Grade" error={err("grade")}>
          {(id) => <SelectBox id={id} value={f.grade} onChange={(v) => set("grade", v as Grade)} options={GRADES.map((g) => ({ value: g, label: gradeLabel(g) }))} />}
        </Field>
        {input("fatherName", "Father's name")}
        {input("motherName", "Mother's name")}
        {input("mobile", "Primary mobile", "numeric")}
        {input("email", "Email", "email")}
        <Field label="Session type" hint={f.learningMode === "ONE_ON_ONE" ? "One-on-one is always online." : undefined}>
          {(id) => (
            <SelectBox
              id={id}
              value={effectiveSessionType(f.learningMode, f.sessionType)}
              disabled={f.learningMode === "ONE_ON_ONE"}
              onChange={(v) => set("sessionType", v as SessionType)}
              options={[
                { value: "OFFLINE", label: "Offline" },
                { value: "ONLINE", label: "Online" },
              ]}
            />
          )}
        </Field>
        <Field label="Learning mode">
          {(id) => (
            <SelectBox
              id={id}
              value={f.learningMode}
              onChange={(v) => set("learningMode", v as LearningMode)}
              options={[
                { value: "GROUP", label: "Group" },
                { value: "ONE_ON_ONE", label: "One-on-one" },
              ]}
            />
          )}
        </Field>
        <Field label="Address" error={err("address")} className="sm:col-span-2 xl:col-span-4">
          {(id) => <textarea id={id} rows={3} value={f.address} onChange={(e) => set("address", e.target.value)} className={textareaCls} />}
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className={btn.white} disabled={!dirty || pending} onClick={() => (setF(initial), setServer({}))}>
          Cancel
        </button>
        <button type="submit" className={btn.dark} disabled={!dirty || invalid || pending}>
          {pending && <span className="spinner" />}
          Save changes
        </button>
      </div>
    </form>
  );
}

/** Courses tab: add / remove enrolments (admin changes take effect immediately). */
export function CoursesManager({
  studentId,
  enrolments,
  available,
}: {
  studentId: string;
  enrolments: { id: string; name: string; fee: number; feeOverride: number | null; overrideReason: string | null; mandatory: boolean }[];
  available: { id: string; name: string; fee: number }[];
}) {
  const [course, setCourse] = useState("");
  const [pending, run] = useAction();
  return (
    <div className="grid gap-4">
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {enrolments.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 rounded-2xl bg-frame px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-[14px]">{e.name}</p>
              <p className="text-[12px] text-muted">
                {e.feeOverride !== null ? `${formatINR(e.fee)} → ${formatINR(e.feeOverride)}${e.overrideReason ? ` (${e.overrideReason})` : ""}` : formatINR(e.fee)}/month
              </p>
            </div>
            {e.mandatory ? (
              <Pill tone="ink">Required</Pill>
            ) : (
              <ActionButton className={btn.iconDanger} title={`Remove ${e.name}`} action={() => removeEnrolment(studentId, e.id)} success={`${e.name} removed.`} confirm={{ title: `Remove ${e.name}?`, body: "The student leaves this course now. Next month's fee won't include it.", confirmLabel: "Remove", danger: true }}>
                <ITrash className="size-4" />
              </ActionButton>
            )}
          </li>
        ))}
        {!enrolments.length && <li className="text-[13.5px] text-muted">No courses. The student can be made inactive.</li>}
      </ul>
      {available.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <SelectBox aria-label="Add a course" className="w-full sm:w-72" value={course} onChange={setCourse} placeholder="Add a course…" options={available.map((c) => ({ value: c.id, label: `${c.name} · ${formatINR(c.fee)}` }))} />
          <button type="button" className={btn.dark} disabled={!course || pending} onClick={() => void run(() => addEnrolment(studentId, course), { success: "Course added. This month's fee was updated.", onOk: () => setCourse("") })}>
            {pending && <span className="spinner" />}
            Enrol
          </button>
        </div>
      )}
    </div>
  );
}
