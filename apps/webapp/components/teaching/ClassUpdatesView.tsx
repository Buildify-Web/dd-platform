import { IPencil } from "@/components/portal/icons";
import { Card, Empty } from "@/components/ui/kit";
import { api, param, type SearchParams } from "@/lib/api";
import { istDate } from "@dd/shared/domain";
import { addDays, shortDay } from "@/lib/date-utils";
import { classOptions, getMeta, pickFromParams } from "@/lib/portal";
import { ClassPicker } from "./ClassPicker";
import { DeleteUpdate, PostUpdateForm } from "./ClassUpdatesClient";

type Row = { id: string; classLabel: string; student: string | null; text: string; homework: string | null; date: string; author: string };

/** Design: "Class Updates" ("What did you teach today?"). Parents of the class are notified. */
export async function ClassUpdatesView({ portal, searchParams }: { portal: "admin" | "staff"; searchParams: SearchParams }) {
  const sp = await searchParams;
  const meta = await getMeta(portal);
  const opts = classOptions(meta, portal);
  const picked = pickFromParams(opts, param(sp.grade), param(sp.class));
  const recent = await api<{ rows: Row[] }>("/v1/class-updates", portal);
  const today = istDate();
  const yesterday = addDays(today, -1);
  const dayLabel = (d: string) => (d === today ? "Today" : d === yesterday ? "Yesterday" : shortDay(d));
  const staffCount = meta.classes.find((c) => c.key === picked.cls?.key)?.studentCount;

  return (
    <>
      <h1 className="mb-4 flex flex-wrap items-baseline gap-x-3 text-[clamp(1.4rem,2.2vw,1.65rem)] font-normal">
        Class Updates <span className="text-[12.5px] text-muted">{portal === "admin" ? "Academics / Class updates" : "Main menu"}</span>
      </h1>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="self-start">
          {!picked.cls ? (
            <Empty title="No classes yet" icon={<IPencil className="size-5" />}>
              Admin assigns your grades and courses first.
            </Empty>
          ) : (
            <>
              <div className="mb-4">
                <ClassPicker portal={portal} options={opts} picked={picked} base={`/${portal}/class-updates`} />
              </div>
              <PostUpdateForm key={picked.cls.key} cls={picked.cls} parents={portal === "staff" ? staffCount : undefined} />
            </>
          )}
        </Card>
        <Card title="Recent" className="self-start">
          {recent.rows.length === 0 ? (
            <p className="text-[13.5px] text-muted">No updates posted yet.</p>
          ) : (
            <ul className="grid gap-2.5">
              {recent.rows.slice(0, 12).map((u) => (
                <li key={u.id} className="group rounded-2xl bg-frame px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13.5px] font-semibold">
                      {u.classLabel}
                      {u.student ? ` · ${u.student}` : ""}
                    </p>
                    <span className="shrink-0 text-[12px] text-muted">{dayLabel(u.date)}</span>
                  </div>
                  <p className="mt-1 text-[13.5px] text-ink-soft">
                    {u.text}
                    {u.homework ? ` Homework: ${u.homework}` : ""}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    {portal === "admin" ? <span className="text-[11.5px] text-muted">by {u.author}</span> : <span />}
                    <DeleteUpdate id={u.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
