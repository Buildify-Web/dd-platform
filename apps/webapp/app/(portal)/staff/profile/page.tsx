import type { Metadata } from "next";
import { ProfileView } from "@/components/portal/ProfileView";
import type { SearchParams } from "@/lib/api";
import { requireStaff } from "@/lib/portal";

export const metadata: Metadata = { title: "My profile" };

export default async function StaffProfilePage({ searchParams }: { searchParams: SearchParams }) {
  await requireStaff("/staff/profile");
  return <ProfileView portal="staff" searchParams={searchParams} />;
}
