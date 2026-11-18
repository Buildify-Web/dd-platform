import { IFile } from "@/components/portal/icons";
import { Card, Empty, LinkTabs, Notice, PageHeader, Pill } from "@/components/ui/kit";
import { api, param, type SearchParams } from "@/lib/api";
import { getMeta } from "@/lib/portal";
import { PaperActions, UploadPaperButton } from "./PapersClient";

type Data = {
  counts: { AWAITING: number; ACTIVE: number; DELETED: number };
  rows: { id: string; title: string; file: string; fileId: string | null; forLabel: string; uploaded: string; status: "AWAITING" | "ACTIVE" | "DELETED"; mine: boolean }[];
};

const statusPill = { AWAITING: <Pill tone="sun">Awaiting activation</Pill>, ACTIVE: <Pill tone="green">Active</Pill>, DELETED: <Pill tone="red">Deleted</Pill> };

/** Designs: admin "Question papers" and staff "Question Paper". */
export async function PapersView({ portal, searchParams }: { portal: "admin" | "staff"; searchParams: SearchParams }) {
  const sp = await searchParams;
  const status = (["AWAITING", "ACTIVE", "DELETED"].includes(param(sp.status)) ? param(sp.status) : "AWAITING") as keyof Data["counts"];
  const [d, meta] = await Promise.all([api<Data>(`/v1/question-papers?status=${status}`, portal), getMeta(portal)]);
  const base = `/${portal}/question-papers`;
  return (
    <>
      <PageHeader title="Question papers" crumb={portal === "admin" ? "Academics / Question papers" : "Teaching / Question papers"} actions={<UploadPaperButton classes={meta.classes} admin={portal === "admin"} courses={meta.courses} />} />
      {portal === "admin" ? (
        <Notice className="mb-3">Only activated papers are shown to parents, as links. Deleted papers and their links stop working.</Notice>
      ) : (
        <Notice tone="blue" className="mb-3">
          Papers you upload stay hidden from parents until admin activates them. Admin is alerted on each upload.
        </Notice>
      )}
      <Card pad={false}>
        <div className="px-4 pt-2 sm:px-5">
          <LinkTabs
            active={status}
            tabs={[
              { key: "AWAITING", label: "Awaiting activation", href: base, count: d.counts.AWAITING },
              { key: "ACTIVE", label: "Active", href: `${base}?status=ACTIVE`, count: d.counts.ACTIVE },
              { key: "DELETED", label: "Deleted", href: `${base}?status=DELETED`, count: d.counts.DELETED },
            ]}
          />
        </div>
        {d.rows.length === 0 ? (
          <Empty title={status === "AWAITING" ? "Nothing waiting" : status === "ACTIVE" ? "No active papers" : "Nothing deleted"} icon={<IFile className="size-5" />}>
            {status === "AWAITING" ? "Uploaded papers wait here until admin activates them." : null}
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13.5px]">
              <thead>
                <tr className="text-[12px] text-muted">
                  <th className="border-b border-line px-4 py-3 font-normal sm:pl-5">Paper</th>
                  <th className="border-b border-line px-4 py-3 font-normal">For</th>
                  <th className="border-b border-line px-4 py-3 font-normal">Uploaded</th>
                  <th className="border-b border-line px-4 py-3 font-normal">Status</th>
                  <th className="border-b border-line px-4 py-3 text-right font-normal sm:pr-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="border-b border-line px-4 py-3 sm:pl-5">
                      <span className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sage text-brand">
                          <IFile className="size-[18px]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate">{r.title}</span>
                          <span className="block text-[12px] text-muted">{r.file}</span>
                        </span>
                      </span>
                    </td>
                    <td className="border-b border-line px-4 py-3 font-medium whitespace-nowrap">{r.forLabel}</td>
                    <td className="border-b border-line px-4 py-3 whitespace-nowrap text-ink-soft">{r.uploaded}</td>
                    <td className="border-b border-line px-4 py-3">{statusPill[r.status]}</td>
                    <td className="border-b border-line px-4 py-3 sm:pr-5">
                      <PaperActions id={r.id} fileId={r.fileId} status={r.status} admin={portal === "admin"} mine={r.mine} title={r.title} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
