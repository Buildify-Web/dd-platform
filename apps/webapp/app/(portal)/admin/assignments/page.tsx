import type { Metadata } from "next";
import { AssignmentsView } from "@/components/teaching/AssignmentsView";
import { requireAdmin } from "@/lib/portal";

export const metadata: Metadata = { title: "Assignments" };

export default async function AssignmentsPage() {
  await requireAdmin("/admin/assignments");
  return <AssignmentsView portal="admin" />;
}
