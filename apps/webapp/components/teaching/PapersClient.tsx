"use client";

import { GRADES, gradeLabel, type Grade } from "@dd/shared/domain";
import { useEffect, useState } from "react";
import { ITrash } from "@/components/portal/icons";
import { ActionButton, Dialog, Field, SelectBox, useAction } from "@/components/ui/client";
import { btn, inputCls } from "@/components/ui/kit";
import { activatePaper, classStudents, deactivatePaper, deletePaper, uploadPaper } from "@/lib/actions";
import type { ClassInfo, CourseLite } from "@/lib/portal";
import { UploadField, type Uploaded } from "./UploadField";

export function PaperActions({ id, fileId, status, admin, mine, title }: { id: string; fileId: string | null; status: string; admin: boolean; mine: boolean; title: string }) {
  return (
    <span className="flex items-center justify-end gap-2">
      {fileId && (
        <a href={`/api/files/${fileId}`} target="_blank" rel="noopener noreferrer" className={btn.whiteSm}>
          Preview
        </a>
      )}
      {admin && status === "AWAITING" && (
        <ActionButton className={btn.darkSm} action={() => activatePaper(id)} success="Activated. Parents can now open it.">
          Activate
        </ActionButton>
      )}
      {admin && status === "ACTIVE" && (
        <ActionButton className={btn.whiteSm} action={() => deactivatePaper(id)} success="Deactivated. Parents can't open it now." confirm={{ title: "Deactivate this paper?", body: "Parents won't see it until it's activated again.", confirmLabel: "Deactivate" }}>
          Deactivate
        </ActionButton>
      )}
      {status !== "DELETED" && (admin || (mine && status === "AWAITING")) && (
        <ActionButton
          className={btn.iconDanger}
          title={`Delete ${title}`}
          action={() => deletePaper(id)}
          success="Paper deleted. Its link no longer works."
          confirm={{ title: "Delete this paper?", body: "It disappears for parents and staff, and any shared link stops working. This can't be undone.", confirmLabel: "Delete", danger: true }}
        >
          <ITrash className="size-4" />
        </ActionButton>
      )}
    </span>
  );
}

/** "Upload paper": file + title + class (+ optional student). */
export function UploadPaperButton({ classes, admin, courses }: { classes: ClassInfo[]; admin: boolean; courses: CourseLite[] }) {
  // Admin may pick any grade + course + subject; staff pick one of their classes.
  const options = admin
    ? courses.flatMap((c) => c.grades.flatMap((g) => (c.subjects.length ? c.subjects : [""]).map((s) => ({ key: `${g}.${c.id}.${s}`, label: `${gradeLabel(g)} · ${s || c.name}`, grade: g, courseId: c.id, subject: s }))))
    : classes.map((c) => ({ key: c.key, label: c.label, grade: c.grade, courseId: c.courseId, subject: c.subject }));
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<Uploaded | null>(null);
  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState<Grade | "">("");
  const [key, setKey] = useState("");
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [pending, run] = useAction();
  const grades = GRADES.filter((g) => options.some((o) => o.grade === g));
  const inGrade = options.filter((o) => o.grade === grade);
  const cls = options.find((o) => o.key === key);
  const shownStudents = cls ? students : [];
  useEffect(() => {
    if (!cls) return;
    let live = true;
    void classStudents(cls.grade, cls.courseId).then((r) => live && setStudents(r.ok ? r.data.students : []));
    return () => {
      live = false;
    };
  }, [cls?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <button type="button" className={btn.dark} onClick={() => setOpen(true)} disabled={!options.length}>
        Upload paper
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Upload question paper">
        <div className="grid gap-4">
          <UploadField purpose="QUESTION_PAPER" accept=".pdf,.doc,.docx,image/*" maxMb={10} title="Add the paper" hint="PDF, Word or photo · up to 10 MB" value={file} onChange={setFile} />
          <Field label="Title" required>
            {(id) => <input id={id} maxLength={120} placeholder="e.g. Unit test 3" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Grade" required>
              {(id) => <SelectBox id={id} value={grade} placeholder="Choose…" onChange={(v) => (setGrade(v as Grade), setKey(""), setStudentId(""))} options={grades.map((g) => ({ value: g, label: gradeLabel(g) }))} />}
            </Field>
            <Field label="Subject" required>
              {(id) => <SelectBox id={id} value={key} disabled={!grade} placeholder="Choose…" onChange={(v) => (setKey(v), setStudentId(""))} options={inGrade.map((o) => ({ value: o.key, label: o.label.split(" · ")[1] ?? o.label }))} />}
            </Field>
          </div>
          <Field label="For" hint="Leave as the whole class, or pick one student.">
            {(id) => <SelectBox id={id} value={studentId} disabled={!cls} onChange={setStudentId} options={[{ value: "", label: "Whole class" }, ...shownStudents.map((s) => ({ value: s.id, label: s.name }))]} />}
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className={btn.white} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={btn.dark}
              disabled={pending || !file || !title.trim() || !cls}
              onClick={() =>
                void run(() => uploadPaper({ title: title.trim(), grade: cls!.grade, courseId: cls!.courseId, subject: cls!.subject, studentId: studentId || undefined, fileId: file!.id }), {
                  success: "Uploaded. It stays hidden until admin activates it.",
                  onOk: () => (setOpen(false), setFile(null), setTitle(""), setKey("")),
                })
              }
            >
              {pending && <span className="spinner" />}
              Upload
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
