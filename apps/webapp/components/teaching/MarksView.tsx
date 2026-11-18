import { gradeLabel, gradeNumber, type Grade } from "@dd/shared/domain";
import { FilterSelect } from "@/components/ui/client";
import { Card, Empty, labelCls, Notice, PageHeader } from "@/components/ui/kit";
import { api, param, qs, type SearchParams } from "@/lib/api";
import { classQuery, getMeta, type ClassInfo, type Meta } from "@/lib/portal";
import { MarksEditor, NewTestButton, VisibilityToggle, type MarksSheet } from "./MarksClient";

type ClassOpt = { key: string; grade: Grade; courseId: string; subject: string; label: string };

/** Admin: every course × grade, split into subjects (Maths & Science → Maths, Science). */
function adminClasses(meta: Meta): ClassOpt[] {
  const out: ClassOpt[] = [];
  for (const c of meta.courses)
    for (const g of c.grades)
      for (const s of c.subjects.length ? c.subjects : [""]) out.push({ key: `${g}.${c.id}.${s}`, grade: g, courseId: c.id, subject: s, label: s || c.name });
  return out;
}
const staffClasses = (cs: ClassInfo[]): ClassOpt[] => cs.map((c) => ({ key: c.key, grade: c.grade, courseId: c.courseId, subject: c.subject, label: c.subject || c.courseName }));

/**
 * Marks entry (designs: admin "Marks entry" and staff "Marks Entery").
 * 1 · Grade → 2 · Subject → 3 · Test → optional student. Admin also controls visibility.
 */
export async function MarksView({ portal, searchParams }: { portal: "admin" | "staff"; searchParams: SearchParams }) {
  const sp = await searchParams;
  const meta = await getMeta(portal);
  const classes = portal === "admin" ? adminClasses(meta) : staffClasses(meta.classes);
  if (!classes.length)
    return (
      <Card>
        <Empty title="No classes yet">{portal === "staff" ? "Admin assigns your grades and courses first." : "Create courses first."}</Empty>
      </Card>
    );
  const grades = [...new Set(classes.map((c) => c.grade))].sort((a, b) => gradeNumber(b) - gradeNumber(a));
  const fromKey = classes.find((c) => c.key === param(sp.class));
  const grade = (grades.includes(param(sp.grade) as Grade) ? param(sp.grade) : (fromKey?.grade ?? (grades.includes("GRADE_9") ? "GRADE_9" : grades[0]))) as Grade;
  const inGrade = classes.filter((c) => c.grade === grade);
  const cls = fromKey && fromKey.grade === grade ? fromKey : inGrade[0]!;
  const tests = await api<{ rows: { id: string; name: string; maxMarks: number }[]; students: { studentId: string; name: string }[] }>(`/v1/tests?${classQuery(cls)}`, portal);
  const test = tests.rows.find((t) => t.id === param(sp.test)) ?? tests.rows[0];
  const studentId = param(sp.studentId);
  const sheet = test ? await api<MarksSheet>(`/v1/tests/${test.id}${qs({ studentId })}`, portal) : null;
  const base = `/${portal}/marks`;

  return (
    <>
      <PageHeader title="Marks" crumb={portal === "admin" ? "Academics / Marks" : "Teaching / Marks"} actions={<NewTestButton cls={{ grade: cls.grade, courseId: cls.courseId, subject: cls.subject }} label={`${gradeLabel(cls.grade)} · ${cls.label}`} base={base} />} />
      <Card className="mb-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,220px))]">
          <div>
            <p className={labelCls}>
              1 · Grade <span className="text-danger">*</span>
            </p>
            <FilterSelect name="grade" label="Grade" clear={["class", "test", "studentId"]} value={grade} options={grades.map((g) => ({ value: g, label: gradeLabel(g) }))} />
          </div>
          <div>
            <p className={labelCls}>2 · Subject</p>
            <FilterSelect name="class" label="Subject" clear={["test", "studentId"]} value={cls.key} options={inGrade.map((c) => ({ value: c.key, label: c.label }))} />
          </div>
          <div>
            <p className={labelCls}>3 · Test</p>
            {tests.rows.length ? (
              <FilterSelect name="test" label="Test" clear={["studentId"]} value={test?.id ?? ""} options={tests.rows.map((t) => ({ value: t.id, label: t.name }))} />
            ) : (
              <p className="flex h-11 items-center text-[13.5px] text-muted">No tests yet</p>
            )}
          </div>
          <div>
            <p className={labelCls}>Student (optional)</p>
            <FilterSelect name="studentId" label="Student" value={studentId} options={[{ value: "", label: "All students in class" }, ...tests.students.map((r) => ({ value: r.studentId, label: r.name }))]} />
          </div>
        </div>
      </Card>
      {!sheet ? (
        <Card>
          <Empty title="Create the first test for this class">Use “+ New test”, then enter marks here.</Empty>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
          <MarksEditor key={`${sheet.test.id}${studentId}`} sheet={sheet} />
          <div className="grid content-start gap-3">
            {portal === "admin" ? (
              <VisibilityToggle testId={sheet.test.id} visible={sheet.test.resultsVisible} />
            ) : (
              <Notice tone="blue">
                {sheet.test.resultsVisible ? "These results are visible to parents. Corrections notify them." : "Admin decides when results become visible to parents. You'll be notified when they're published."}
              </Notice>
            )}
            <Card title="Class summary">
              <dl className="divide-y divide-line text-[13.5px]">
                <div className="flex justify-between py-3 first:pt-0">
                  <dt className="text-ink-soft">Average</dt>
                  <dd className="tabular-nums">{sheet.summary.average ?? "—"}</dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-ink-soft">Highest</dt>
                  <dd className="tabular-nums">{sheet.summary.highest ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between py-3 last:pb-0">
                  <dt className="text-ink-soft">Not entered</dt>
                  <dd>
                    <span className="grid h-6 min-w-6 place-items-center rounded-full bg-cream px-2 text-[12px] tabular-nums">{sheet.summary.notEntered}</span>
                  </dd>
                </div>
              </dl>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
