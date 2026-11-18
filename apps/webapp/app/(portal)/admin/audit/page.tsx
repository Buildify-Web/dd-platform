import { AUDIT_AREAS, auditAreaLabel, istDate } from "@dd/shared/domain";
import type { Metadata } from "next";
import { IHistory } from "@/components/portal/icons";
import { FilterSelect, SearchBox } from "@/components/ui/client";
import { DateFilter } from "@/components/ui/DateFilter";
import { btn, Card, cx, Empty, PageHeader, Pill } from "@/components/ui/kit";
import { api, param, qs, type SearchParams } from "@/lib/api";
import { addDays } from "@/lib/date-utils";
import { requireAdmin } from "@/lib/portal";

export const metadata: Metadata = { title: "Audit log" };

type Entry = { id: string; actorName: string; actorRole: string; summary: string; areaLabel: string; area: string; fromLabel: string | null; toLabel: string | null; time: string; client: string | null };
type Data = {
  days: { label: string; items: Entry[] }[];
  next: string | null;
  week: { total: number; perDay: { label: string; count: number; weekend: boolean }[] };
  byArea: { area: string; label: string; count: number }[];
  mostActive: { name: string; role: string; count: number }[];
};

const tone = (a: string) => (a === "FEES" ? "green" : a === "APPROVALS" ? "sun" : a === "ATTENDANCE" ? "blue" : a === "MARKS" ? "sage" : "red") as "green" | "sun" | "blue" | "sage" | "red";

/** Design: "Audit log" (System / Audit log). Read-only, kept permanently. */
export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/audit");
  const sp = await searchParams;
  const f = { area: param(sp.area), q: param(sp.q), from: param(sp.from) || addDays(istDate(), -6), to: param(sp.to) || istDate() };
  const d = await api<Data>(`/v1/audit${qs(f)}`);
  const max = Math.max(1, ...d.week.perDay.map((x) => x.count));
  const areaMax = Math.max(1, ...d.byArea.map((x) => x.count));
  return (
    <>
      <PageHeader
        title="Audit log"
        crumb="System / Audit log"
        actions={
          <>
            <DateFilter name="from" label="From" value={f.from} max={f.to} />
            <span className="text-[12.5px] text-muted">to</span>
            <DateFilter name="to" label="To" value={f.to} min={f.from} max={istDate()} />
            <a href={`/api/export${qs({ src: "audit/export", ...f, format: "csv" })}`} className={btn.dark}>
              Export CSV
            </a>
          </>
        }
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <Card className="mb-3">
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect name="area" label="Area" className="w-[170px]" value={f.area} options={[{ value: "", label: "All areas" }, ...AUDIT_AREAS.map((a) => ({ value: a, label: auditAreaLabel[a] }))]} />
              <SearchBox value={f.q} placeholder="Search who or what" className="min-w-0 flex-1" />
            </div>
          </Card>
          {d.days.length === 0 ? (
            <Card>
              <Empty title="Nothing in this range" icon={<IHistory className="size-5" />} />
            </Card>
          ) : (
            d.days.map((day) => (
              <section key={day.label} className="mb-4">
                <h2 className="mb-2 px-1 text-[13px] text-muted">{day.label}</h2>
                <ul className="grid gap-2.5">
                  {day.items.map((e) => (
                    <li key={e.id} className="rounded-[18px] border border-line bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 text-[14px] leading-relaxed">
                          <span className="font-semibold">{e.actorName}</span>{" "}
                          <span className="rounded-md bg-soft px-1.5 py-px text-[11px] text-ink-soft">{e.actorRole}</span> {e.summary}
                        </p>
                        <span className="shrink-0 text-[12px] text-muted">{e.time}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                        <Pill tone={tone(e.area)}>{e.areaLabel}</Pill>
                        {e.fromLabel && e.toLabel && (
                          <>
                            <span className="rounded-full bg-soft px-2.5 py-1 text-ink-soft">{e.fromLabel}</span>
                            <span className="text-muted">→</span>
                            <span className="rounded-full bg-ink px-2.5 py-1 text-sun">{e.toLabel}</span>
                          </>
                        )}
                        {e.client && <span className="ml-auto text-muted">{e.client}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
          <p className="mt-2 text-center text-[12px] text-muted">Records are read-only and kept permanently.</p>
        </div>
        <div className="grid content-start gap-3">
          <section className={cx("rounded-[20px] p-5", "bg-ink text-white")}>
            <p className="text-[13px] text-white/75">Changes in range</p>
            <p className="mt-1 text-[40px] leading-none font-semibold tabular-nums">{d.week.total}</p>
            <div className="mt-5 flex h-24 items-end gap-2">
              {d.week.perDay.map((x) => (
                <div key={x.label} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className={cx("w-full rounded-md", x.weekend ? "bg-sun" : "bg-sage")} style={{ height: `${Math.max(4, (x.count / max) * 100)}%` }} />
                  <span className="mt-1.5 text-[11px] text-white/70">{x.label}</span>
                </div>
              ))}
            </div>
          </section>
          <Card title="By area">
            <ul className="grid gap-3">
              {d.byArea.map((a) => (
                <li key={a.area}>
                  <div className="mb-1 flex justify-between text-[13.5px]">
                    <span>{a.label}</span>
                    <span className="tabular-nums">{a.count}</span>
                  </div>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-soft">
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${(a.count / areaMax) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Most active">
            <ul className="divide-y divide-line">
              {d.mostActive.map((m) => (
                <li key={m.name} className="flex items-center justify-between py-2.5 text-[13.5px]">
                  <span>
                    {m.name}
                    <span className="block text-[12px] text-muted">{m.role}</span>
                  </span>
                  <span className="tabular-nums">{m.count}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
