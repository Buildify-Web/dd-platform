import { gradeLabel, gradeNumber } from "@dd/shared/domain";
import { IClipboard } from "@/components/portal/icons";
import { Card, cx, Empty } from "@/components/ui/kit";
import { api } from "@/lib/api";
import { getMeta, type ClassInfo } from "@/lib/portal";
import { AssignmentRowActions, NewAssignment } from "./AssignmentsClient";

type Row = { id: string; title: string; classLabel: string; student: string | null; when: string; fileId: string; fileType: "PDF" | "DOC" | "IMG"; opened: number; total: number; teacher: string };

const tile = { PDF: "bg-danger-tint text-danger-ink", DOC: "bg-info-tint text-info-ink", IMG: "bg-ok-tint text-brand-deep" };

/** Design: "Assignments" (Teaching · Grades 9–12). Admin sees every teacher's and can delete any. */
export async function AssignmentsView({ portal }: { portal: "admin" | "staff" }) {
  const [d, meta] = await Promise.all([api<{ rows: Row[] }>("/v1/assignments", portal), getMeta(portal)]);
  // Assignments exist only for Grades 9–12.
  let classes: ClassInfo[] = meta.classes.filter((c) => gradeNumber(c.grade) >= 9);
  if (portal === "admin")
    classes = meta.courses.flatMap((c) =>
      c.grades
        .filter((g) => gradeNumber(g) >= 9)
        .flatMap((g) =>
          (c.subjects.length ? c.subjects : [""]).map((s) => ({
            grade: g,
            courseId: c.id,
            subject: s,
            key: `${g}.${c.id}.${s}`,
            label: `${gradeLabel(g)} · ${s || c.name}`,
            courseName: c.name,
            studentCount: 0,
            days: [],
            startTime: null,
            endTime: null,
            room: null,
          })),
        ),
    );
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="flex flex-wrap items-baseline gap-x-3 text-[clamp(1.4rem,2.2vw,1.65rem)] font-normal">
          Assignments <span className="text-[12.5px] text-muted">{portal === "admin" ? "Academics / Assignments" : "Teaching · Grades 9–12"}</span>
        </h1>
        <p className="text-[12.5px] text-muted">Students email their answers to the teacher.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <NewAssignment classes={classes} />
        <section className="min-w-0">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[15.5px]">Shared</h2>
            <span className="text-[12.5px] text-muted">
              {d.rows.length} assignment{d.rows.length === 1 ? "" : "s"}
            </span>
          </div>
          {d.rows.length === 0 ? (
            <Card>
              <Empty title="Nothing shared yet" icon={<IClipboard className="size-5" />}>
                Upload a worksheet and share it with a class. Students and parents get a link.
              </Empty>
            </Card>
          ) : (
            <ul className="grid gap-2.5">
              {d.rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-[18px] border border-line bg-white p-3 sm:flex-nowrap sm:p-3.5">
                  <span className={cx("grid h-12 w-11 shrink-0 place-items-end justify-center rounded-lg pb-1.5 text-[10px] font-bold tracking-wide", tile[r.fileType])}>{r.fileType}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-semibold">{r.title}</span>
                    <span className="block truncate text-[12px] text-muted">
                      {r.classLabel}
                      {r.student ? ` · ${r.student}` : ""} · {r.when}
                      {portal === "admin" ? ` · ${r.teacher}` : ""}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-[14px] font-semibold tabular-nums">
                      {r.opened} / {r.total}
                    </span>
                    <span className="block text-[11.5px] text-muted">opened</span>
                  </span>
                  <AssignmentRowActions id={r.id} fileId={r.fileId} title={r.title} admin={portal === "admin"} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
