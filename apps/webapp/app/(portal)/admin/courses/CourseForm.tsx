"use client";

import { COURSE_CATEGORIES, courseCategoryLabel, GRADES, gradeLabel, gradesAllowedFor, type CourseCategory, type Grade } from "@dd/shared/domain";
import { useState } from "react";
import { IPlus } from "@/components/portal/icons";
import { ActionButton, Chip, Dialog, Field, SelectBox, Toggle, useAction } from "@/components/ui/client";
import { btn, inputCls } from "@/components/ui/kit";
import { archiveCourse, saveCourse } from "@/lib/actions";

export type CourseRow = { id: string; name: string; category: string; grades: string[]; subjects: string[]; monthlyFee: number; isMandatory: boolean; published: boolean };

function CourseDialog({ open, onClose, course }: { open: boolean; onClose: () => void; course?: CourseRow }) {
  const [f, setF] = useState(() => ({
    name: course?.name ?? "",
    category: (course?.category ?? "SUBJECT") as CourseCategory,
    grades: new Set<string>(course?.grades ?? []),
    subjects: course?.subjects.join(", ") ?? "",
    monthlyFee: String(course?.monthlyFee ?? ""),
    isMandatory: course?.isMandatory ?? false,
    published: course?.published ?? true,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useAction();
  const allowed = gradesAllowedFor(f.category);
  const toggleGrade = (g: string) => {
    const n = new Set(f.grades);
    if (n.has(g)) n.delete(g);
    else n.add(g);
    setF({ ...f, grades: n });
  };
  return (
    <Dialog open={open} onClose={onClose} title={course ? `Edit ${course.name}` : "New course"} wide>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const body = {
            name: f.name.trim(),
            category: f.category,
            grades: [...f.grades].filter((g) => allowed.includes(g as Grade)),
            subjects: f.subjects.split(",").map((s) => s.trim()).filter(Boolean),
            monthlyFee: Number(f.monthlyFee),
            isMandatory: f.category === "SUBJECT" && f.isMandatory,
            published: f.published,
          };
          void run(() => saveCourse(course?.id ?? null, body), { success: course ? "Course saved." : "Course created.", onOk: onClose, onError: (x) => setErrors(x.fields ?? {}) });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Field label="Course name" required error={errors.name} hint="Max 100 characters">
            {(id) => <input id={id} required maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />}
          </Field>
          <Field label="Type" required>
            {(id) => (
              <SelectBox id={id} value={f.category} onChange={(v) => setF({ ...f, category: v as CourseCategory })} options={COURSE_CATEGORIES.map((c) => ({ value: c, label: courseCategoryLabel[c] }))} />
            )}
          </Field>
        </div>
        <div>
          <p className="mb-2 text-[12.5px] text-ink-soft">
            Eligible grades <span className="text-danger">*</span>
            <span className="ml-2 text-muted">{f.category === "PHONICS" ? "Phonics: Pre-KG – Grade 2 only" : f.category === "SUBJECT" ? "Subjects: Grade 9 – 12" : f.category === "OTHER" ? "" : "Pre-KG – Grade 8"}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {GRADES.map((g) => (
              <Chip key={g} selected={f.grades.has(g) && allowed.includes(g)} disabled={!allowed.includes(g)} onClick={() => toggleGrade(g)}>
                {gradeLabel(g)}
              </Chip>
            ))}
          </div>
          {errors.grades && <p className="mt-1.5 text-[12px] text-danger">{errors.grades}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Monthly fee (₹)" required error={errors.monthlyFee}>
            {(id) => <input id={id} required inputMode="numeric" value={f.monthlyFee} onChange={(e) => setF({ ...f, monthlyFee: e.target.value.replace(/\D/g, "") })} className={inputCls} />}
          </Field>
          <Field label="Subjects inside (optional)" hint="Comma-separated, e.g. Maths, Science. Teachers can be assigned per subject.">
            {(id) => <input id={id} value={f.subjects} onChange={(e) => setF({ ...f, subjects: e.target.value })} className={inputCls} />}
          </Field>
        </div>
        <div className="grid gap-3 rounded-2xl bg-frame p-4">
          <label className="flex items-center justify-between gap-3 text-[14px]">
            <span>
              Published
              <span className="block text-[12px] text-muted">Shown to parents in Course Enrolment</span>
            </span>
            <Toggle checked={f.published} label="Published" onChange={(v) => setF({ ...f, published: v })} />
          </label>
          {f.category === "SUBJECT" && (
            <label className="flex items-center justify-between gap-3 text-[14px]">
              <span>
                Mandatory for Grades 9–10
                <span className="block text-[12px] text-muted">Always included and on by default (Maths & Science)</span>
              </span>
              <Toggle checked={f.isMandatory} label="Mandatory" onChange={(v) => setF({ ...f, isMandatory: v })} />
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className={btn.white} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={btn.dark} disabled={pending || !f.name.trim() || !f.grades.size || f.monthlyFee === ""}>
            {pending && <span className="spinner" />}
            {course ? "Save course" : "Create course"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function CourseDialogButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={btn.dark} onClick={() => setOpen(true)}>
        <IPlus className="size-4 text-sun" />
        New course
      </button>
      {open && <CourseDialog open={open} onClose={() => setOpen(false)} />}
    </>
  );
}

export function CourseActions({ course, archived, students }: { course: CourseRow; archived: boolean; students: number }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-flex gap-2">
      {!archived && (
        <button type="button" className={btn.whiteSm} onClick={() => setOpen(true)}>
          Edit
        </button>
      )}
      <ActionButton
        className={btn.whiteSm}
        disabled={!archived && students > 0}
        title={!archived && students > 0 ? "Students are enrolled" : undefined}
        action={() => archiveCourse(course.id, !archived)}
        success={archived ? "Course restored." : "Course archived."}
        confirm={archived ? undefined : { title: `Archive ${course.name}?`, body: "It's hidden from enrolment. You can restore it later.", confirmLabel: "Archive" }}
      >
        {archived ? "Restore" : "Archive"}
      </ActionButton>
      {open && <CourseDialog open={open} onClose={() => setOpen(false)} course={course} />}
    </span>
  );
}
