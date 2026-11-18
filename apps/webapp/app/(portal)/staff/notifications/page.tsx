import type { Metadata } from "next";
import { Inbox } from "@/components/comms/Inbox";
import type { SearchParams } from "@/lib/api";
import { requireStaff } from "@/lib/portal";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireStaff("/staff/notifications");
  return <Inbox portal="staff" searchParams={searchParams} />;
}
