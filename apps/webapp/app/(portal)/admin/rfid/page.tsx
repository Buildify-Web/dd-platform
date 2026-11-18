import type { Metadata } from "next";
import { IIdCard, IMoon, ISun } from "@/components/portal/icons";
import { ParamSegmented } from "@/components/ui/client";
import { Avatar, btn, Card, cx, Pill, type PillTone } from "@/components/ui/kit";
import { api, param, qs, type SearchParams } from "@/lib/api";
import { addDays } from "@/lib/date-utils";
import { requireAdmin } from "@/lib/portal";
import { istDate } from "@dd/shared/domain";
import { AssignCardButton, LinkUnknown, ReadersMenu } from "./RfidClient";

export const metadata: Metadata = { title: "RFID attendance" };

type Overview = {
  checkIns: { total: number; expected: number; morning: number; evening: number; repeats: number };
  histogram: { morning: { label: string; count: number }[]; evening: { label: string; count: number }[]; peak: string | null };
  devices: { id: string; name: string; location: string | null; online: boolean; tapsToday: number; lastTap: string; lastHeartbeat: string | null; offlineSince: string | null }[];
  live: { session: "MORNING" | "EVENING"; taps: { id: string; time: string; name: string; detail: string; device: string; result: string }[] };
  unknownCards: { uid: string; at: string; device: string }[];
  coverage: { withCard: number; total: number; missing: { id: string; name: string; grade: string }[]; missingCount: number };
};

const result: Record<string, [string, PillTone]> = {
  PRESENT: ["Present", "green"],
  LATE: ["Late", "blue"],
  REPEAT: ["Repeat · ignored", "grey"],
  UNKNOWN: ["Unknown", "cream"],
  DISABLED_CARD: ["Disabled card", "red"],
  STAFF: ["Staff", "sage"],
};

function Ring({ value, max }: { value: number; max: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const pct = max ? Math.min(1, value / max) : 0;
  return (
    <div className="relative size-[168px] shrink-0">
      <svg viewBox="0 0 168 168" className="size-full -rotate-90" aria-hidden>
        <circle cx="84" cy="84" r={r} fill="none" stroke="rgba(23,38,15,.12)" strokeWidth="14" />
        <circle cx="84" cy="84" r={r} fill="none" stroke="#17260f" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-[34px] leading-none font-semibold tabular-nums">{value}</p>
          <p className="mt-1 text-[11.5px] text-ink/75">of {max} expected</p>
        </div>
      </div>
    </div>
  );
}

function Reader({ d }: { d: Overview["devices"][number] }) {
  return (
    <div className={cx("flex gap-4 rounded-[18px] p-4", d.online ? "bg-frame" : "bg-danger-tint")}>
      <div className="relative w-[92px] shrink-0 rounded-[14px] bg-[#232323] p-2 pb-3 shadow-inner" aria-hidden>
        <span className={cx("mx-auto mb-2 block h-1 w-8 rounded-full", d.online ? "bg-[#62e13b] shadow-[0_0_8px_#62e13b]" : "bg-[#e5523b] shadow-[0_0_8px_#e5523b]")} />
        <div className={cx("rounded-md px-1.5 py-1.5 font-mono", d.online ? "bg-[#c8d6b4] text-[#1d2a12]" : "bg-[#b9bdb4] text-[#5b5f57]")}>
          <p className="text-[8px] leading-none">{d.online ? "01" : "02"}</p>
          <p className="text-center text-[17px] leading-tight font-bold tabular-nums">{d.online ? d.tapsToday : "—"}</p>
          <p className="text-center text-[6.5px] leading-none tracking-wider">{d.online ? "TAPS TODAY" : "NO LINK"}</p>
        </div>
        <span className="mx-auto mt-2.5 grid size-9 place-items-center rounded-full border-2 border-[#3a3a3a] text-[#888]">)))</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[14.5px] font-semibold">{d.name}</p>
          {d.online ? <Pill tone="green">Online</Pill> : <Pill tone="red">Offline</Pill>}
        </div>
        <p className="text-[12px] text-muted">
          {d.location ?? "—"} · last tap {d.lastTap}
        </p>
        <svg viewBox="0 0 160 30" className="mt-auto h-8 w-full" aria-hidden>
          {d.online ? (
            <polyline fill="none" stroke="#2b7010" strokeOpacity=".55" strokeWidth="1.3" points="0,16 18,16 22,8 26,24 30,16 52,16 56,9 60,23 64,16 90,16 94,7 98,25 102,16 128,16 132,9 136,23 140,16 156,16" />
          ) : (
            <polyline fill="none" stroke="#c2341f" strokeWidth="1.3" points="0,16 14,16 18,8 22,24 26,16 156,16" />
          )}
          <circle cx="156" cy="16" r="2.5" fill={d.online ? "#2b7010" : "#c2341f"} />
        </svg>
        <p className={cx("text-[12px]", d.online ? "text-muted" : "text-danger-ink")}>{d.online ? "Sending heartbeats normally" : `No heartbeat since ${d.lastHeartbeat ?? "—"}. Check power or Wi-Fi.`}</p>
      </div>
    </div>
  );
}

