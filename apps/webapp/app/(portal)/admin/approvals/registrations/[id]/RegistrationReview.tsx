"use client";

import { emailSchema } from "@dd/shared/auth";
import {
  ADDRESS_MAX,
  ageOn,
  effectiveSessionType,
  genderLabel,
  isGender,
  formatINR,
  GRADES,
  gradeLabel,
  gradeNumber,
  initials,
  isGrade,
  learningModeLabel,
  mobileIssue,
  personNameSchema,
  sessionTypeLabel,
  type Grade,
  type LearningMode,
  type SessionType,
} from "@dd/shared/domain";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Chip, Dialog, Field, Segmented, SelectBox, useAction, useToast } from "@/components/ui/client";
import { btn, Card, cx, inputCls, Pill, textareaCls } from "@/components/ui/kit";
import { approveRegistration, rejectRegistration, requestRegistrationInfo, uploadFile } from "@/lib/actions";
import type { CourseLite } from "@/lib/portal";

export type Registration = {
  id: string;
  code: string;
  type: "STUDENT" | "STAFF";
  status: "PENDING" | "INFO_REQUESTED" | "APPROVED" | "REJECTED";
  submittedAt: string;
  decisionNote: string | null;
  photoFileId: string | null;
  data: Record<string, unknown>;
  issues: Record<string, string>;
  duplicate: { match: boolean; label: string | null };
  summary: Record<string, unknown>;
  prevId: string | null;
  nextId: string | null;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");
const ago = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "1 day ago" : `${d} days ago`;
};
const nameErr = (v: string) => {
  const r = personNameSchema.safeParse(v);
  return r.success ? undefined : r.error.issues[0]?.message;
};

