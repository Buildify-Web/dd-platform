import type { Metadata } from "next";
import { PapersView } from "@/components/teaching/PapersView";
import type { SearchParams } from "@/lib/api";
import { requireAdmin } from "@/lib/portal";

export const metadata: Metadata = { title: "Question papers" };

export default async function QuestionPapersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/question-papers");
  return <PapersView portal="admin" searchParams={searchParams} />;
}
