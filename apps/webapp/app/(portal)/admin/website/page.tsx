import type { Metadata } from "next";
import { WebsiteView } from "@/components/content/WebsiteView";
import type { SearchParams } from "@/lib/api";
import { requireAdmin } from "@/lib/portal";

export const metadata: Metadata = { title: "Website content" };

export default async function WebsitePage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/website");
  return <WebsiteView searchParams={searchParams} />;
}
