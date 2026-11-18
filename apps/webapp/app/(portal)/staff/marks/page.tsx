import type { Metadata } from "next";
import { MarksView } from "@/components/teaching/MarksView";
import type { SearchParams } from "@/lib/api";
import { requireStaff } from "@/lib/portal";

export const metadata: Metadata = { title: "Marks" };

/** Design: "Marks entry". */
export default async function MarksPage({ searchParams }: { searchParams: SearchParams }) {
  await requireStaff("/staff/marks");
  return <MarksView portal="staff" searchParams={searchParams} />;
}
