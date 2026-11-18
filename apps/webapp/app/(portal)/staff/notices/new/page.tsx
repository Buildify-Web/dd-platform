import type { Metadata } from "next";
import { Composer, type AudienceGroup } from "@/components/comms/Composer";
import { PageHeader } from "@/components/ui/kit";
import { api } from "@/lib/api";
import { requireStaff } from "@/lib/portal";

export const metadata: Metadata = { title: "Send class notice" };

/** Design: "Class notices" (Send class notice · Class notices / New). */
export default async function NewNoticePage() {
  await requireStaff("/staff/notices/new");
  const [{ groups }, profile] = await Promise.all([api<{ groups: AudienceGroup[] }>("/v1/announcements/audiences", "staff"), api<{ profile: { parentLabel: string | null; name: string } }>("/v1/profile", "staff")]);
  return (
    <>
      <PageHeader title="Send class notice" crumb="Class notices / New" />
      <Composer groups={groups} portal="staff" sender={profile.profile.parentLabel ?? profile.profile.name} courses={[]} />
    </>
  );
}