/** Design: "RFID devices, cards & scans" (System / RFID). */
export default async function RfidPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/rfid");
  const sp = await searchParams;
  const d = await api<Overview>(`/v1/rfid/overview${qs({ session: param(sp.session) })}`);
  const all = [...d.histogram.morning, ...d.histogram.evening];
  const maxBar = Math.max(1, ...all.map((b) => b.count));
  const today = istDate();
  const dots = Math.min(d.coverage.total, 240);
  const scale = d.coverage.total ? dots / d.coverage.total : 1;
  const greenDots = Math.round(d.coverage.withCard * scale);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="flex flex-wrap items-baseline gap-x-3 text-[clamp(1.4rem,2.2vw,1.65rem)] font-normal">
          RFID attendance <span className="text-[12.5px] text-muted">System / RFID</span>
        </h1>
        <div className="flex gap-2">
          <AssignCardButton />
          <a href={`/api/export${qs({ src: "rfid/scans/export", from: addDays(today, -6), to: today, format: "csv" })}`} className={btn.dark}>
            Download scan log
          </a>
        </div>
      </div>

      <div className="mb-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
        <section className="flex flex-wrap items-center gap-6 rounded-[20px] bg-sun p-5">
          <Ring value={d.checkIns.total} max={d.checkIns.expected} />
          <div className="grid gap-3">
            <p className="text-[14px]">Check-ins today</p>
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-white">
                <ISun className="size-5" />
              </span>
              <p className="leading-tight">
                <span className="block text-[18px] font-semibold tabular-nums">{d.checkIns.morning}</span>
                <span className="text-[12px] text-ink/75">Morning</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-ink text-white">
                <IMoon className="size-5" />
              </span>
              <p className="leading-tight">
                <span className="block text-[18px] font-semibold tabular-nums">{d.checkIns.evening}</span>
                <span className="text-[12px] text-ink/75">Evening</span>
              </p>
            </div>
            <p className="text-[12px] text-ink/75">{d.checkIns.repeats} repeat taps ignored</p>
          </div>
        </section>
        <Card title="When students arrive" action={<span className="text-[12px] text-muted">Taps per 30 minutes · today</span>}>
          <div className="flex h-40 items-end gap-1.5 sm:gap-2" role="img" aria-label="Taps per 30 minutes today">
            {all.map((b, i) => {
              const morning = i < d.histogram.morning.length;
              const strong = b.count >= maxBar * 0.6;
              return (
                <div key={`${b.label}${i}`} className={cx("flex h-full min-w-0 flex-1 flex-col items-center justify-end", i === d.histogram.morning.length && "ml-2 sm:ml-4")}>
                  <span className="mb-1 text-[11px] text-ink-soft tabular-nums">{b.count || ""}</span>
                  <span
                    className={cx("w-full rounded-t-[10px]", morning ? (strong ? "bg-sun" : "bg-[#f9e08a]") : strong ? "bg-brand" : "bg-[#9cbf86]")}
                    style={{ height: `${Math.max(3, (b.count / maxBar) * 100)}%` }}
                  />
                  <span className="mt-1.5 text-[10.5px] text-muted">{b.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
            <span className="flex gap-4">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-sun" />
                Morning session
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-brand" />
                Evening session
              </span>
            </span>
            {d.histogram.peak && <span>Peak · {d.histogram.peak}</span>}
          </div>
        </Card>
      </div>

      <Card title="Readers" action={<ReadersMenu />} className="mb-3">
        {d.devices.length === 0 ? (
          <p className="text-[13.5px] text-muted">No readers yet. Add one to get its device key.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {d.devices.map((x) => (
              <Reader key={x.id} d={x} />
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card
          title={
            <span className="flex items-center gap-2">
              Live taps <Pill tone="green">Live</Pill>
            </span>
          }
          action={<ParamSegmented name="session" label="Session" value={d.live.session} options={[{ value: "MORNING", label: "Morning" }, { value: "EVENING", label: "Evening" }]} />}
          pad={false}
          className="self-start"
        >
          {d.live.taps.length === 0 ? (
            <p className="px-5 pb-6 text-[13.5px] text-muted">No taps in this session yet.</p>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {d.live.taps.map((t) => {
                const [label, tone] = result[t.result] ?? [t.result, "grey" as PillTone];
                const [hm, ap] = t.time.split(" ");
                return (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="grid w-12 shrink-0 place-items-center rounded-lg bg-frame py-1 text-center leading-tight">
                      <span className="text-[13px] font-semibold tabular-nums">{hm}</span>
                      <span className="text-[9.5px] text-muted">{ap}</span>
                    </span>
                    <Avatar name={t.name === "Unknown card" ? "?" : t.name} size={30} tone={t.name === "Unknown card" ? "bg-cream" : undefined} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px]">{t.name}</span>
                      <span className="block truncate text-[12px] text-muted">{t.detail}</span>
                    </span>
                    <span className="hidden rounded-md bg-ink px-2 py-0.5 text-[11.5px] text-sun sm:inline">{t.device}</span>
                    <Pill tone={tone}>{label}</Pill>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <div className="grid content-start gap-3">
          <Card title="Unknown cards" action={<span className="grid h-6 min-w-6 place-items-center rounded-full bg-sun px-1.5 text-[12px] font-semibold">{d.unknownCards.length}</span>}>
            <p className="-mt-2 mb-3 text-[12.5px] text-muted">Tapped but not linked to a student.</p>
            {d.unknownCards.length === 0 ? (
              <p className="text-[13.5px] text-muted">None. Every tap matched a card.</p>
            ) : (
              <ul className="grid gap-2 rounded-2xl bg-frame p-2">
                {d.unknownCards.map((u) => (
                  <li key={u.uid} className="flex items-center gap-3 rounded-xl px-2 py-2">
                    <span className="grid h-8 w-11 place-items-center rounded-md bg-white text-muted shadow-sm">
                      <IIdCard className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[13.5px] font-semibold">{u.uid}</span>
                      <span className="block text-[12px] text-muted">
                        Tapped at {u.device} · {u.at}
                      </span>
                    </span>
                    <LinkUnknown uid={u.uid} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Card coverage" action={<span className="text-[14px] font-semibold tabular-nums">{d.coverage.withCard} / {d.coverage.total}</span>}>
            <div className="flex flex-wrap gap-[3px]" aria-label={`${d.coverage.withCard} of ${d.coverage.total} active students have a card`} role="img">
              {Array.from({ length: dots }, (_, i) => (
                <span key={i} className={cx("size-[9px] rounded-full", i < greenDots ? "bg-brand" : "bg-sun")} />
              ))}
            </div>
            <p className="mt-3 text-[12.5px] text-muted">
              {d.coverage.missingCount} student{d.coverage.missingCount === 1 ? "" : "s"} without a card
            </p>
            <ul className="mt-1 divide-y divide-line">
              {d.coverage.missing.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 py-2.5 text-[13.5px]">
                  <span>
                    {s.name} · {s.grade}
                  </span>
                  <AssignCardButton studentId={s.id} studentName={s.name} compact />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
