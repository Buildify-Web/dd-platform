"use client";

import { ActionButton } from "@/components/ui/client";
import { btn } from "@/components/ui/kit";
import { decideLeave } from "@/lib/actions";

/** Approve / Reject buttons for one leave request. Approving a student's leave pre-fills "Leave" in attendance. */
export function LeaveActions({ id }: { id: string }) {
  return (
    <span className="inline-flex gap-2">
      <ActionButton className={btn.dangerSm} action={() => decideLeave(id, false)} success="Leave rejected. They've been notified." confirm={{ title: "Reject this leave request?", confirmLabel: "Reject", danger: true }}>
        Reject
      </ActionButton>
      <ActionButton className={btn.darkSm} action={() => decideLeave(id, true)} success="Leave approved. Attendance is pre-filled as Leave.">
        Approve
      </ActionButton>
    </span>
  );
}
