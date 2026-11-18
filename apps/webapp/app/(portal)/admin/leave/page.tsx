import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/portal";

/** "Leave requests" in the sidebar opens the Leave tab of Approvals. */
export default async function LeavePage() {
  await requireAdmin("/admin/leave");
  redirect("/admin/approvals?tab=leave");
}
