import type { Metadata } from "next";
import { Composer, type AudienceGroup } from "@/components/comms/Composer";
import { PageHeader } from "@/components/ui/kit";
import { api } from "@/lib/api";
import { getMeta, requireAdmin } from "@/lib/portal";

export const metadata: Metadata = { title: "New announcement" };

/** Design: "New announcement" (Announcements / New). */
export default async function NewAnnouncementPage() {
  await requireAdmin("/admin/announcements/new");
  const [{ groups }, meta] = await Promise.all([api<{ groups: AudienceGroup[] }>("/v1/announcements/audiences"), getMeta("admin")]);
  return (
    <>
      <PageHeader title="New announcement" crumb="Announcements / New" />
      <Composer groups={groups} portal="admin" sender={meta.settings.instituteName} courses={meta.courses.map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
