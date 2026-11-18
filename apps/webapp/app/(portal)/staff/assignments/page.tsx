import type { Metadata } from "next";
import { AssignmentsView } from "@/components/teaching/AssignmentsView";
import { requireStaff } from "@/lib/portal";

export const metadata: Metadata = { title: "Assignments" };

export default async function AssignmentsPage() {
  await requireStaff("/staff/assignments");
  return <AssignmentsView portal="staff" />;
}
