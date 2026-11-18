"use client";

import { TEXT_MAX } from "@dd/shared/domain";
import { useEffect, useState } from "react";
import { ActionButton, SelectBox, useAction } from "@/components/ui/client";
import { btn, inputCls, labelCls, textareaCls } from "@/components/ui/kit";
import { classStudents, deleteClassUpdate, postClassUpdate } from "@/lib/actions";
import type { ClassOpt } from "@/lib/portal";

export function PostUpdateForm({ cls, parents }: { cls: ClassOpt; parents?: number }) {
  const [text, setText] = useState("");
  const [homework, setHomework] = useState("");
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [pending, run] = useAction();
  useEffect(() => {
    void classStudents(cls.grade, cls.courseId).then((r) => setStudents(r.ok ? r.data.students : []));
  }, [cls.grade, cls.courseId]);
  const count = studentId ? 1 : (parents ?? students.length);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run(() => postClassUpdate({ grade: cls.grade, courseId: cls.courseId, subject: cls.subject, studentId: studentId || undefined, text: text.trim(), homework: homework.trim() }), {
          success: (d) => `Update posted. ${d.notified} parent${d.notified === 1 ? "" : "s"} notified.`,
          onOk: () => (setText(""), setHomework("")),
        });
      }}
    >
      <label htmlFor="cu-text" className={labelCls}>
        What did you teach today?
      </label>
      <textarea id="cu-text" rows={4} maxLength={TEXT_MAX} required value={text} onChange={(e) => setText(e.target.value)} className={textareaCls} />
      <p className="mt-1 text-right text-[11.5px] text-muted">
        {text.length} / {TEXT_MAX}
      </p>
      <label htmlFor="cu-hw" className={labelCls}>
        Homework
      </label>
      <input id="cu-hw" maxLength={TEXT_MAX} value={homework} onChange={(e) => setHomework(e.target.value)} className={inputCls} />
      {students.length > 0 && (
        <div className="mt-3 sm:w-72">
          <label className={labelCls}>Student (optional)</label>
          <SelectBox aria-label="Student" value={studentId} onChange={setStudentId} options={[{ value: "", label: "Whole class" }, ...students.map((s) => ({ value: s.id, label: s.name }))]} />
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-[12.5px] text-muted">
          Goes to {count} parent{count === 1 ? "" : "s"} in {studentId ? students.find((s) => s.id === studentId)?.name : cls.label}
        </p>
        <button type="submit" className={btn.dark} disabled={pending || !text.trim()}>
          {pending && <span className="spinner" />}
          Post update
        </button>
      </div>
    </form>
  );
}

export function DeleteUpdate({ id }: { id: string }) {
  return (
    <ActionButton className="text-[11.5px] text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger-ink focus-visible:opacity-100" action={() => deleteClassUpdate(id)} success="Update deleted." confirm={{ title: "Delete this update?", body: "Parents won't see it in the app any more.", confirmLabel: "Delete", danger: true }}>
      Delete
    </ActionButton>
  );
}
