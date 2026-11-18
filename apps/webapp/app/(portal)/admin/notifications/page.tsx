import type { Metadata } from "next";
import { Inbox } from "@/components/comms/Inbox";
import type { SearchParams } from "@/lib/api";
import { requireAdmin } from "@/lib/portal";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/notifications");
  return <Inbox portal="admin" searchParams={searchParams} />;
}
