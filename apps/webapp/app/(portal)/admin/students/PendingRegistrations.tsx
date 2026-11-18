import Link from "next/link";
import { Card, Empty, Pill, Table, td, th } from "@/components/ui/kit";

export type PendingRow = {
  id: string;
  code: string;
  status: "PENDING" | "INFO_REQUESTED";
  submittedAt: string;
  studentName: string;
  gradeLabel: string;
  parentName: string;
  courses: string[];
  source: "Website" | "App";
};

const when = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Registrations from the website and the app that still need a decision. Approve from the review page. */
export function PendingRegistrations({ rows }: { rows: PendingRow[] }) {
  return (
    <Card
      pad={false}
      className="mb-4"
      title={undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-medium text-ink">New registrations</h2>
          <Pill tone={rows.length ? "sun" : "grey"}>{rows.length}</Pill>
        </div>
        <Link href="/admin/courses" className="text-[13px] font-medium text-brand underline-offset-4 hover:underline">
          Students by course →
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 pb-4 sm:px-5">
          <Empty title="No new registrations">Registrations from the website and the app appear here until they are approved.</Empty>
        </div>
      ) : (
        <div className="mt-3 px-4 pb-2 sm:px-5">
          <Table>
            <thead>
              <tr>
                <th className={th}>Student</th>
                <th className={th}>Grade</th>
                <th className={th}>Courses</th>
                <th className={th}>Parent</th>
                <th className={th}>Source</th>
                <th className={th}>Received</th>
                <th className={`${th} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={td}>
                    <p className="text-[14px] text-ink">{r.studentName || "—"}</p>
                    <p className="text-[12px] text-muted">
                      {r.code}
                      {r.status === "INFO_REQUESTED" ? " · more info requested" : ""}
                    </p>
                  </td>
                  <td className={`${td} text-ink-soft`}>{r.gradeLabel || "—"}</td>
                  <td className={`${td} text-[13px] text-ink-soft`}>{r.courses.length ? r.courses.join(", ") : "—"}</td>
                  <td className={`${td} text-[13px] text-ink-soft`}>{r.parentName || "—"}</td>
                  <td className={td}>
                    <Pill tone={r.source === "Website" ? "blue" : "grey"}>{r.source}</Pill>
                  </td>
                  <td className={`${td} whitespace-nowrap text-[13px] text-muted`}>{when(r.submittedAt)}</td>
                  <td className={`${td} text-right`}>
                    <Link href={`/admin/approvals/registrations/${r.id}`} className="text-[13px] font-medium text-brand underline-offset-4 hover:underline">
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Card>
  );
}