export function RegistrationReview({ r, courses }: { r: Registration; courses: CourseLite[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, run] = useAction();
  const decided = r.status === "APPROVED" || r.status === "REJECTED";
  const student = r.type === "STUDENT";

  const [f, setF] = useState(() => ({
    studentName: str(r.data.studentName),
    name: str(r.data.name),
    grade: (isGrade(r.data.grade) ? r.data.grade : "") as Grade | "",
    fatherName: str(r.data.fatherName),
    motherName: str(r.data.motherName),
    mobile: str(r.data.mobile),
    email: str(r.data.email),
    address: str(r.data.address),
    subject: str(r.data.subject),
    courseIds: Array.isArray(r.data.courseIds) ? (r.data.courseIds as string[]) : [],
    learningMode: (r.data.learningMode === "ONE_ON_ONE" ? "ONE_ON_ONE" : "GROUP") as LearningMode,
    sessionType: (r.data.sessionType === "ONLINE" ? "ONLINE" : "OFFLINE") as SessionType,
  }));
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<{ id: string; size: number } | null>(null);
  const [dialog, setDialog] = useState<"info" | "reject" | null>(null);
  const [note, setNote] = useState(r.decisionNote ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setServerErrors((e) => ({ ...e, [k]: "" }));
  };

  const gradeCourses = useMemo(() => (f.grade ? courses.filter((c) => c.grades.includes(f.grade as Grade)) : []), [courses, f.grade]);
  const mandatory = gradeCourses.filter((c) => c.isMandatory && f.grade && [9, 10].includes(gradeNumber(f.grade as Grade)));
  const selected = new Set([...f.courseIds.filter((id) => gradeCourses.some((c) => c.id === id)), ...mandatory.map((c) => c.id)]);
  const monthly = gradeCourses.filter((c) => selected.has(c.id)).reduce((t, c) => t + c.monthlyFee, 0);
  const session = effectiveSessionType(f.learningMode, f.sessionType);

  // Live validation (same rules as the backend, from @dd/shared).
  const errors: Record<string, string | undefined> = student
    ? {
        studentName: nameErr(f.studentName),
        grade: f.grade ? undefined : "Choose a grade.",
        fatherName: nameErr(f.fatherName),
        motherName: nameErr(f.motherName),
        mobile: mobileIssue(f.mobile) ?? undefined,
        email: emailSchema.safeParse(f.email).success ? undefined : "Enter a valid email address.",
        address: !f.address.trim() ? "Enter the residential address." : f.address.length > ADDRESS_MAX ? `Max ${ADDRESS_MAX} characters.` : undefined,
        courseIds: selected.size ? undefined : "Choose at least one course.",
      }
    : {
        name: nameErr(f.name),
        mobile: mobileIssue(f.mobile) ?? undefined,
        email: emailSchema.safeParse(f.email).success ? undefined : "Enter a valid email address.",
        address: f.address.length > ADDRESS_MAX ? `Max ${ADDRESS_MAX} characters.` : undefined,
      };
  const err = (k: string) => serverErrors[k] || errors[k];
  const issueCount = Object.values(errors).filter(Boolean).length;

  const payload = () =>
    student
      ? { studentName: f.studentName.trim(), grade: f.grade, fatherName: f.fatherName.trim(), motherName: f.motherName.trim(), mobile: f.mobile.trim(), email: f.email.trim(), address: f.address.trim(), courseIds: [...selected], learningMode: f.learningMode, sessionType: session }
      : { name: f.name.trim(), mobile: f.mobile.trim(), email: f.email.trim(), address: f.address.trim(), subject: f.subject.trim() };

  const afterDecision = () => router.push(r.nextId ? `/admin/approvals/registrations/${r.nextId}` : `/admin/approvals?tab=${student ? "students" : "staff"}`);

  const approve = () =>
    run(() => approveRegistration(r.id, payload(), photo?.id), {
      success: student ? `${f.studentName} is now active. The parent has been emailed.` : `${f.name} was approved. Login details were emailed.`,
      onOk: afterDecision,
      onError: (e) => setServerErrors(e.fields ?? {}),
    });

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast("error", "Photo must be 2 MB or smaller.");
    const fd = new FormData();
    fd.set("file", file);
    fd.set("purpose", "STUDENT_PHOTO");
    const res = await uploadFile(fd);
    if (res.ok) setPhoto({ id: res.data.id, size: res.data.size });
    else toast("error", res.error.message);
  };
  const photoId = photo?.id ?? r.photoFileId;
  const display = student ? f.studentName : f.name;

  const text = (k: keyof typeof f, label: string, opts: { hint?: string; required?: boolean; type?: string; inputMode?: "numeric" | "email" } = {}) => (
    <Field label={label} required={opts.required ?? true} error={err(k)} hint={opts.hint}>
      {(id) => (
        <input
          id={id}
          type={opts.type ?? "text"}
          inputMode={opts.inputMode}
          value={f[k] as string}
          disabled={decided}
          aria-invalid={!!err(k) || undefined}
          onChange={(e) => set(k, e.target.value as never)}
          className={inputCls}
        />
      )}
    </Field>
  );

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-3">
        <Card
          title={student ? "Student" : "Staff member"}
          action={
            <span className={cx("text-[12.5px] underline underline-offset-2", decided ? "text-muted" : "text-sun-deep")}>
              {r.status === "APPROVED" ? "Approved" : r.status === "REJECTED" ? "Rejected" : r.status === "INFO_REQUESTED" ? "More info requested" : "Pending"} · submitted {ago(r.submittedAt)}
            </span>
          }
        >
          <div className="mb-4 flex flex-wrap items-center gap-4">
            {photoId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/files/${photoId}`} alt="" className="size-[72px] rounded-2xl object-cover" />
            ) : (
              <span className="grid size-[72px] place-items-center rounded-2xl bg-sage text-[24px] font-semibold">{initials(display || "?")}</span>
            )}
            {student && (
              <div>
                <button type="button" disabled={decided} onClick={() => fileRef.current?.click()} className={btn.white}>
                  {photoId ? "Replace photo" : "Add photo"}
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
                <p className="mt-1.5 text-[12px] text-muted">JPG/PNG · max 2 MB{photo ? ` · ${(photo.size / 1024 / 1024).toFixed(1)} MB uploaded` : ""}</p>
              </div>
            )}
          </div>
          {student ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {text("studentName", "Student name", { hint: "Letters, . and spaces · max 100" })}
              <Field label="Grade" required error={err("grade")}>
                {(id) => (
                  <SelectBox
                    id={id}
                    value={f.grade}
                    disabled={decided}
                    invalid={!!err("grade")}
                    placeholder=""
                    onChange={(v) => setF((x) => ({ ...x, grade: v as Grade, courseIds: [] }))}
                    options={GRADES.map((g) => ({ value: g, label: gradeLabel(g) }))}
                  />
                )}
              </Field>
              {text("fatherName", "Father's name")}
              {text("motherName", "Mother's name")}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {text("name", "Full name", { hint: "Letters, . and spaces · max 100" })}
              {text("subject", "Subject", { required: false })}
            </div>
          )}
        </Card>

        {student && (
          <Card title="Student details">
            {(() => {
              const dob = str(r.data.dateOfBirth);
              const age = dob ? ageOn(dob) : null;
              const cardId = str(r.data.schoolIdCardFileId);
              return (
                <>
                  <dl className="divide-y divide-line text-[13.5px]">
                    <Row k="Date of birth" v={dob ? `${dob}${age !== null ? ` · ${age} years` : ""}` : "Not given"} />
                    <Row k="Gender" v={isGender(r.data.gender) ? genderLabel[r.data.gender] : "Not given"} />
                    <Row k="School" v={str(r.data.schoolName) || "Not given"} />
                  </dl>
                  <div className="mt-4">
                    {cardId ? (
                      <a href={`/api/files/${cardId}`} target="_blank" rel="noreferrer" className={btn.white}>
                        View school ID card
                      </a>
                    ) : (
                      <p className="text-[13px] text-muted">No school ID card was sent with this registration.</p>
                    )}
                  </div>
                </>
              );
            })()}
          </Card>
        )}

        <Card title="Contact">
          <div className="grid gap-4 sm:grid-cols-2">
            {text("mobile", "Primary mobile", { inputMode: "numeric" })}
            {text("email", "Email", { type: "email", inputMode: "email", hint: "Login details are sent here" })}
            <Field label="Residential address" required={student} error={err("address")} hint={`Max ${ADDRESS_MAX} characters`} className="sm:col-span-2">
              {(id) => (
                <textarea
                  id={id}
                  rows={3}
                  value={f.address}
                  disabled={decided}
                  maxLength={ADDRESS_MAX + 20}
                  aria-invalid={!!err("address") || undefined}
                  onChange={(e) => set("address", e.target.value)}
                  className={textareaCls}
                />
              )}
            </Field>
          </div>
        </Card>

        {student && (
          <Card title={`Courses for ${f.grade ? gradeLabel(f.grade as Grade) : "…"}`} action={mandatory.length ? <span className="text-[12px] text-muted">{mandatory[0]!.name} is mandatory and on by default</span> : null}>
            {!f.grade ? (
              <p className="text-[13.5px] text-muted">Choose a grade first.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {gradeCourses.map((c) => {
                  const isMand = mandatory.some((m) => m.id === c.id);
                  if (isMand)
                    return (
                      <span key={c.id} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13.5px] text-white">
                        {c.name}
                        <span className="text-[11px] text-white/70">· required</span>
                      </span>
                    );
                  return (
                    <Chip
                      key={c.id}
                      selected={selected.has(c.id)}
                      disabled={decided}
                      onClick={() => set("courseIds", selected.has(c.id) ? f.courseIds.filter((x) => x !== c.id) : [...f.courseIds, c.id])}
                    >
                      {c.name}
                    </Chip>
                  );
                })}
                {!gradeCourses.length && <p className="text-[13.5px] text-muted">No published courses for this grade yet.</p>}
              </div>
            )}
            {err("courseIds") && <p className="mt-2 text-[12px] text-danger">{err("courseIds")}</p>}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[12.5px] text-ink-soft">Learning mode</p>
                <Segmented label="Learning mode" disabled={decided} value={f.learningMode} onChange={(v) => set("learningMode", v)} options={[{ value: "GROUP", label: "Group" }, { value: "ONE_ON_ONE", label: "One-on-one" }]} />
              </div>
              <div>
                <p className="mb-1.5 text-[12.5px] text-ink-soft">Session type</p>
                <Segmented
                  label="Session type"
                  disabled={decided || f.learningMode === "ONE_ON_ONE"}
                  value={session}
                  onChange={(v) => set("sessionType", v)}
                  options={[{ value: "OFFLINE", label: "Offline" }, { value: "ONLINE", label: "Online" }]}
                />
                {f.learningMode === "ONE_ON_ONE" && <p className="mt-1.5 text-[12px] text-muted">One-on-one is always online.</p>}
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="grid content-start gap-3 lg:sticky lg:top-4">
        <Card title="Summary">
          <dl className="divide-y divide-line text-[13.5px]">
            {student ? (
              <>
                <Row k="Monthly fee" v={formatINR(monthly)} />
                <Row k="Courses" v={String(selected.size)} />
                <Row k="Mode" v={`${sessionTypeLabel(session)} · ${learningModeLabel(f.learningMode)}`} />
              </>
            ) : (
              <>
                <Row k="Role" v="Teacher" />
                <Row k="Subject" v={f.subject || "—"} />
              </>
            )}
            <Row k="Duplicate check" v={r.duplicate.match ? <Pill tone="red">{r.duplicate.label}</Pill> : <Pill tone="green">No match</Pill>} />
            <Row k="Validation" v={issueCount ? <Pill tone="red">{issueCount} issue{issueCount > 1 ? "s" : ""}</Pill> : <Pill tone="green">All good</Pill>} />
          </dl>
        </Card>
        <section className="rounded-[18px] bg-ink p-5 text-white">
          <h2 className="text-[15.5px]">Decision</h2>
          <p className="mt-1 text-[12.5px] text-white/75">{decided ? `This registration was ${r.status === "APPROVED" ? "approved" : "rejected"}.` : "Edits are saved with the approval and logged in the audit trail."}</p>
          {r.decisionNote && <p className="mt-2 rounded-xl bg-white/10 p-3 text-[12.5px] text-white/85">{r.decisionNote}</p>}
          {!decided && (
            <div className="mt-4 grid gap-2.5">
              <button type="button" className={cx(btn.sun, "w-full")} disabled={pending || issueCount > 0} onClick={() => void approve()} title={issueCount ? "Fix the highlighted fields first" : undefined}>
                {pending && <span className="spinner" />}
                Approve &amp; send login
              </button>
              <button type="button" className={cx(btn.white, "w-full")} disabled={pending} onClick={() => setDialog("info")}>
                Request more info
              </button>
              <button type="button" className={cx(btn.danger, "w-full")} disabled={pending} onClick={() => setDialog("reject")}>
                Reject
              </button>
              {issueCount > 0 && <p className="text-[12px] text-sun">Fix the {issueCount} highlighted field{issueCount > 1 ? "s" : ""} to approve.</p>}
            </div>
          )}
        </section>
      </div>

      <Dialog open={!!dialog} onClose={() => setDialog(null)} title={dialog === "info" ? "Request more information" : "Reject registration"}>
        <p className="mb-3 text-[13.5px] text-ink-soft">{dialog === "info" ? "The parent gets this message by email and in the app." : "Optional: tell them why. They're notified by email."}</p>
        <textarea rows={4} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={textareaCls} placeholder={dialog === "info" ? "e.g. Please share the correct 10-digit mobile number." : "Reason (optional)"} />
        <p className="mt-1 text-right text-[12px] text-muted">{note.length} / 500</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={btn.white} onClick={() => setDialog(null)}>
            Cancel
          </button>
          <button
            type="button"
            className={dialog === "reject" ? btn.danger : btn.dark}
            disabled={pending || (dialog === "info" && !note.trim())}
            onClick={() =>
              void run(() => (dialog === "info" ? requestRegistrationInfo(r.id, note.trim()) : rejectRegistration(r.id, note.trim())), {
                success: dialog === "info" ? "Request sent to the parent." : "Registration rejected.",
                onOk: () => (setDialog(null), afterDecision()),
              })
            }
          >
            {pending && <span className="spinner" />}
            {dialog === "info" ? "Send request" : "Reject"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <dt className="text-ink-soft">{k}</dt>
      <dd className="text-right text-ink">{v}</dd>
    </div>
  );
}
