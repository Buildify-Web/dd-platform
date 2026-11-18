import { courseCategoryLabel, formatINR, type CourseCategory, type Grade } from "@dd/shared/domain";
import type { Metadata } from "next";
import Link from "next/link";
import { ICap } from "@/components/portal/icons";
import { Card, Empty, PageHeader, Pill, Table, td, th } from "@/components/ui/kit";
import { api } from "@/lib/api";
import { gradeRange } from "@/lib/format";
import { requireAdmin } from "@/lib/portal";
import { CourseActions, CourseDialogButton, type CourseRow } from "./CourseForm";

export const metadata: Metadata = { title: "Courses" };

/**
 * Courses: name (≤100), eligible grades, monthly fee (editable any time, audited).
 * Published courses appear in the parent app's Course Enrolment. Grade rules from the scope
 * are enforced per category.
 */
export default async function CoursesPage() {
  await requireAdmin("/admin/courses");
  const { rows } = await api<{ rows: (CourseRow & { students: number; archived: boolean })[] }>("/v1/courses");
  return (
    <>
      <PageHeader title="Courses" crumb="Academics / Courses" actions={<CourseDialogButton />} note="Fee changes apply from the next monthly fee." />
      <Card pad={false}>
        {rows.length === 0 ? (
          <Empty title="No courses yet" icon={<ICap className="size-5" />}>
            Add the courses parents can enrol in.
          </Empty>
        ) : (
          <div className="px-4 sm:px-5">
            <Table>
              <thead>
                <tr>
                  <th className={th}>Course</th>
                  <th className={th}>Grades</th>
                  <th className={`${th} text-right`}>Fee / month</th>
                  <th className={`${th} text-right`}>Students</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className={c.archived ? "opacity-60" : undefined}>
                    <td className={td}>
                      <Link href={`/admin/courses/${c.id}`} className="text-[14px] text-ink hover:text-brand hover:underline">
                        {c.name}
                      </Link>
                      <p className="text-[12px] text-muted">
                        {courseCategoryLabel[c.category as CourseCategory]}
                        {c.subjects.length ? ` · ${c.subjects.join(", ")}` : ""}
                        {c.isMandatory ? " · mandatory for Grades 9–10" : ""}
                      </p>
                    </td>
                    <td className={`${td} text-ink-soft`}>{gradeRange(c.grades as Grade[])}</td>
                    <td className={`${td} text-right tabular-nums`}>{formatINR(c.monthlyFee)}</td>
                    <td className={`${td} text-right tabular-nums`}>{c.students}</td>
                    <td className={td}>{c.archived ? <Pill>Archived</Pill> : c.published ? <Pill tone="green">Published</Pill> : <Pill tone="sun">Hidden</Pill>}</td>
                    <td className={`${td} text-right`}>
                      <CourseActions course={c} archived={c.archived} students={c.students} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </>
  );
}
