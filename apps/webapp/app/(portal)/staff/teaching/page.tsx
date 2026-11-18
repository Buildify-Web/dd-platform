import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/kit";
import { api } from "@/lib/api";
import { requireStaff } from "@/lib/portal";
import { MyTeaching, type TeachingData } from "./MyTeaching";

export const metadata: Metadata = { title: "My courses" };

/** The courses this teacher teaches, by grade. Changes need the admin's approval. */
export default async function MyCoursesPage() {
  await requireStaff("/staff/teaching");
  const data = await api<TeachingData>("/v1/me/teaching", "staff");
  return (
    <>
      <PageHeader
        title="My courses"
        crumb="Teaching / My courses"
        note="Choose the courses you teach in each grade. The admin approves changes before they take effect."
      />
      <MyTeaching data={data} />
    </>
  );
}
