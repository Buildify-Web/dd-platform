import { Router } from "express";
import * as z from "zod";
import { dbDate, istTime, todayIst, ymd } from "../../lib/dates";
import { db } from "../../lib/db";
import { badRequest, forbidden, notFound } from "../../lib/errors";
import { actor, adminOnly, portalUser } from "../../middleware/auth";
import { idParam, parseBody, parseQuery, zDate, zId } from "../../middleware/validate";
import { audit } from "../../services/audit";
import { notifyParents, notifyUsers } from "../../services/notify";
import { assertClassAccess, classLabel, classStudentsWhere } from "../../services/scope";
import { zClass, zOptionalId } from "../common";

/**
 * /v1/tests: tests per class and their marks. Teachers (and admin) enter or correct marks;
 * corrections keep old and new values in the audit log. Parents see marks only after admin
 * makes the results visible; then they are notified (and again on later corrections).
 */
export const marksRouter = Router();
marksRouter.use(portalUser);

marksRouter.get("/", async (req, res) => {
  const a = actor(req);
  const c = parseQuery(zClass, req.query);
  await assertClassAccess(a, c);
  const tests = await db().test.findMany({
    where: { grade: c.grade, courseId: c.courseId, ...(c.subject ? { subject: c.subject } : {}) },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, maxMarks: true, heldOn: true, resultsVisible: true, subject: true, createdAt: true },
  });
  // The class roster too, so the student picker works before any test exists.
  const students = await db().student.findMany({ where: classStudentsWhere(c), orderBy: [{ rollNo: "asc" }, { name: "asc" }], select: { id: true, name: true } });
  res.json({
    rows: tests.map((t) => ({ ...t, heldOn: t.heldOn ? ymd(t.heldOn) : null })),
    students: students.map((s) => ({ studentId: s.id, name: s.name })),
  });
});

const testBody = zClass
  .extend({ name: z.string().trim().min(1, { error: "Name the test." }).max(80), maxMarks: z.coerce.number().int().min(1).max(1000), heldOn: zDate.optional() })
  .strict();

marksRouter.post("/", async (req, res) => {
  const a = actor(req);
  const body = parseBody(testBody, req.body);
  await assertClassAccess(a, body);
  const t = await db().test.create({
    data: { name: body.name, grade: body.grade, courseId: body.courseId, subject: body.subject, maxMarks: body.maxMarks, heldOn: dbDate(body.heldOn ?? todayIst()), createdById: a.id },
  });
  await audit(req, { area: "MARKS", action: "test.create", summary: `created the test "${t.name}" (out of ${t.maxMarks})`, entityType: "Test", entityId: t.id });
  res.status(201).json({ id: t.id });
});

/** Marks sheet: every student in the class with this test's score, previous test and last edit. */
marksRouter.get("/:id", async (req, res) => {
  const a = actor(req);
  const t = await db().test.findUnique({ where: { id: idParam(req.params.id, "That test") }, include: { course: true } });
  if (!t) throw notFound("That test");
  await assertClassAccess(a, t);
  const { studentId } = parseQuery(z.object({ studentId: zOptionalId }), req.query);
  const allStudents = await db().student.findMany({ where: classStudentsWhere(t), orderBy: [{ rollNo: "asc" }, { name: "asc" }], select: { id: true, name: true } });
  const students = studentId ? allStudents.filter((s) => s.id === studentId) : allStudents;
  const [marks, previous] = await Promise.all([
    db().mark.findMany({ where: { testId: t.id } }),
    db().test.findFirst({
      where: { grade: t.grade, courseId: t.courseId, subject: t.subject, createdAt: { lt: t.createdAt } },
      orderBy: { createdAt: "desc" },
      include: { marks: true },
    }),
  ]);
  const byStudent = new Map(marks.map((m) => [m.studentId, m]));
  const today = todayIst();
  const rows = students.map((s) => {
    const m = byStudent.get(s.id);
    const p = previous?.marks.find((x) => x.studentId === s.id);
    return {
      studentId: s.id,
      name: s.name,
      score: m?.score ?? null,
      previous: p ? { score: p.score, max: previous!.maxMarks } : null,
      lastEdit: m ? `${m.updatedByName ?? "—"} · ${ymd(m.updatedAt) === today ? (m.updatedByName === "Admin" ? istTime(m.updatedAt) : "today") : ymd(m.updatedAt)}` : null,
    };
  });
  const entered = rows.filter((r) => r.score !== null).map((r) => r.score!);
  res.json({
    test: {
      id: t.id,
      name: t.name,
      maxMarks: t.maxMarks,
      heldOn: t.heldOn ? ymd(t.heldOn) : null,
      resultsVisible: t.resultsVisible,
      publishedAt: t.publishedAt,
      classLabel: classLabel(t.grade, t.course.name, t.subject),
    },
    rows,
    allStudents: allStudents.map((s) => ({ studentId: s.id, name: s.name })),
    summary: {
      average: entered.length ? Math.round((entered.reduce((x, y) => x + y, 0) / entered.length) * 10) / 10 : null,
      highest: entered.length ? Math.max(...entered) : null,
      notEntered: rows.length - entered.length,
    },
  });
});

