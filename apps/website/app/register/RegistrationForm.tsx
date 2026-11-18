"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowUpRight, Check } from "@/components/icons";
import { cx } from "@/components/ui";
import {
  ADDRESS_MAX,
  ageOn,
  fieldErrorsOf,
  GENDER_OPTIONS,
  ID_CARD_MAX_BYTES,
  ID_CARD_TYPES,
  LEARNING_OPTIONS,
  NAME_MAX,
  REG_GRADES,
  registrationSchema,
  SCHOOL_MAX,
  SESSION_OPTIONS,
  STUDENT_AGE_MAX,
  STUDENT_AGE_MIN,
} from "@/lib/registration";

type Values = {
  studentName: string;
  grade: string;
  fatherName: string;
  motherName: string;
  mobile: string;
  email: string;
  schoolName: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  learningMode: "GROUP" | "ONE_ON_ONE";
  sessionType: "OFFLINE" | "ONLINE";
};

type Course = { id: string; name: string; monthlyFee: number; isMandatory: boolean; subjects: string[] };

const MANDATORY_GRADES = ["GRADE_9", "GRADE_10"];
const initial: Values = {
  studentName: "",
  grade: "",
  fatherName: "",
  motherName: "",
  mobile: "",
  email: "",
  schoolName: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  learningMode: "GROUP",
  sessionType: "OFFLINE",
};

const field =
  "w-full border border-line bg-paper px-5 py-3.5 text-base text-ink placeholder:text-ghost sm:text-sm outline-none transition-colors focus:border-brand focus:bg-white aria-[invalid=true]:border-red-500";
const label = "mb-2 block text-sm text-ink";
const sectionTitle = "text-xs font-medium uppercase tracking-[0.14em] text-muted";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-5">
      <legend className={cx(sectionTitle, "mb-1")}>{title}</legend>
      {children}
    </fieldset>
  );
}

function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 pl-4 text-xs text-red-600">
      {message}
    </p>
  );
}

