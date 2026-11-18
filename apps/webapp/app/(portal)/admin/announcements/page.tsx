import type { Metadata } from "next";
import { AnnouncementList } from "@/components/comms/AnnouncementList";
import { requireAdmin } from "@/lib/portal";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  await requireAdmin("/admin/announcements");
  return <AnnouncementList portal="admin" />;
}
