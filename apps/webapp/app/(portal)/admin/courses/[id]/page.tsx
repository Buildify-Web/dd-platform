import { formatINR, type Grade } from "@dd/shared/domain";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/kit";
import { api } from "@/lib/api";
import { gradeRange } from "@/lib/format";
import { requireAdmin } from "@/lib/portal";
import { RosterView, type Roster } from "./RosterView";

export const metadata: Metadata = { title: "Course students" };

/**
 * One course: students who registered for it (approve them here), the active students with the
 * teacher handling each one, and the teachers who teach the course.
 */
export default async function CourseRosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/admin/courses/${id}`);
  const roster = await api<Roster>(`/v1/courses/${id}/roster`);
  const { course } = roster;

  return (
    <>
      <PageHeader
        title={course.name}
        crumb="Academics / Courses"
        back={{ href: "/admin/courses", label: "All courses" }}
        note={`${formatINR(course.monthlyFee)} a month · ${gradeRange(course.grades as Grade[])}${course.archived ? " · archived" : ""}`}
      />
      <RosterView roster={roster} />
    </>
  );
}
