import type { Metadata } from "next";
import { AnnouncementList } from "@/components/comms/AnnouncementList";
import { requireStaff } from "@/lib/portal";

export const metadata: Metadata = { title: "Class notices" };

export default async function NoticesPage() {
  await requireStaff("/staff/notices");
  return <AnnouncementList portal="staff" />;
}
