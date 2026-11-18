import type { Metadata } from "next";
import { HomeworkView } from "@/components/teaching/HomeworkView";
import type { SearchParams } from "@/lib/api";
import { requireStaff } from "@/lib/portal";

export const metadata: Metadata = { title: "Homework" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  await requireStaff("/staff/homework");
  return <HomeworkView portal="staff" searchParams={searchParams} />;
}
