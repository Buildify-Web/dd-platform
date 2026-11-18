import type { Metadata } from "next";
import Link from "next/link";
import { ICheckSquare } from "@/components/portal/icons";
import { btn, Card, Empty, LinkTabs, PageHeader, Person, Pill, PillTabs, Table, td, th } from "@/components/ui/kit";
import { api, param, qs, type SearchParams } from "@/lib/api";
import { requireAdmin } from "@/lib/portal";
import { LeaveActions } from "./LeaveActions";
import { TeachingActions } from "./TeachingActions";
import { TeachingChanges } from "./TeachingChanges";

export const metadata: Metadata = { title: "Approvals" };

type Item = {
  id: string;
  code?: string;
  status: string;
  submittedAt: string;
  name: string;
  detail: string;
  mobile?: string | null;
  grade?: string;
  kind?: string;
  fromDate?: string;
  toDate?: string;
  days?: number;
  reason?: string;
  decisionNote?: string | null;
  /** Teaching changes: "add" / "remove" for a waiting request, "keep" = what they asked to teach once decided. */
  changes?: { kind: "add" | "remove" | "keep"; grade: string; course: string; subject: string }[];
};
type Data = { counts: { students: number; staff: number; enrolment: number; leave: number; teaching: number }; items: Item[] };
type Tab = "students" | "staff" | "enrolment" | "leave" | "teaching";

const when = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
};
const statusPill = (s: string) =>
  s === "APPROVED" ? <Pill tone="green">Approved</Pill> : s === "REJECTED" ? <Pill tone="red">Rejected</Pill> : s === "INFO_REQUESTED" ? <Pill tone="blue">Info requested</Pill> : <Pill tone="sun">Pending</Pill>;

/** Everything waiting for the admin: registrations, course changes, leave, teaching changes. */
export default async function ApprovalsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/approvals");
  const sp = await searchParams;
  const tab = (["students", "staff", "enrolment", "leave", "teaching"].includes(param(sp.tab)) ? param(sp.tab) : "students") as Tab;
  const status = param(sp.status) === "decided" ? "decided" : "pending";
  const d = await api<Data>(`/v1/approvals${qs({ tab, status })}`);
  const href = (t: string, s = status) => `/admin/approvals${qs({ tab: t, status: s === "pending" ? "" : s })}`;
  const reviewHref = (i: Item) => (tab === "enrolment" ? `/admin/approvals/enrolment/${i.id}` : `/admin/approvals/registrations/${i.id}`);

  return (
    <>
      <PageHeader title="Approvals" crumb="Main menu / Approvals" note="Registrations, course changes and teaching changes take effect only after approval." />
      <Card pad={false}>
        <div className="px-4 pt-2 sm:px-5">
          <LinkTabs
            active={tab}
            tabs={[
              { key: "students", label: "Student registrations", href: href("students"), count: d.counts.students },
              { key: "staff", label: "Staff registrations", href: href("staff"), count: d.counts.staff },
              { key: "enrolment", label: "Enrolment changes", href: href("enrolment"), count: d.counts.enrolment },
              { key: "leave", label: "Leave", href: href("leave"), count: d.counts.leave },
              { key: "teaching", label: "Teaching changes", href: href("teaching"), count: d.counts.teaching },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <PillTabs active={status} tabs={[{ key: "pending", label: "Waiting", href: href(tab, "pending") }, { key: "decided", label: "Decided", href: href(tab, "decided") }]} />
        </div>
        {d.items.length === 0 ? (
          <Empty title={status === "pending" ? "Nothing waiting here" : "No decisions yet"} icon={<ICheckSquare className="size-5" />}>
            {status === "pending" ? "New requests from the app and staff appear here, and you're notified." : "Approved and rejected requests appear here."}
          </Empty>
        ) : (
          <div className="px-4 pb-2 sm:px-5">
            <Table>
              <thead>
                <tr>
                  <th className={th}>{tab === "leave" ? "Who" : tab === "enrolment" ? "Student" : tab === "teaching" ? "Teacher" : "Applicant"}</th>
                  <th className={th}>{tab === "leave" ? "Dates" : tab === "enrolment" ? "Change" : tab === "teaching" ? "Changes" : "Details"}</th>
                  <th className={th}>{tab === "leave" ? "Reason" : "Submitted"}</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Open</th>
                </tr>
              </thead>
              <tbody>
                {d.items.map((i) => (
                  <tr key={i.id}>
                    <td className={td}>
                      <Person name={i.name} sub={tab === "enrolment" ? i.grade : tab === "leave" || tab === "teaching" ? i.detail : i.code} />
                    </td>
                    <td className={`${td} text-ink-soft`}>
                      {tab === "leave" ? (
                        <>
                          {i.fromDate === i.toDate ? i.fromDate : `${i.fromDate} → ${i.toDate}`}
                          <span className="block text-[12px] text-muted">
                            {i.days} day{i.days === 1 ? "" : "s"}
                            {i.kind === "STAFF" ? " · staff" : ""}
                          </span>
                        </>
                      ) : tab === "teaching" ? (
                        <TeachingChanges changes={i.changes ?? []} decided={i.status !== "PENDING"} />
                      ) : (
                        i.detail
                      )}
                    </td>
                    <td className={`${td} max-w-[280px] text-ink-soft`}>{tab === "leave" ? <span className="line-clamp-2">{i.reason}</span> : when(i.submittedAt)}</td>
                    <td className={td}>{statusPill(i.status)}</td>
                    <td className={`${td} text-right`}>
                      {tab === "leave" || tab === "teaching" ? (
                        i.status === "PENDING" ? (
                          tab === "leave" ? <LeaveActions id={i.id} /> : <TeachingActions id={i.id} />
                        ) : (
                          <span className="text-[12px] text-muted">{i.decisionNote ?? "—"}</span>
                        )
                      ) : (
                        <Link href={reviewHref(i)} className={i.status === "PENDING" || i.status === "INFO_REQUESTED" ? btn.darkSm : btn.whiteSm}>
                          {i.status === "PENDING" || i.status === "INFO_REQUESTED" ? "Review" : "View"}
                        </Link>
                      )}
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
