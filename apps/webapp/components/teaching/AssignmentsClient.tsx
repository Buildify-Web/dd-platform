"use client";

import { useState } from "react";
import { ITrash } from "@/components/portal/icons";
import { ActionButton, Chip, CopyButton, useAction, useToast } from "@/components/ui/client";
import { btn, Card, cx, inputCls, labelCls } from "@/components/ui/kit";
import { createAssignment, deleteAssignment, fileLink } from "@/lib/actions";
import type { ClassInfo } from "@/lib/portal";
import { UploadField, type Uploaded } from "./UploadField";

/** Left card: "New assignment" (file + title + class chips + "Share with class"). */
export function NewAssignment({ classes }: { classes: ClassInfo[] }) {
  const [file, setFile] = useState<Uploaded | null>(null);
  const [title, setTitle] = useState("");
  const [key, setKey] = useState(classes[0]?.key ?? "");
  const [pending, run] = useAction();
  const cls = classes.find((c) => c.key === key);
  return (
    <Card title="New assignment" className="content-start self-start">
      <UploadField purpose="ASSIGNMENT" accept=".pdf,.doc,.docx,image/*" maxMb={10} hint="PDF, Word or photo" value={file} onChange={setFile} />
      <label className={cx(labelCls, "mt-4")} htmlFor="asg-title">
        Title
      </label>
      <input id="asg-title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
      <p className={cx(labelCls, "mt-4")}>For</p>
      {classes.length ? (
        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
          {classes.map((c) => (
            <Chip key={c.key} selected={c.key === key} onClick={() => setKey(c.key)}>
              {c.label}
            </Chip>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-muted">Assignments are for Grades 9–12. You have no classes in those grades.</p>
      )}
      <button
        type="button"
        className={cx(btn.dark, "mt-5 w-full")}
        disabled={pending || !file || !title.trim() || !cls}
        onClick={() =>
          void run(() => createAssignment({ title: title.trim(), grade: cls!.grade, courseId: cls!.courseId, subject: cls!.subject, fileId: file!.id }), {
            success: "Shared. Students and parents got a link.",
            onOk: () => (setFile(null), setTitle("")),
          })
        }
      >
        {pending && <span className="spinner" />}
        Share with class
      </button>
      <p className="mt-3 text-[12.5px] text-muted">Students and parents get a link right away.</p>
    </Card>
  );
}

export function AssignmentRowActions({ id, fileId, title, admin }: { id: string; fileId: string; title: string; admin: boolean }) {
  const toast = useToast();
  return (
    <span className="flex items-center gap-2">
      <CopyButton
        getText={async () => {
          const r = await fileLink(fileId);
          if (!r.ok) {
            toast("error", r.error.message);
            return null;
          }
          return r.data.url;
        }}
      />
      <ActionButton
        className={btn.iconDanger}
        title={`Delete ${title}`}
        action={() => deleteAssignment(id)}
        success="Deleted. Its link no longer works."
        confirm={{ title: "Delete this assignment?", body: `It's removed for ${admin ? "the teacher, " : ""}students and parents, and the link stops working.`, confirmLabel: "Delete", danger: true }}
      >
        <ITrash className="size-4" />
      </ActionButton>
    </span>
  );
}
