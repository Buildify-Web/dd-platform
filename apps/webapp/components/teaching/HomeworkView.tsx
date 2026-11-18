import { IBook } from "@/components/portal/icons";
import { Card, cx, Empty } from "@/components/ui/kit";
import { api, param, type SearchParams } from "@/lib/api";
import { classOptions, classQuery, getMeta, pickFromParams } from "@/lib/portal";
import { ClassPicker } from "./ClassPicker";
import { GiveHomeworkButton, SubmissionPanel, type HomeworkDetail } from "./HomeworkClient";
import Link from "next/link";

type Card = { id: string; title: string; due: { text: string; tone: "danger" | "warn" | "neutral" | "muted" }; given: string; submitted: number; checked: number; toCheck: number };

const dueTone = { danger: "bg-danger-tint text-danger-ink", warn: "bg-sun-tint text-[#5c4700]", neutral: "bg-soft text-ink-soft", muted: "bg-soft text-muted" };
const stTone = {
  SUBMITTED: "bg-cream text-ink",
  CHECKED: "bg-ok-tint text-ink",
  REDO: "bg-danger-tint text-ink",
  NONE: "bg-frame text-muted",
};
const stLabel = { SUBMITTED: "To check", CHECKED: "Checked", REDO: "Needs redo", NONE: "Not submitted" };

/** Design: "Homework & feedback". Admin uses Grade + Subject selects; staff use class tabs. */
export async function HomeworkView({ portal, searchParams }: { portal: "admin" | "staff"; searchParams: SearchParams }) {
  const sp = await searchParams;
  const meta = await getMeta(portal);
  const opts = classOptions(meta, portal);
  const picked = pickFromParams(opts, param(sp.grade), param(sp.class));
  const base = `/${portal}/homework`;
  const header = (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <h1 className="flex flex-wrap items-baseline gap-x-3 text-[clamp(1.4rem,2.2vw,1.65rem)] font-normal">
        Homework <span className="text-[12.5px] text-muted">{portal === "admin" ? "Academics / Homework" : "Teaching"}</span>
      </h1>
      {picked.cls && <GiveHomeworkButton cls={picked.cls} />}
    </div>
  );
  if (!picked.cls)
    return (
      <>
        {header}
        <Card>
          <Empty title="No classes yet" icon={<IBook className="size-5" />} />
        </Card>
      </>
    );
  const cls = picked.cls;
  const list = await api<{ total: number; rows: Card[] }>(`/v1/homework?${classQuery(cls)}`, portal);
  const selectedId = list.rows.find((h) => h.id === param(sp.hw))?.id ?? list.rows[0]?.id;
  const detail = selectedId ? await api<HomeworkDetail>(`/v1/homework/${selectedId}`, portal) : null;
  const studentId = param(sp.student) || detail?.students.find((s) => s.submission?.status === "SUBMITTED")?.studentId || detail?.students[0]?.studentId;
  const link = (patch: Record<string, string>) => {
    const u = new URLSearchParams({ class: cls.key, ...(picked.grade ? { grade: picked.grade } : {}), ...(selectedId ? { hw: selectedId } : {}), ...patch });
    return `${base}?${u.toString()}`;
  };

  return (
    <>
      {header}
      <div className="mb-3">
        <ClassPicker portal={portal} options={opts} picked={picked} base={base} clear={["hw", "student"]} />
      </div>
      {list.rows.length === 0 ? (
        <Card>
          <Empty title="No homework in the last month" icon={<IBook className="size-5" />}>
            Use “+ Give homework”. Parents are notified and submit from the app.
          </Empty>
        </Card>
      ) : (
        <>
          <div className="mb-3 grid gap-3 md:grid-cols-3">
            {list.rows.slice(0, 6).map((h) => {
              const total = list.total || 1;
              return (
                <Link key={h.id} href={link({ hw: h.id, student: "" })} scroll={false} className={cx("lift block rounded-[18px] border bg-white p-4", h.id === selectedId ? "border-ink" : "border-line")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cx("rounded-md px-2 py-0.5 text-[11.5px]", dueTone[h.due.tone])}>{h.due.text}</span>
                    <span className="text-[12px] text-muted">{h.given}</span>
                  </div>
                  <p className="mt-3 truncate text-[15.5px] font-semibold">{h.title}</p>
                  <div className="mt-3 flex justify-between text-[12.5px] text-ink-soft">
                    <span>
                      {h.submitted} of {list.total} submitted
                    </span>
                    <span>{h.checked} checked</span>
                  </div>
                  <span className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-soft">
                    <span className="bg-brand" style={{ width: `${(h.checked / total) * 100}%` }} />
                    <span className="bg-sun" style={{ width: `${(Math.max(0, h.submitted - h.checked) / total) * 100}%` }} />
                  </span>
                </Link>
              );
            })}
          </div>
          {detail && (
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <Card
                title="Students"
                action={
                  <span className="flex gap-3 text-[11.5px] text-muted">
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-sun" />
                      To check
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-brand" />
                      Checked
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-[#d8dbd2]" />
                      Not submitted
                    </span>
                  </span>
                }
              >
                {detail.students.length === 0 ? (
                  <p className="text-[13.5px] text-muted">No students in this class.</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                    {detail.students.map((s) => {
                      const st = (s.submission?.status ?? "NONE") as keyof typeof stTone;
                      return (
                        <li key={s.studentId}>
                          <Link
                            href={link({ student: s.studentId })}
                            scroll={false}
                            className={cx("flex flex-col items-center rounded-2xl border px-2 py-4 text-center transition-colors", stTone[st], s.studentId === studentId ? "border-ink" : "border-transparent")}
                          >
                            <span className={cx("grid size-11 place-items-center rounded-full bg-white text-[14px] font-semibold", st === "NONE" && "text-muted")}>{s.initials}</span>
                            <span className="mt-2 truncate text-[14px] font-semibold">{s.name.split(" ")[0]}</span>
                            <span className="text-[12px] text-ink-soft">{stLabel[st]}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
              <SubmissionPanel key={`${detail.homework.id}${studentId}`} student={detail.students.find((s) => s.studentId === studentId) ?? null} homework={detail.homework} />
            </div>
          )}
        </>
      )}
    </>
  );
}
