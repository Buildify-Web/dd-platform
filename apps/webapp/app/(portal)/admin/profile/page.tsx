import type { Metadata } from "next";
import { ProfileView } from "@/components/portal/ProfileView";
import type { SearchParams } from "@/lib/api";
import { requireAdmin } from "@/lib/portal";

export const metadata: Metadata = { title: "My profile" };

export default async function AdminProfilePage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/profile");
  return <ProfileView portal="admin" searchParams={searchParams} />;
}
