"use client";

import { useEffect, useState } from "react";
import { ActionButton, CopyButton, Dialog, Field, useAction } from "@/components/ui/client";
import { btn, cx, inputCls } from "@/components/ui/kit";
import { assignCard, createDevice, dismissUnknownCard, searchPortal } from "@/lib/actions";

type Holder = { kind: "student" | "staff"; id: string; name: string; sub: string };

/** Search a student or staff member by name (uses the ⌘K search). */
function HolderPicker({ value, onChange }: { value: Holder | null; onChange: (h: Holder | null) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Holder[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => {
      void searchPortal(q.trim()).then((r) => {
        if (!r.ok) return;
        setResults([
          ...r.data.students.map((s) => ({ kind: "student" as const, id: s.id, name: s.name, sub: `${s.gradeLabel} · ${s.code}` })),
          ...r.data.staff.map((s) => ({ kind: "staff" as const, id: s.id, name: s.name, sub: `Staff · ${s.subject ?? "Teacher"}` })),
        ]);
      });
    }, 220);
    return () => clearTimeout(t);
  }, [q]);
  const shown = q.trim().length < 2 ? [] : results;
  if (value)
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-field bg-frame px-3.5 py-2.5">
        <span>
          <span className="block text-[14px]">{value.name}</span>
          <span className="block text-[12px] text-muted">{value.sub}</span>
        </span>
        <button type="button" className="text-[13px] text-brand hover:underline" onClick={() => onChange(null)}>
          Change
        </button>
      </div>
    );
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a student or staff name" className={inputCls} aria-label="Card holder" />
      {shown.length > 0 && (
        <ul className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-line bg-white p-1">
          {shown.map((r) => (
            <li key={`${r.kind}${r.id}`}>
              <button type="button" onClick={() => onChange(r)} className="w-full rounded-lg px-3 py-2 text-left hover:bg-soft">
                <span className="block text-[14px]">{r.name}</span>
                <span className="block text-[12px] text-muted">{r.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AssignDialog({ open, onClose, uid: initialUid = "", holder: initialHolder = null }: { open: boolean; onClose: () => void; uid?: string; holder?: Holder | null }) {
  const [uid, setUid] = useState(initialUid);
  const [holder, setHolder] = useState<Holder | null>(initialHolder);
  const [err, setErr] = useState("");
  const [pending, run] = useAction();
  return (
    <Dialog open={open} onClose={onClose} title={initialUid ? `Link card ${initialUid}` : "Assign card"}>
      <div className="grid gap-4">
        <Field label="Card id" error={err} hint="As printed on the card or shown in Unknown cards, e.g. 04:A3:7F:12">
          {(id) => <input id={id} value={uid} disabled={!!initialUid} onChange={(e) => (setUid(e.target.value), setErr(""))} className={cx(inputCls, "font-mono uppercase")} />}
        </Field>
        <div>
          <p className="mb-1.5 text-[12.5px] text-ink-soft">Card holder</p>
          <HolderPicker value={holder} onChange={setHolder} />
        </div>
        <p className="text-[12.5px] text-muted">If they already have a card, the old one is marked replaced and stops working. Today&rsquo;s unmatched taps of this card are applied to attendance.</p>
        <div className="flex justify-end gap-2">
          <button type="button" className={btn.white} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={btn.dark}
            disabled={pending || !uid.trim() || !holder}
            onClick={() =>
              void run(() => assignCard({ uid: uid.trim(), ...(holder!.kind === "student" ? { studentId: holder!.id } : { staffId: holder!.id }) }), {
                success: (d) => `Card ${d.uid} assigned${d.applied ? `; ${d.applied} tap${d.applied > 1 ? "s" : ""} applied to attendance` : ""}.`,
                onOk: onClose,
                onError: (e) => setErr(e.fields?.uid ?? ""),
              })
            }
          >
            {pending && <span className="spinner" />}
            Assign card
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export function AssignCardButton({ studentId, studentName, compact }: { studentId?: string; studentName?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={compact ? "text-[13px] text-brand hover:underline" : btn.white} onClick={() => setOpen(true)}>
        {compact ? "Assign" : "Assign card"}
      </button>
      {open && <AssignDialog open={open} onClose={() => setOpen(false)} holder={studentId ? { kind: "student", id: studentId, name: studentName ?? "", sub: "Student" } : null} />}
    </>
  );
}

export function LinkUnknown({ uid }: { uid: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="flex items-center gap-1.5">
      <ActionButton className={btn.ghost} action={() => dismissUnknownCard(uid)} success="Dismissed." title="Dismiss">
        ✕
      </ActionButton>
      <button type="button" className={btn.darkSm} onClick={() => setOpen(true)}>
        Link
      </button>
      {open && <AssignDialog open={open} onClose={() => setOpen(false)} uid={uid} />}
    </span>
  );
}

/** Add a reader: its device key is shown once (configure it on the Availo device). */
export function ReadersMenu() {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", location: "" });
  const [key, setKey] = useState<string | null>(null);
  const [pending, run] = useAction();
  return (
    <>
      <span className="flex items-center gap-3">
        <span className="hidden text-[12px] text-muted sm:inline">Heartbeat every 60 s</span>
        <button type="button" className={btn.whiteSm} onClick={() => (setOpen(true), setKey(null))}>
          + Add reader
        </button>
      </span>
      <Dialog open={open} onClose={() => setOpen(false)} title={key ? "Reader added" : "Add a reader"}>
        {key ? (
          <div className="grid gap-3">
            <p className="text-[13.5px] text-ink-soft">Enter this device key on the reader. It is shown only once; if it&rsquo;s lost, add the reader again.</p>
            <code className="rounded-xl bg-frame p-3 font-mono text-[13px] break-all">{key}</code>
            <div className="flex justify-end gap-2">
              <CopyButton getText={async () => key} label="Copy key" />
              <button type="button" className={btn.dark} onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <Field label="Name">
              {(id) => <input id={id} maxLength={60} placeholder="e.g. Gate 1 reader" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />}
            </Field>
            <Field label="Location">
              {(id) => <input id={id} maxLength={100} placeholder="e.g. Main entrance" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} className={inputCls} />}
            </Field>
            <div className="flex justify-end">
              <button type="button" className={btn.dark} disabled={pending || !f.name.trim()} onClick={() => void run(() => createDevice({ name: f.name.trim(), location: f.location.trim() }), { onOk: (d) => setKey(d.key) })}>
                {pending && <span className="spinner" />}
                Add reader
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
