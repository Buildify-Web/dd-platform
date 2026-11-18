import type { Metadata } from "next";
import { ClassUpdatesView } from "@/components/teaching/ClassUpdatesView";
import type { SearchParams } from "@/lib/api";
import { requireStaff } from "@/lib/portal";

export const metadata: Metadata = { title: "Class updates" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  await requireStaff("/staff/class-updates");
  return <ClassUpdatesView portal="staff" searchParams={searchParams} />;
}
