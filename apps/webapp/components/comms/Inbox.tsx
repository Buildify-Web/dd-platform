import Link from "next/link";
import { IBell, ICalendar, ICard, IClock, IUser, IWarn } from "@/components/portal/icons";
import { DateFilter } from "@/components/ui/DateFilter";
import { ActionButton } from "@/components/ui/client";
import { btn, cx, Empty } from "@/components/ui/kit";
import { api, param, qs, type SearchParams } from "@/lib/api";
import { markAllNotificationsRead } from "@/lib/actions";
import { NotificationAction } from "./InboxClient";

type Item = { id: string; time: string; category: string; group: string; title: string; body: string; actionLabel: string | null; href: string | null; read: boolean; urgent: boolean };
type Data = { greeting: string; unread: number; urgent: number; counts: Record<string, number>; days: { label: string; items: Item[] }[] };

const GROUPS = {
  admin: [
    { key: "all", label: "All", dot: "bg-[#d8dbd2]" },
    { key: "unread", label: "Unread", dot: "bg-[#e7a9a0]" },
    { key: "approvals", label: "Approvals", dot: "bg-sun" },
    { key: "payments", label: "Payments", dot: "bg-brand" },
    { key: "system", label: "System", dot: "bg-ink" },
  ],
  staff: [
    { key: "all", label: "All", dot: "bg-[#d8dbd2]" },
    { key: "unread", label: "Unread", dot: "bg-[#e7a9a0]" },
    { key: "admin", label: "Admin", dot: "bg-sun" },
    { key: "classes", label: "Classes", dot: "bg-brand" },
  ],
};

const GROUP_LABEL: Record<string, string> = { approvals: "Approvals", payments: "Payments", system: "System", admin: "Admin", classes: "Classes" };
const groupStyle = (g: string) =>
  g === "approvals" || g === "admin"
    ? { label: "text-[#8a6d00]", dot: "bg-sun text-ink" }
    : g === "payments" || g === "classes"
      ? { label: "text-brand", dot: "bg-brand text-white" }
      : { label: "text-ink", dot: "bg-ink text-white" };
const icon = (i: Item) =>
  i.category === "PAYMENTS" || i.category === "FEES" ? <ICard className="size-3.5" /> : i.category === "SYSTEM" ? <IWarn className="size-3.5" /> : i.title.toLowerCase().includes("leave") ? <ICalendar className="size-3.5" /> : i.category === "APPROVALS" ? <IUser className="size-3.5" /> : <IBell className="size-3.5" />;

/** Design: "Notifications" (Inbox) for both portals. Newest first, filter by date. */
export async function Inbox({ portal, searchParams }: { portal: "admin" | "staff"; searchParams: SearchParams }) {
  const sp = await searchParams;
  const filter = param(sp.filter) || "all";
  const date = param(sp.date);
  const d = await api<Data>(`/v1/notifications${qs({ filter, date })}`, portal);
  const base = `/${portal}/notifications`;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="flex items-baseline gap-3 text-[clamp(1.4rem,2.2vw,1.65rem)] font-normal">
          Notifications <span className="text-[12.5px] text-muted">Inbox</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <DateFilter value={date} label="Filter by date" />
          {date && (
            <Link href={`${base}${qs({ filter: filter === "all" ? "" : filter })}`} className={btn.ghost}>
              Clear date
            </Link>
          )}
          <ActionButton className={btn.white} action={markAllNotificationsRead} success="All caught up." disabled={!d.unread}>
            Mark all as read
          </ActionButton>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[236px_minmax(0,1fr)]">
        <div className="grid content-start gap-3">
          <section className="rounded-[20px] bg-ink p-4 text-white">
            <p className="text-[16px] font-semibold">{d.greeting}</p>
            <p className="mt-3 flex items-baseline gap-1.5">
              <span className="text-[32px] leading-none font-semibold tabular-nums">{d.unread}</span>
              <span className="text-[13px] text-white/75">unread</span>
            </p>
            {d.urgent > 0 && (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-[12.5px] text-sun">
                <IClock className="size-4" />
                {d.urgent} need{d.urgent === 1 ? "s" : ""} you today
              </p>
            )}
          </section>
          <nav className="rounded-[20px] bg-white p-2" aria-label="Filter">
            {GROUPS[portal].map((g) => {
              const active = g.key === filter;
              return (
                <Link
                  key={g.key}
                  href={`${base}${qs({ filter: g.key === "all" ? "" : g.key, date })}`}
                  aria-current={active ? "page" : undefined}
                  className={cx("flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors", active ? "bg-ink text-white" : "hover:bg-soft")}
                >
                  <span className={cx("size-2 rounded-full", g.dot, active && g.key === "all" && "bg-white/70")} />
                  <span className="flex-1">{g.label}</span>
                  <span className={cx("grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[11.5px] tabular-nums", active ? "bg-sun text-ink" : "bg-soft text-ink-soft")}>{d.counts[g.key] ?? 0}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="min-w-0">
          {d.days.length === 0 ? (
            <div className="rounded-[18px] border border-line bg-white">
              <Empty title="No notifications here" icon={<IBell className="size-5" />}>
                {date ? "Nothing on that date." : "You're all caught up."}
              </Empty>
            </div>
          ) : (
            d.days.map((day) => (
              <section key={day.label} className="mb-4">
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-[13px] text-muted">{day.label}</h2>
                  <span className="h-px flex-1 bg-line" />
                </div>
                <ol className="relative grid gap-3">
                  <span className="absolute top-4 bottom-4 left-[86px] hidden w-px bg-line sm:block" aria-hidden />
                  {day.items.map((i) => {
                    const st = groupStyle(i.group);
                    return (
                      <li key={i.id} className="grid items-center gap-2 sm:grid-cols-[66px_40px_minmax(0,1fr)] sm:gap-0">
                        <span className="hidden text-right text-[12.5px] whitespace-nowrap text-muted sm:block">{i.time}</span>
                        <span className="hidden justify-center sm:flex">
                          <span className={cx("relative z-10 grid size-7 place-items-center rounded-full ring-4 ring-frame", st.dot)}>{icon(i)}</span>
                        </span>
                        <div className={cx("flex flex-wrap items-center gap-3 rounded-[18px] border bg-white px-4 py-3.5 sm:flex-nowrap sm:px-5", i.read ? "border-line" : "border-line shadow-[0_8px_24px_-18px_rgba(23,38,15,.5)]")}>
                          <div className="min-w-0 flex-1">
                            <p className={cx("text-[11.5px] font-semibold", st.label)}>
                              {GROUP_LABEL[i.group] ?? "Update"}
                              <span className="ml-2 font-normal text-muted sm:hidden">{i.time}</span>
                            </p>
                            <p className={cx("text-[15px]", !i.read && "font-semibold")}>{i.title}</p>
                            <p className="text-[13px] text-ink-soft">{i.body}</p>
                          </div>
                          <NotificationAction id={i.id} href={i.href} label={i.actionLabel ?? "Open"} read={i.read} />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))
          )}
        </div>
      </div>
    </>
  );
}
