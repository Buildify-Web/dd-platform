import type { Metadata } from "next";
import { HomeworkView } from "@/components/teaching/HomeworkView";
import type { SearchParams } from "@/lib/api";
import { requireAdmin } from "@/lib/portal";

export const metadata: Metadata = { title: "Homework" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/homework");
  return <HomeworkView portal="admin" searchParams={searchParams} />;
}