function Choice({ name, options, value, onChange, disabled, invalid }: { name: string; options: readonly { value: string; label: string }[]; value: string; onChange: (v: string) => void; disabled?: boolean; invalid?: boolean }) {
  return (
    <div role="radiogroup" aria-label={name} aria-invalid={invalid || undefined} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cx(
              "h-11 rounded-full border px-5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              on ? "border-ink bg-ink text-white" : "border-line bg-paper text-ink-soft hover:border-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function RegistrationForm() {
  const [v, setV] = useState<Values>(initial);
  // Courses are kept with the grade they were loaded for, so a stale list never shows.
  const [loaded, setLoaded] = useState<{ grade: string; courses: Course[] } | null>(null);
  const [failedGrade, setFailedGrade] = useState("");
  const courses = v.grade && loaded?.grade === v.grade ? loaded.courses : [];
  const coursesLoading = !!v.grade && loaded?.grade !== v.grade && failedGrade !== v.grade;
  const coursesError = !!v.grade && failedGrade === v.grade;
  const [picked, setPicked] = useState<string[]>([]);
  const [card, setCard] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [code, setCode] = useState("");

  const set = <K extends keyof Values>(k: K, val: Values[K]) => {
    setV((x) => ({ ...x, [k]: val }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  // Courses offered for the chosen grade. Mandatory courses (Grades 9–10) are always included.
  useEffect(() => {
    if (!v.grade) return;
    const grade = v.grade;
    let cancelled = false;
    fetch(`/api/registration/courses?grade=${encodeURIComponent(grade)}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ courses: Course[] }>) : Promise.reject(new Error("courses"))))
      .then((d) => {
        if (cancelled) return;
        setLoaded({ grade, courses: d.courses });
        setFailedGrade("");
        setPicked(MANDATORY_GRADES.includes(grade) ? d.courses.filter((c) => c.isMandatory).map((c) => c.id) : []);
      })
      .catch(() => {
        if (!cancelled) setFailedGrade(grade);
      });
    return () => {
      cancelled = true;
    };
  }, [v.grade]);

  const isLocked = (c: Course) => c.isMandatory && MANDATORY_GRADES.includes(v.grade);
  const toggleCourse = (c: Course) => {
    if (isLocked(c)) return;
    setPicked((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]));
    setErrors((e) => ({ ...e, courseIds: "" }));
  };
  const monthly = courses.filter((c) => picked.includes(c.id)).reduce((t, c) => t + c.monthlyFee, 0);
  const age = v.dateOfBirth ? ageOn(v.dateOfBirth) : null;

  function pickFile(file: File | undefined) {
    if (!file) return setCard(null);
    setCard(file);
    setErrors((e) => ({ ...e, schoolIdCardFileId: "" }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;

    const parsed = registrationSchema.safeParse({ ...v, courseIds: picked });
    const next: Record<string, string> = parsed.success ? {} : fieldErrorsOf(parsed.error);
    if (!card) next.schoolIdCardFileId = "Upload a photo of the school ID card.";
    else if (card.size > ID_CARD_MAX_BYTES) next.schoolIdCardFileId = "The photo must be 5 MB or smaller.";
    else if (!(ID_CARD_TYPES as readonly string[]).includes(card.type)) next.schoolIdCardFileId = "Upload a JPG, PNG, WebP or PDF.";

    if (Object.keys(next).length) {
      setErrors(next);
      setFormError("Please check the highlighted fields.");
      document.getElementById(Object.keys(next)[0]!)?.focus();
      return;
    }

    setErrors({});
    setFormError("");
    setStatus("sending");
    const fd = new FormData();
    for (const [k, val] of Object.entries(v)) fd.append(k, val);
    for (const id of picked) fd.append("courseIds", id);
    fd.append("schoolIdCard", card!);
    fd.append("company", String(new FormData(e.currentTarget).get("company") ?? ""));

    try {
      const res = await fetch("/api/registration", { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as { code?: string; error?: string; fieldErrors?: Record<string, string> };
      if (!res.ok) {
        setErrors(body.fieldErrors ?? {});
        setFormError(body.error ?? "Something went wrong. Please try again.");
        setStatus("idle");
        return;
      }
      setCode(body.code ?? "");
      setStatus("sent");
    } catch {
      setFormError("Network error. Please check your connection and try again.");
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="flex min-h-[460px] flex-col items-center justify-center text-center">
        <span className="grid size-14 place-items-center rounded-full bg-sun text-ink">
          <Check className="size-7" strokeWidth={2.4} />
        </span>
        <h2 className="mt-6 text-2xl font-medium text-ink">Registration received</h2>
        {code && (
          <p className="mt-3 rounded-full bg-mist px-4 py-1.5 text-sm text-ink-soft">
            Reference <strong className="font-semibold text-ink">{code}</strong>
          </p>
        )}
        <p className="mt-4 max-w-sm text-sm text-ink-soft">
          The school will review the details and your ID card. Once approved, login details are emailed to the parent’s email address.
        </p>
        <button
          type="button"
          onClick={() => {
            setV(initial);
            setPicked([]);
            setCard(null);
            setLoaded(null);
            setStatus("idle");
            setCode("");
          }}
          className="btn-gloss btn-gloss-light mt-8 rounded-full bg-mist px-6 py-3 text-sm text-ink hover:bg-sun"
        >
          Register another child
        </button>
      </div>
    );
  }

  const errText = (k: string) => <ErrorText id={`${k}-error`} message={errors[k]} />;
  const invalid = (k: string) => !!errors[k] || undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-9" aria-describedby={formError ? "form-error" : undefined}>
      <h2 className="text-2xl font-normal text-ink">Student registration</h2>

      <Section title="About the student">
        <div className="grid gap-x-3 gap-y-5 sm:grid-cols-2">
          <div>
            <label htmlFor="studentName" className={label}>Student’s full name</label>
            <input id="studentName" name="studentName" value={v.studentName} maxLength={NAME_MAX} onChange={(e) => set("studentName", e.target.value)} placeholder="As on the school record" className={cx(field, "rounded-full")} aria-invalid={invalid("studentName")} aria-describedby={errors.studentName ? "studentName-error" : undefined} />
            {errText("studentName")}
          </div>
          <div>
            <label htmlFor="grade" className={label}>Grade</label>
            <select
              id="grade"
              name="grade"
              value={v.grade}
              onChange={(e) => {
                set("grade", e.target.value);
                setPicked([]);
              }}
              aria-invalid={invalid("grade")}
              className={cx(field, "rounded-full")}
            >
              <option value="">Select the grade</option>
              {REG_GRADES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
            {errText("grade")}
          </div>
          <div>
            <label htmlFor="dateOfBirth" className={label}>Date of birth</label>
            <input id="dateOfBirth" name="dateOfBirth" type="date" value={v.dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set("dateOfBirth", e.target.value)} className={cx(field, "rounded-full")} aria-invalid={invalid("dateOfBirth")} />
            <p className="mt-1.5 pl-4 text-xs text-muted">{age !== null && age >= 0 ? `Age ${age} years` : `Ages ${STUDENT_AGE_MIN}–${STUDENT_AGE_MAX}`}</p>
            {errText("dateOfBirth")}
          </div>
          <div>
            <span className={label}>Gender</span>
            <Choice name="Gender" options={GENDER_OPTIONS} value={v.gender} onChange={(val) => set("gender", val)} invalid={!!errors.gender} />
            {errText("gender")}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="schoolName" className={label}>School</label>
            <input id="schoolName" name="schoolName" value={v.schoolName} maxLength={SCHOOL_MAX} onChange={(e) => set("schoolName", e.target.value)} placeholder="Name of the school the student attends" className={cx(field, "rounded-full")} aria-invalid={invalid("schoolName")} />
            {errText("schoolName")}
          </div>
        </div>
      </Section>

      <Section title="Parents">
        <div className="grid gap-x-3 gap-y-5 sm:grid-cols-2">
          <div>
            <label htmlFor="fatherName" className={label}>Father’s name</label>
            <input id="fatherName" name="fatherName" value={v.fatherName} maxLength={NAME_MAX} onChange={(e) => set("fatherName", e.target.value)} className={cx(field, "rounded-full")} aria-invalid={invalid("fatherName")} />
            {errText("fatherName")}
          </div>
          <div>
            <label htmlFor="motherName" className={label}>Mother’s name</label>
            <input id="motherName" name="motherName" value={v.motherName} maxLength={NAME_MAX} onChange={(e) => set("motherName", e.target.value)} className={cx(field, "rounded-full")} aria-invalid={invalid("motherName")} />
            {errText("motherName")}
          </div>
          <div>
            <label htmlFor="mobile" className={label}>Parent’s mobile number</label>
            <input
              id="mobile"
              name="mobile"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              value={v.mobile}
              placeholder="10-digit number"
              onChange={(e) => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
              className={cx(field, "rounded-full")}
              aria-invalid={invalid("mobile")}
            />
            {errText("mobile")}
          </div>
          <div>
            <label htmlFor="email" className={label}>Parent’s email</label>
            <input id="email" name="email" type="email" inputMode="email" autoComplete="email" value={v.email} onChange={(e) => set("email", e.target.value)} placeholder="Login details are sent here" className={cx(field, "rounded-full")} aria-invalid={invalid("email")} />
            {errText("email")}
          </div>
        </div>
      </Section>

      <Section title="Address">
        <div>
          <label htmlFor="address" className={label}>Residential address</label>
          <textarea id="address" name="address" rows={3} maxLength={ADDRESS_MAX + 20} value={v.address} onChange={(e) => set("address", e.target.value)} className={cx(field, "rounded-2xl")} aria-invalid={invalid("address")} />
          <p className="mt-1.5 pl-4 text-xs text-muted">Up to {ADDRESS_MAX} characters</p>
          {errText("address")}
        </div>
      </Section>

      <Section title="Courses">
        <div>
          <p className={label}>Courses for the grade</p>
          {!v.grade ? (
            <p className="rounded-2xl bg-mist px-5 py-4 text-sm text-ink-soft">Choose the grade first to see the courses.</p>
          ) : coursesError ? (
            <p className="rounded-2xl bg-mist px-5 py-4 text-sm text-red-600">We couldn’t load the courses. Please refresh and try again.</p>
          ) : (
            <details className="group relative">
              <summary
                className={cx(
                  field,
                  "flex cursor-pointer list-none items-center justify-between rounded-full [&::-webkit-details-marker]:hidden",
                  errors.courseIds && "border-red-500",
                )}
              >
                <span className={picked.length ? "text-ink" : "text-ghost"}>
                  {coursesLoading ? "Loading courses…" : picked.length ?`${picked.length} course${picked.length > 1 ? "s" : ""} selected` : "Choose courses"}
                </span>
                <span aria-hidden className="text-ink-soft transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="mt-2 grid max-h-[320px] gap-1 overflow-y-auto rounded-[1.25rem] border border-line bg-white p-2">
                {courses.length === 0 && !coursesLoading &&<p className="px-4 py-3 text-sm text-ink-soft">No courses are open for this grade yet.</p>}
                {courses.map((c) => {
                  const locked = isLocked(c);
                  const checked = picked.includes(c.id);
                  return (
                    <label key={c.id} className={cx("flex cursor-pointer items-center justify-between gap-4 rounded-xl px-4 py-3 hover:bg-mist", locked && "cursor-default")}>
                      <span className="flex items-center gap-3">
                        <input type="checkbox" checked={checked} disabled={locked} onChange={() => toggleCourse(c)} className="size-4 accent-ink" />
                        <span className="text-sm text-ink">
                          {c.name}
                          {locked && <span className="ml-2 text-[11px] text-muted">required</span>}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-ink-soft">{inr(c.monthlyFee)}/mo</span>
                    </label>
                  );
                })}
              </div>
            </details>
          )}
          {picked.length > 0 && <p className="mt-2 pl-4 text-xs text-ink-soft">Monthly total {inr(monthly)} · final fees are confirmed by the school</p>}
          {errText("courseIds")}
        </div>
      </Section>

      <Section title="How the student learns">
        <div className="grid gap-x-3 gap-y-5 sm:grid-cols-2">
          <div>
            <span className={label}>Learning mode</span>
            <Choice
              name="Learning mode"
              options={LEARNING_OPTIONS}
              value={v.learningMode}
              onChange={(val) => {
                const mode = val as Values["learningMode"];
                setV((x) => ({ ...x, learningMode: mode, sessionType: mode === "ONE_ON_ONE" ? "ONLINE" : x.sessionType }));
              }}
            />
          </div>
          <div>
            <span className={label}>Session type</span>
            <Choice name="Session type" options={SESSION_OPTIONS} value={v.sessionType} onChange={(val) => set("sessionType", val as Values["sessionType"])} disabled={v.learningMode === "ONE_ON_ONE"} />
            {v.learningMode === "ONE_ON_ONE" && <p className="mt-1.5 pl-4 text-xs text-muted">One-on-one classes are always online.</p>}
          </div>
        </div>
      </Section>

      <Section title="School ID card">
        <div>
          <label htmlFor="schoolIdCardFileId" className={cx(field, "flex cursor-pointer flex-col items-start gap-1 rounded-[1.25rem] border-dashed")} aria-invalid={invalid("schoolIdCardFileId")}>
            <span className="text-sm text-ink">{card ? card.name : "Choose a photo of the school ID card"}</span>
            <span className="text-xs text-muted">{card ? `${(card.size / 1024 / 1024).toFixed(1)} MB` : "JPG, PNG, WebP or PDF · up to 5 MB"}</span>
          </label>
          <input id="schoolIdCardFileId" name="schoolIdCard" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
          {errText("schoolIdCardFileId")}
        </div>
      </Section>

      {/* Honeypot: real visitors never see or fill this. */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      {formError && (
        <p id="form-error" role="alert" className="rounded-2xl bg-red-50 px-5 py-3 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted">Your details are used only for admissions. The school reviews every registration before it is confirmed.</p>
        <button type="submit" disabled={status === "sending"} className="btn-gloss inline-flex items-center justify-center gap-2 rounded-full bg-ink px-8 py-4 text-sm text-white hover:bg-brand disabled:opacity-60">
          {status === "sending" ? "Sending…" : "Submit registration"}
          {status !== "sending" && <ArrowUpRight className="size-4" />}
        </button>
      </div>
    </form>
  );
}
