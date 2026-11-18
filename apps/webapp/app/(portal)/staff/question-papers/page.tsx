import type { Metadata } from "next";
import { PapersView } from "@/components/teaching/PapersView";
import type { SearchParams } from "@/lib/api";
import { requireStaff } from "@/lib/portal";

export const metadata: Metadata = { title: "Question papers" };

export default async function QuestionPapersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireStaff("/staff/question-papers");
  return <PapersView portal="staff" searchParams={searchParams} />;
}
