"use client";

import { useRouter } from "next/navigation";
import { createShared } from "@/components/ui/shared-state";
import { useAction } from "@/components/ui/client";
import { btn, cx, textareaCls } from "@/components/ui/kit";
import { decideEnrolmentChange } from "@/lib/actions";

/** Shared note between the note field (left) and the decision buttons (right). */
const useNote = createShared("");

/**
 * Two parts of one decision: the "Note to parent" field under the change, and the dark
 * Approve / Reject panel on the right. The parent is notified either way; it's audited.
 */
export function EnrolmentDecision({ id, status, note, blocked, part }: { id: string; status: string; note: string | null; blocked: boolean; part: "note" | "buttons" }) {
  const router = useRouter();
  const [value, setValue] = useNote();
  const [pending, run] = useAction();
  const decided = status !== "PENDING";

  if (part === "note")
    return (
      <div className="mt-4">
        <label htmlFor="note" className="mb-1.5 block text-[12.5px] text-ink-soft">
          Note to parent (optional)
        </label>
        <textarea id="note" rows={3} maxLength={500} disabled={decided} defaultValue={note ?? ""} onChange={(e) => setValue(e.target.value)} className={textareaCls} />
      </div>
    );

  const decide = (approve: boolean) =>
    run(() => decideEnrolmentChange(id, approve, value.trim()), {
      success: approve ? "Change approved. The parent was notified." : "Change rejected. The parent was notified.",
      onOk: () => router.push("/admin/approvals?tab=enrolment"),
    });

  return (
    <section className="rounded-[18px] bg-ink p-5 text-white">
      {decided ? (
        <p className="text-[14px]">This request was {status === "APPROVED" ? "approved" : "rejected"}.</p>
      ) : (
        <div className="grid gap-2.5">
          <button type="button" className={cx(btn.sun, "w-full")} disabled={pending || blocked} onClick={() => void decide(true)}>
            {pending && <span className="spinner" />}
            Approve change
          </button>
          <button type="button" className={cx(btn.danger, "w-full")} disabled={pending} onClick={() => void decide(false)}>
            Reject
          </button>
        </div>
      )}
      <p className="mt-3 text-[12.5px] text-white/75">{blocked && !decided ? "Outside the day 1–10 window: it can only be rejected." : "Parent is notified either way. Logged in audit."}</p>
    </section>
  );
}
