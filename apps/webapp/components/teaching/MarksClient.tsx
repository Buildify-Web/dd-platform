"use client";

import { istDate } from "@dd/shared/domain";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog, Field, Toggle, useAction } from "@/components/ui/client";
import { Avatar, btn, Card, cx, inputBase, inputCls } from "@/components/ui/kit";
import { createTest, saveMarks, setResultsVisible } from "@/lib/actions";

export type MarksSheet = {
  test: { id: string; name: string; maxMarks: number; heldOn: string | null; resultsVisible: boolean; classLabel: string };
  rows: { studentId: string; name: string; score: number | null; previous: { score: number; max: number } | null; lastEdit: string | null }[];
  allStudents?: { studentId: string; name: string }[];
  summary: { average: number | null; highest: number | null; notEntered: number };
};

/** Marks table with inline validation ("Max is 50"). Only changed rows are saved. */
export function MarksEditor({ sheet }: { sheet: MarksSheet }) {
  const max = sheet.test.maxMarks;
  const init = Object.fromEntries(sheet.rows.map((r) => [r.studentId, r.score === null ? "" : String(r.score)]));
  const [v, setV] = useState<Record<string, string>>(init);
  const [server, setServer] = useState<Record<string, string>>({});
  const [pending, run] = useAction();
  const errOf = (id: string) => {
    const raw = v[id]?.trim() ?? "";
    if (server[id]) return server[id];
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return "Enter a number";
    if (n > max) return `Max is ${max}`;
    if (Math.round(n * 2) !== n * 2) return "Use whole or half marks";
    return null;
  };
  const changed = sheet.rows.filter((r) => (v[r.studentId] ?? "") !== init[r.studentId]);
  const invalid = sheet.rows.some((r) => errOf(r.studentId));
  return (
    <Card pad={false}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[13.5px]">
          <thead>
            <tr className="text-[12px] text-muted">
              <th className="border-b border-line px-4 py-3 font-normal sm:pl-5">Student</th>
              <th className="border-b border-line px-4 py-3 font-normal">Marks / {max}</th>
              <th className="border-b border-line px-4 py-3 font-normal">Previous test</th>
              <th className="border-b border-line px-4 py-3 font-normal sm:pr-5">Last edit</th>
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((r) => {
              const err = errOf(r.studentId);
              return (
                <tr key={r.studentId}>
                  <td className="border-b border-line px-4 py-3 sm:pl-5">
                    <span className="flex items-center gap-3">
                      <Avatar name={r.name} size={30} />
                      {r.name}
                    </span>
                  </td>
                  <td className="border-b border-line px-4 py-2.5">
                    <input
                      inputMode="decimal"
                      aria-label={`Marks for ${r.name}`}
                      aria-invalid={!!err || undefined}
                      value={v[r.studentId] ?? ""}
                      onChange={(e) => (setV((x) => ({ ...x, [r.studentId]: e.target.value })), setServer((s) => ({ ...s, [r.studentId]: "" })))}
                      className={cx(inputBase, "h-10 w-[92px] px-3 tabular-nums")}
                    />
                    {err && <p className="mt-1 text-[11.5px] text-danger">{err}</p>}
                  </td>
                  <td className="border-b border-line px-4 py-3 text-ink-soft tabular-nums">{r.previous ? `${r.previous.score} / ${r.previous.max}` : "—"}</td>
                  <td className="border-b border-line px-4 py-3 text-ink-soft sm:pr-5">{r.lastEdit ?? "Not entered"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <p className="text-[12.5px] text-muted">Corrections keep old and new values in the audit log.</p>
        <button
          type="button"
          className={btn.dark}
          disabled={pending || invalid || !changed.length}
          onClick={() =>
            void run(() => saveMarks(sheet.test.id, changed.map((r) => ({ studentId: r.studentId, score: v[r.studentId]!.trim() === "" ? null : Number(v[r.studentId]) }))), {
              success: (d) => `Saved ${d.saved} mark${d.saved === 1 ? "" : "s"}.`,
              onError: (e) => setServer(e.fields ?? {}),
            })
          }
        >
          {pending && <span className="spinner" />}
          Save marks
        </button>
      </div>
    </Card>
  );
}

/** Admin: "Visible to parents" (yellow card with a switch). */
export function VisibilityToggle({ testId, visible }: { testId: string; visible: boolean }) {
  const [pending, run] = useAction();
  return (
    <section className="rounded-[18px] bg-sun p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15.5px]">Visible to parents</h2>
        <Toggle
          checked={visible}
          disabled={pending}
          label="Visible to parents"
          onChange={(next) => void run(() => setResultsVisible(testId, next), { success: next ? "Published. Parents were notified." : "Hidden from parents." })}
        />
      </div>
      <p className="mt-2 text-[13px] text-ink/80">{visible ? "Published. Parents can see these marks; corrections notify them." : "Hidden. Parents see these marks only after you publish."}</p>
    </section>
  );
}

/** "+ New test" for the selected class. */
export function NewTestButton({ cls, label, base }: { cls: { grade: string; courseId: string; subject: string }; label: string; base: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", maxMarks: "50", heldOn: istDate() });
  const [pending, run] = useAction();
  return (
    <>
      <button type="button" className={btn.white} onClick={() => setOpen(true)}>
        + New test
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`New test · ${label}`}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => createTest({ ...cls, name: f.name.trim(), maxMarks: Number(f.maxMarks), heldOn: f.heldOn }), {
              success: "Test created. Enter the marks now.",
              onOk: (d) => (setOpen(false), router.push(`${base}?class=${encodeURIComponent(`${cls.grade}.${cls.courseId}.${cls.subject}`)}&test=${d.id}`)),
            });
          }}
        >
          <Field label="Test name" required>
            {(id) => <input id={id} required maxLength={80} placeholder="e.g. Unit Test 4" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Out of" required>
              {(id) => <input id={id} required inputMode="numeric" value={f.maxMarks} onChange={(e) => setF({ ...f, maxMarks: e.target.value.replace(/\D/g, "") })} className={inputCls} />}
            </Field>
            <Field label="Held on">
              {(id) => <input id={id} type="date" max={istDate()} value={f.heldOn} onChange={(e) => setF({ ...f, heldOn: e.target.value })} className={inputCls} />}
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={btn.white} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className={btn.dark} disabled={pending || !f.name.trim() || !Number(f.maxMarks)}>
              {pending && <span className="spinner" />}
              Create test
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
