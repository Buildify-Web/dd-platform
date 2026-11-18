"use client";

import { formatINR, GRADES, gradeLabel, istDate } from "@dd/shared/domain";
import { useState } from "react";
import { IPlus, ITrash } from "@/components/portal/icons";
import { ActionButton, Chip, Dialog, Field, Toggle, useAction } from "@/components/ui/client";
import { btn, cx, inputBase, inputCls, textareaCls } from "@/components/ui/kit";
import { archiveCompetition, saveCompetition } from "@/lib/actions";

export type CompetitionRow = {
  id: string;
  name: string;
  date: string;
  grades: string[];
  registrationFee: number;
  transportFee: number;
  description: string | null;
  published: boolean;
  subCompetitions: { id: string; name: string; fee: number }[];
};

function CompetitionDialog({ open, onClose, c }: { open: boolean; onClose: () => void; c?: CompetitionRow }) {
  const [f, setF] = useState(() => ({
    name: c?.name ?? "",
    date: c?.date ?? istDate(),
    grades: new Set(c?.grades ?? []),
    registrationFee: String(c?.registrationFee ?? ""),
    transportFee: String(c?.transportFee ?? "0"),
    description: c?.description ?? "",
    published: c?.published ?? true,
    subs: c?.subCompetitions.map((s) => ({ id: s.id as string | undefined, name: s.name, fee: String(s.fee) })) ?? [],
  }));
  const [pending, run] = useAction();
  const num = (v: string) => v.replace(/\D/g, "");
  return (
    <Dialog open={open} onClose={onClose} title={c ? `Edit ${c.name}` : "New competition"} wide>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(
            () =>
              saveCompetition(c?.id ?? null, {
                name: f.name.trim(),
                date: f.date,
                grades: [...f.grades],
                registrationFee: Number(f.registrationFee),
                transportFee: Number(f.transportFee || 0),
                description: f.description.trim(),
                published: f.published,
                subCompetitions: f.subs.filter((s) => s.name.trim()).map((s) => ({ ...(s.id ? { id: s.id } : {}), name: s.name.trim(), fee: Number(s.fee || 0) })),
              }),
            { success: c ? "Competition saved." : "Competition created. Parents of these grades were notified.", onOk: onClose },
          );
        }}
      >
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Field label="Name" required hint="Max 100 characters">
            {(id) => <input id={id} required maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />}
          </Field>
          <Field label="Date" required>
            {(id) => <input id={id} type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={inputCls} />}
          </Field>
        </div>
        <div>
          <p className="mb-2 text-[12.5px] text-ink-soft">
            Grades <span className="text-danger">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {GRADES.map((g) => (
              <Chip
                key={g}
                selected={f.grades.has(g)}
                onClick={() => {
                  const n = new Set(f.grades);
                  if (n.has(g)) n.delete(g);
                  else n.add(g);
                  setF({ ...f, grades: n });
                }}
              >
                {gradeLabel(g)}
              </Chip>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Registration fee (₹)" required hint="Used when there are no sub-competitions">
            {(id) => <input id={id} required inputMode="numeric" value={f.registrationFee} onChange={(e) => setF({ ...f, registrationFee: num(e.target.value) })} className={inputCls} />}
          </Field>
          <Field label="Transport fee (₹)">
            {(id) => <input id={id} inputMode="numeric" value={f.transportFee} onChange={(e) => setF({ ...f, transportFee: num(e.target.value) })} className={inputCls} />}
          </Field>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12.5px] text-ink-soft">Sub-competitions (each with its own fee)</p>
            <button type="button" className={btn.ghost} onClick={() => setF({ ...f, subs: [...f.subs, { id: undefined, name: "", fee: "" }] })}>
              <IPlus className="size-4" /> Add
            </button>
          </div>
          <ul className="grid gap-2">
            {f.subs.map((s, i) => (
              <li key={i} className="flex gap-2">
                <input aria-label="Sub-competition name" maxLength={100} placeholder="e.g. Written test" value={s.name} onChange={(e) => setF({ ...f, subs: f.subs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} className={cx(inputBase, "h-11 min-w-0 flex-1 px-3.5")} />
                <input aria-label="Fee" inputMode="numeric" placeholder="₹" value={s.fee} onChange={(e) => setF({ ...f, subs: f.subs.map((x, j) => (j === i ? { ...x, fee: num(e.target.value) } : x)) })} className={cx(inputBase, "h-11 w-28 px-3.5")} />
                <button type="button" className={btn.iconDanger} aria-label="Remove" onClick={() => setF({ ...f, subs: f.subs.filter((_, j) => j !== i) })}>
                  <ITrash className="size-4" />
                </button>
              </li>
            ))}
            {!f.subs.length && <li className="text-[12.5px] text-muted">None. Parents pay the registration fee.</li>}
          </ul>
          {f.subs.length > 0 && (
            <p className="mt-2 text-[12px] text-muted">
              Parents tick events; total = selected fees + transport (e.g. all events: {formatINR(f.subs.reduce((t, s) => t + Number(s.fee || 0), 0) + Number(f.transportFee || 0))}).
            </p>
          )}
        </div>
        <Field label="Details for parents (optional)">
          {(id) => <textarea id={id} rows={2} maxLength={500} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={textareaCls} />}
        </Field>
        <label className="flex items-center justify-between gap-3 rounded-2xl bg-frame p-4 text-[14px]">
          <span>
            Published
            <span className="block text-[12px] text-muted">{c ? "Shown to parents of these grades" : "Notifies parents of these grades now"}</span>
          </span>
          <Toggle checked={f.published} label="Published" onChange={(v) => setF({ ...f, published: v })} />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className={btn.white} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={btn.dark} disabled={pending || !f.name.trim() || !f.grades.size || f.registrationFee === ""}>
            {pending && <span className="spinner" />}
            {c ? "Save" : "Create & notify"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function CompetitionDialogButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={btn.dark} onClick={() => setOpen(true)}>
        <IPlus className="size-4 text-sun" />
        New competition
      </button>
      {open && <CompetitionDialog open={open} onClose={() => setOpen(false)} />}
    </>
  );
}

export function CompetitionActions({ c, archived }: { c: CompetitionRow; archived: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-flex gap-2">
      {!archived && (
        <button type="button" className={btn.whiteSm} onClick={() => setOpen(true)}>
          Edit
        </button>
      )}
      <ActionButton className={btn.whiteSm} action={() => archiveCompetition(c.id, !archived)} success={archived ? "Restored." : "Archived."}>
        {archived ? "Restore" : "Archive"}
      </ActionButton>
      {open && <CompetitionDialog open={open} onClose={() => setOpen(false)} c={c} />}
    </span>
  );
}
