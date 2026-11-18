import { formatINR, type Grade } from "@dd/shared/domain";
import type { Metadata } from "next";
import { ITrophy } from "@/components/portal/icons";
import { Card, cx, Empty, PageHeader, Pill } from "@/components/ui/kit";
import { api } from "@/lib/api";
import { shortDay } from "@/lib/date-utils";
import { gradeRange } from "@/lib/format";
import { requireAdmin } from "@/lib/portal";
import { CompetitionActions, CompetitionDialogButton, type CompetitionRow } from "./CompetitionForm";

export const metadata: Metadata = { title: "Competitions" };

/**
 * Competitions: name, date, registration + transport fee, sub-competitions with their own
 * fees (all editable any time). Parents of the eligible grades are notified on creation and
 * choose events with checkboxes in the app: total = selected fees + transport.
 */
export default async function CompetitionsPage() {
  await requireAdmin("/admin/competitions");
  const { rows } = await api<{ rows: (CompetitionRow & { upcoming: boolean; archived: boolean; registrations: number })[] }>("/v1/competitions");
  return (
    <>
      <PageHeader title="Competitions" crumb="Academics / Competitions" actions={<CompetitionDialogButton />} />
      {rows.length === 0 ? (
        <Card>
          <Empty title="No competitions yet" icon={<ITrophy className="size-5" />}>
            Create one and parents of the eligible grades are notified.
          </Empty>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <Card key={c.id} className={cx("flex flex-col", c.archived && "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sun-soft">
                  <ITrophy className="size-5" />
                </span>
                {c.archived ? <Pill>Archived</Pill> : c.upcoming ? <Pill tone="green">Upcoming</Pill> : <Pill>Completed</Pill>}
              </div>
              <h2 className="mt-3 text-[16.5px] font-semibold">{c.name}</h2>
              <p className="text-[12.5px] text-muted">
                {shortDay(c.date)} · {gradeRange(c.grades as Grade[])}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
                <div className="rounded-xl bg-frame px-3 py-2">
                  <dt className="text-[11.5px] text-muted">Registration</dt>
                  <dd className="tabular-nums">{formatINR(c.registrationFee)}</dd>
                </div>
                <div className="rounded-xl bg-frame px-3 py-2">
                  <dt className="text-[11.5px] text-muted">Transport</dt>
                  <dd className="tabular-nums">{formatINR(c.transportFee)}</dd>
                </div>
              </dl>
              {c.subCompetitions.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-[13px]">
                  {c.subCompetitions.map((s) => (
                    <li key={s.id} className="flex justify-between gap-2">
                      <span className="text-ink-soft">{s.name}</span>
                      <span className="tabular-nums">{formatINR(s.fee)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                <span className="text-[12.5px] text-muted">{c.registrations} registered</span>
                <CompetitionActions c={c} archived={c.archived} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
