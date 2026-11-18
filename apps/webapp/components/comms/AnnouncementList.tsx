import Link from "next/link";
import { IMegaphone, ITrash } from "@/components/portal/icons";
import { ActionButton } from "@/components/ui/client";
import { btn, Card, Empty, PageHeader, Pill } from "@/components/ui/kit";
import { api } from "@/lib/api";
import { deleteAnnouncement, sendAnnouncement } from "@/lib/actions";

type Row = { id: string; kind: string; title: string; message: string; audienceLabel: string; recipients: number; status: "DRAFT" | "SCHEDULED" | "SENT"; scheduledFor: string | null; sentAt: string | null; createdAt: string; sender: string; attachmentFileId: string | null };

const fmt = (iso: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(iso));

/** Sent, scheduled and draft announcements (admin) or class notices (staff), newest first. */
export async function AnnouncementList({ portal }: { portal: "admin" | "staff" }) {
  const { rows } = await api<{ rows: Row[] }>("/v1/announcements", portal);
  const newHref = portal === "admin" ? "/admin/announcements/new" : "/staff/notices/new";
  return (
    <>
      <PageHeader
        title={portal === "admin" ? "Announcements" : "Class notices"}
        crumb={portal === "admin" ? "Communication / Announcements" : "Communication"}
        actions={
          <Link href={newHref} className={btn.dark}>
            {portal === "admin" ? "New announcement" : "Send class notice"}
          </Link>
        }
      />
      {rows.length === 0 ? (
        <Card>
          <Empty title="Nothing sent yet" icon={<IMegaphone className="size-5" />}>
            {portal === "admin" ? "Announcements go to active parents (and staff if chosen) as a push notification and in the app." : "Notices go to parents of your classes."}
          </Empty>
        </Card>
      ) : (
        <ul className="grid gap-2.5">
          {rows.map((r) => (
            <li key={r.id} className="rounded-[18px] border border-line bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {r.status === "SENT" ? <Pill tone="green">Sent</Pill> : r.status === "SCHEDULED" ? <Pill tone="blue">Scheduled · {r.scheduledFor ? fmt(r.scheduledFor) : ""}</Pill> : <Pill tone="sun">Draft</Pill>}
                    {portal === "admin" && r.kind === "CLASS_NOTICE" && <Pill>Class notice · {r.sender}</Pill>}
                  </div>
                  <h2 className="mt-2 text-[15.5px] font-semibold">{r.title}</h2>
                  <p className="mt-1 text-[13.5px] text-ink-soft">{r.message}</p>
                  <p className="mt-2 text-[12px] text-muted">
                    {r.audienceLabel}
                    {r.status === "SENT" ? ` · ${r.recipients} recipients · ${fmt(r.sentAt!)}` : ` · created ${fmt(r.createdAt)}`}
                    {r.attachmentFileId && (
                      <>
                        {" · "}
                        <a href={`/api/files/${r.attachmentFileId}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                          Attachment
                        </a>
                      </>
                    )}
                  </p>
                </div>
                {(r.status !== "SENT" || portal === "admin") && (
                  <div className="flex gap-2">
                    {r.status !== "SENT" && (
                      <ActionButton className={btn.darkSm} action={sendAnnouncement.bind(null, r.id)} success="Sent." confirm={{ title: `Send "${r.title}" now?`, body: `It goes to ${r.audienceLabel}.`, confirmLabel: "Send now" }}>
                        Send now
                      </ActionButton>
                    )}
                    <ActionButton
                      className={btn.iconDanger}
                      title={r.status === "SENT" ? "Delete announcement" : "Delete draft"}
                      action={deleteAnnouncement.bind(null, r.id)}
                      success="Deleted."
                      confirm={
                        r.status === "SENT"
                          ? {
                              title: `Delete "${r.title}"?`,
                              body: "It's removed from this list and from the parent app. Parents who already got the notification keep it on their phones. This can't be undone.",
                              confirmLabel: "Delete",
                              danger: true,
                            }
                          : { title: "Delete this draft?", confirmLabel: "Delete", danger: true }
                      }
                    >
                      <ITrash className="size-4" />
                    </ActionButton>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