const marksBody = z
  .object({ entries: z.array(z.object({ studentId: zId, score: z.number().min(0).max(1000).nullable() }).strict()).min(1).max(300) })
  .strict();

marksRouter.put("/:id/marks", async (req, res) => {
  const a = actor(req);
  const t = await db().test.findUnique({ where: { id: idParam(req.params.id, "That test") }, include: { course: true } });
  if (!t) throw notFound("That test");
  await assertClassAccess(a, t);
  const { entries } = parseBody(marksBody, req.body);
  const fields: Record<string, string> = {};
  for (const e of entries) if (e.score !== null && e.score > t.maxMarks) fields[e.studentId] = `Max is ${t.maxMarks}`;
  if (Object.keys(fields).length) throw badRequest(`Marks can't be more than ${t.maxMarks}.`, fields);

  const allowed = new Set((await db().student.findMany({ where: classStudentsWhere(t), select: { id: true } })).map((s) => s.id));
  if (entries.some((e) => !allowed.has(e.studentId))) throw forbidden("Some students aren't in this class.");
  const existing = new Map((await db().mark.findMany({ where: { testId: t.id } })).map((m) => [m.studentId, m]));
  const changes: { studentId: string; from: number | null; to: number | null }[] = [];
  const editor = a.isAdmin ? "Admin" : a.name;
  await db().$transaction(async (tx) => {
    for (const e of entries) {
      const prev = existing.get(e.studentId);
      if ((prev?.score ?? null) === e.score) continue;
      changes.push({ studentId: e.studentId, from: prev?.score ?? null, to: e.score });
      if (e.score === null) await tx.mark.delete({ where: { testId_studentId: { testId: t.id, studentId: e.studentId } } });
      else
        await tx.mark.upsert({
          where: { testId_studentId: { testId: t.id, studentId: e.studentId } },
          create: { testId: t.id, studentId: e.studentId, score: e.score, updatedById: a.id, updatedByName: editor },
          update: { score: e.score, updatedById: a.id, updatedByName: editor },
        });
    }
  });
  if (changes.length) {
    const names = new Map((await db().student.findMany({ where: { id: { in: changes.map((c) => c.studentId) } }, select: { id: true, name: true } })).map((s) => [s.id, s.name]));
    const corrections = changes.filter((c) => c.from !== null);
    await audit(req, {
      area: "MARKS",
      action: corrections.length ? "marks.correct" : "marks.enter",
      summary: `${corrections.length ? "corrected" : "entered"} ${t.name} marks for ${changes.length === 1 ? names.get(changes[0]!.studentId) : `${changes.length} students`} (${classLabel(t.grade, t.course.name, t.subject)})`,
      entityType: "Test",
      entityId: t.id,
      fromLabel: changes.length === 1 && changes[0]!.from !== null ? `${changes[0]!.from} / ${t.maxMarks}` : null,
      toLabel: changes.length === 1 ? (changes[0]!.to === null ? "Cleared" : `${changes[0]!.to} / ${t.maxMarks}`) : null,
      before: changes.map((c) => ({ student: names.get(c.studentId), score: c.from })),
      after: changes.map((c) => ({ student: names.get(c.studentId), score: c.to })),
    });
    if (t.resultsVisible)
      await notifyParents(
        changes.filter((c) => c.to !== null).map((c) => c.studentId),
        { category: "MARKS", title: `Marks updated · ${t.name}`, body: `${t.subject || t.course.name}: marks for ${t.name} were updated.` },
      );
  }
  res.json({ saved: changes.length });
});

/** Admin decides when results become visible to parents. */
marksRouter.post("/:id/visibility", ...adminOnly, async (req, res) => {
  const t = await db().test.findUnique({ where: { id: idParam(req.params.id, "That test") }, include: { course: true, marks: { select: { studentId: true } } } });
  if (!t) throw notFound("That test");
  const { visible } = parseBody(z.object({ visible: z.boolean() }).strict(), req.body);
  await db().test.update({ where: { id: t.id }, data: { resultsVisible: visible, publishedAt: visible ? new Date() : null } });
  if (visible && !t.resultsVisible) {
    await notifyParents(
      t.marks.map((m) => m.studentId),
      { category: "MARKS", title: `Results published · ${t.name}`, body: `${t.subject || t.course.name} results for ${t.name} are now available.` },
    );
    if (t.createdById) await notifyUsers([t.createdById], { category: "CLASSES", title: "Results published", body: `${t.name} results for ${classLabel(t.grade, t.course.name, t.subject)} are now visible to parents.` });
  }
  await audit(req, {
    area: "MARKS",
    action: visible ? "marks.publish" : "marks.hide",
    summary: `${visible ? "published" : "hid"} ${t.name} results (${classLabel(t.grade, t.course.name, t.subject)})`,
    entityType: "Test",
    entityId: t.id,
    fromLabel: t.resultsVisible ? "Visible" : "Hidden",
    toLabel: visible ? "Visible" : "Hidden",
  });
  res.json({ ok: true });
});
