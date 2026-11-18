"use client";

import { addDays } from "@/lib/date-utils";
import { istDate } from "@dd/shared/domain";
import { useState } from "react";
import { IImage } from "@/components/portal/icons";
import { ActionButton, Dialog, Field, useAction } from "@/components/ui/client";
import { btn, Card, cx, inputCls, Pill, textareaCls } from "@/components/ui/kit";
import { createHomework, deleteHomework, reviewSubmission } from "@/lib/actions";
import type { ClassOpt } from "@/lib/portal";

export type HomeworkDetail = {
  homework: { id: string; title: string; details: string | null; givenOn: string; dueOn: string; classLabel: string };
  students: {
    studentId: string;
    name: string;
    initials: string;
    submission: { id: string; status: "SUBMITTED" | "CHECKED" | "REDO"; submittedAt: string; text: string | null; imageFileId: string | null; feedback: string | null } | null;
  }[];
};

const when = (iso: string) => {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
  const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(d).toUpperCase();
  return day === istDate() ? `Today, ${time}` : `${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d)}, ${time}`;
};

/** Right panel: the selected student's submission, feedback for the parent, Needs redo / Mark checked. */
export function SubmissionPanel({ student, homework }: { student: HomeworkDetail["students"][number] | null; homework: HomeworkDetail["homework"] }) {
  const sub = student?.submission ?? null;
  const [feedback, setFeedback] = useState(sub?.feedback ?? "");
  const [zoom, setZoom] = useState(false);
  const [pending, run] = useAction();
  if (!student)
    return (
      <Card>
        <p className="text-[13.5px] text-muted">Pick a student to review.</p>
      </Card>
    );
  const review = (status: "CHECKED" | "REDO") =>
    run(() => reviewSubmission(sub!.id, status, feedback.trim()), { success: status === "CHECKED" ? "Marked checked. The parent sees your feedback." : "Sent back for redo. The parent was notified." });
  return (
    <Card className="self-start">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-semibold">{student.name}</h2>
          <p className="text-[12.5px] text-muted">{sub ? `Submitted ${when(sub.submittedAt)}` : `Not submitted · due ${homework.dueOn}`}</p>
        </div>
        {sub ? <Pill tone={sub.status === "CHECKED" ? "green" : sub.status === "REDO" ? "red" : "sun"}>{sub.status === "CHECKED" ? "Checked" : sub.status === "REDO" ? "Needs redo" : "To check"}</Pill> : <Pill>Not submitted</Pill>}
      </div>
      {sub && (
        <>
          {sub.imageFileId ? (
            <button type="button" onClick={() => setZoom(true)} className="mt-4 block w-full overflow-hidden rounded-2xl bg-ok-tint">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/files/${sub.imageFileId}`} alt={`${student.name}'s answers`} className="max-h-64 w-full object-contain" />
              <span className="block py-2 text-[12.5px] text-brand-deep">Photo of answers · tap to enlarge</span>
            </button>
          ) : (
            <div className="mt-4 grid min-h-28 place-items-center rounded-2xl bg-ok-tint p-4 text-center text-[13.5px] text-brand-deep">
              {sub.text ? <p className="text-left text-ink">{sub.text}</p> : <span className="flex flex-col items-center gap-2"><IImage className="size-6" />No photo attached</span>}
            </div>
          )}
          <label htmlFor="fb" className="mt-4 mb-1.5 block text-[12.5px] text-ink-soft">
            Feedback for parent
          </label>
          <textarea id="fb" rows={3} maxLength={500} value={feedback} onChange={(e) => setFeedback(e.target.value)} className={textareaCls} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className={btn.white} disabled={pending} onClick={() => void review("REDO")}>
              Needs redo
            </button>
            <button type="button" className={btn.dark} disabled={pending} onClick={() => void review("CHECKED")}>
              {pending && <span className="spinner" />}
              Mark checked
            </button>
          </div>
          {zoom && sub.imageFileId && (
            <Dialog open={zoom} onClose={() => setZoom(false)} title={`${student.name} · ${homework.title}`} wide>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/files/${sub.imageFileId}`} alt="" className="w-full rounded-xl" />
            </Dialog>
          )}
        </>
      )}
      <div className="mt-4 border-t border-line pt-3 text-right">
        <ActionButton
          className="text-[12.5px] text-danger-ink hover:underline"
          action={() => deleteHomework(homework.id)}
          success="Homework removed."
          confirm={{ title: `Remove "${homework.title}"?`, body: "Submissions for it are removed too.", confirmLabel: "Remove", danger: true }}
        >
          Remove this homework
        </ActionButton>
      </div>
    </Card>
  );
}

/** "+ Give homework" for the selected class. Parents are notified. */
export function GiveHomeworkButton({ cls }: { cls: ClassOpt }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", details: "", dueOn: addDays(istDate(), 2) });
  const [pending, run] = useAction();
  return (
    <>
      <button type="button" className={btn.dark} onClick={() => setOpen(true)}>
        + Give homework
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Give homework · ${cls.label}`}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => createHomework({ grade: cls.grade, courseId: cls.courseId, subject: cls.subject, title: f.title.trim(), details: f.details.trim(), dueOn: f.dueOn }), {
              success: "Homework given. Parents were notified.",
              onOk: () => (setOpen(false), setF({ title: "", details: "", dueOn: addDays(istDate(), 2) })),
            });
          }}
        >
          <Field label="Title" required>
            {(id) => <input id={id} required maxLength={120} placeholder="e.g. Ex 4.2 · Q1–10" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputCls} />}
          </Field>
          <Field label="Details" hint={`${f.details.length} / 500`}>
            {(id) => <textarea id={id} rows={3} maxLength={500} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} className={textareaCls} />}
          </Field>
          <Field label="Due on" required>
            {(id) => <input id={id} type="date" required min={istDate()} value={f.dueOn} onChange={(e) => setF({ ...f, dueOn: e.target.value })} className={cx(inputCls, "sm:w-52")} />}
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className={btn.white} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className={btn.dark} disabled={pending || !f.title.trim()}>
              {pending && <span className="spinner" />}
              Give homework
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
