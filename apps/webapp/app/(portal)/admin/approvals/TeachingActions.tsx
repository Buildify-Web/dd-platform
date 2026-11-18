"use client";

import { useState, type FormEvent } from "react";
import { ActionButton, Dialog, useAction } from "@/components/ui/client";
import { btn, textareaCls } from "@/components/ui/kit";
import { decideTeachingChange } from "@/lib/actions";

/** Approve applies the teacher's new courses now. Reject sends the admin's note back to the teacher. */
export function TeachingActions({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const [pending, run] = useAction();

  const reject = (e: FormEvent) => {
    e.preventDefault();
    const text = note.trim();
    if (!text) return setNoteError("Tell the teacher what to change.");
    setNoteError("");
    void run(() => decideTeachingChange(id, false, text), {
      success: "Changes rejected. The teacher has been told why.",
      onOk: () => {
        setOpen(false);
        setNote("");
      },
    });
  };

  return (
    <span className="inline-flex gap-2">
      <button type="button" className={btn.dangerSm} disabled={pending} onClick={() => setOpen(true)}>
        Reject
      </button>
      <ActionButton
        className={btn.darkSm}
        action={() => decideTeachingChange(id, true)}
        success="Approved. The teacher's courses are updated."
        confirm={{ title: "Approve these changes?", body: "The courses listed are updated straight away, in the teacher's app and in the class lists.", confirmLabel: "Approve" }}
      >
        Approve
      </ActionButton>
      <Dialog open={open} onClose={() => setOpen(false)} title="Reject these changes?">
        <form onSubmit={reject} noValidate className="grid gap-4">
          <div>
            <label htmlFor={`note-${id}`} className="mb-1.5 block text-[12.5px] text-ink-soft">
              Note for the teacher
            </label>
            <textarea id={`note-${id}`} rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={!!noteError || undefined} className={textareaCls} />
            {noteError && <p className="mt-1.5 text-[12px] text-danger">{noteError}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={btn.white} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className={btn.danger} disabled={pending}>
              {pending && <span className="spinner" />}
              Reject changes
            </button>
          </div>
        </form>
      </Dialog>
    </span>
  );
}
