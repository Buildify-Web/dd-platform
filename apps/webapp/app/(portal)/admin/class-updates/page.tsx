import type { Metadata } from "next";
import { ClassUpdatesView } from "@/components/teaching/ClassUpdatesView";
import type { SearchParams } from "@/lib/api";
import { requireAdmin } from "@/lib/portal";

export const metadata: Metadata = { title: "Class updates" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/class-updates");
  return <ClassUpdatesView portal="admin" searchParams={searchParams} />;
}
