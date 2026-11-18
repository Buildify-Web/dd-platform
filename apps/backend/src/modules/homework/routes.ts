import type { Prisma } from "@dd/db";
import { gradeLabel, initials, longTextSchema } from "@dd/shared/domain";
import { Router } from "express";
import * as z from "zod";
import { addDays, dbDate, shortDate, todayIst, ymd } from "../../lib/dates";
import { db } from "../../lib/db";
import { badRequest, forbidden, notFound } from "../../lib/errors";
import { parseFormat, sendTable } from "../../lib/export";
import { actor, portalUser } from "../../middleware/auth";
import { idParam, parseBody, parseQuery, zDate, zId, zPage } from "../../middleware/validate";
import { audit } from "../../services/audit";
import { notifyParents } from "../../services/notify";
import { assertClassAccess, assertStudentAccess, classLabel, classStudentIds, classStudentsWhere } from "../../services/scope";
import { zClass, zGrade, zOptionalId } from "../common";

/**
 * /v1/homework: homework given to a class, parent submissions and teacher feedback.
 * /v1/class-updates: "What did you teach today?" posts (parents of the class are notified).
 */
export const homeworkRouter = Router();
homeworkRouter.use(portalUser);

const dueLabel = (due: string) => {
  const today = todayIst();
  if (due === today) return { text: "Due today", tone: "danger" };
  if (due < today) return { text: `Was due ${shortDate(dbDate(due))}`, tone: "muted" };
  const diff = (dbDate(due).getTime() - dbDate(today).getTime()) / 86_400_000;
  const wd = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" }).format(dbDate(due));
  return diff <= 6 ? { text: `Due ${wd}`, tone: "warn" } : { text: `Due next ${wd}`, tone: "neutral" };
};
const givenLabel = (given: string) => {
  if (given === todayIst()) return "Given today";
  if (given === addDays(todayIst(), -1)) return "Given yesterday";
  return `Given ${new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" }).format(dbDate(given))}`;
};

/** Homework cards for one class (newest first). */
homeworkRouter.get("/", async (req, res) => {
  const a = actor(req);
  const c = parseQuery(zClass, req.query);
  await assertClassAccess(a, c);
  const total = await db().student.count({ where: classStudentsWhere(c) });
  const hw = await db().homework.findMany({
    where: { grade: c.grade, courseId: c.courseId, ...(c.subject ? { subject: c.subject } : {}), dueOn: { gte: dbDate(addDays(todayIst(), -30)) } },
    orderBy: [{ dueOn: "asc" }],
    include: { submissions: { select: { status: true } } },
  });
  res.json({
    total,
    rows: hw.map((h) => ({
      id: h.id,
      title: h.title,
      details: h.details,
      givenOn: ymd(h.givenOn),
      dueOn: ymd(h.dueOn),
      due: dueLabel(ymd(h.dueOn)),
      given: givenLabel(ymd(h.givenOn)),
      submitted: h.submissions.length,
      checked: h.submissions.filter((s) => s.status === "CHECKED").length,
      toCheck: h.submissions.filter((s) => s.status === "SUBMITTED").length,
    })),
  });
});

homeworkRouter.get("/:id", async (req, res) => {
  const a = actor(req);
  const h = await db().homework.findUnique({ where: { id: idParam(req.params.id, "That homework") }, include: { course: true } });
  if (!h) throw notFound("That homework");
  await assertClassAccess(a, h);
  const students = await db().student.findMany({ where: classStudentsWhere(h), orderBy: [{ rollNo: "asc" }, { name: "asc" }], select: { id: true, name: true } });
  const subs = await db().homeworkSubmission.findMany({ where: { homeworkId: h.id } });
  const byStudent = new Map(subs.map((s) => [s.studentId, s]));
  res.json({
    homework: { id: h.id, title: h.title, details: h.details, givenOn: ymd(h.givenOn), dueOn: ymd(h.dueOn), classLabel: classLabel(h.grade, h.course.name, h.subject) },
    students: students.map((s) => {
      const sub = byStudent.get(s.id);
      return {
        studentId: s.id,
        name: s.name,
        initials: initials(s.name),
        submission: sub
          ? { id: sub.id, status: sub.status, submittedAt: sub.submittedAt, text: sub.text, imageFileId: sub.imageFileId, feedback: sub.feedback, checkedAt: sub.checkedAt }
          : null,
      };
    }),
  });
});

const createBody = zClass
  .extend({ title: z.string().trim().min(1, { error: "Add a title." }).max(120), details: longTextSchema.default(""), dueOn: zDate })
  .strict();

homeworkRouter.post("/", async (req, res) => {
  const a = actor(req);
  const body = parseBody(createBody, req.body);
  await assertClassAccess(a, body);
  if (body.dueOn < todayIst()) throw badRequest("The due date has already passed.", { dueOn: "Pick today or later." });
  const h = await db().homework.create({
    data: { grade: body.grade, courseId: body.courseId, subject: body.subject, title: body.title, details: body.details || null, givenOn: dbDate(todayIst()), dueOn: dbDate(body.dueOn), createdById: a.id },
    include: { course: true },
  });
  await notifyParents(await classStudentIds(body), {
    category: "HOMEWORK",
    title: `Homework · ${h.subject || h.course.name}`,
    body: `${h.title}${h.details ? ` — ${h.details}` : ""}. Due ${body.dueOn}.`,
  });
  await audit(req, { area: "HOMEWORK", action: "homework.create", summary: `gave homework "${h.title}" to ${classLabel(h.grade, h.course.name, h.subject)}`, entityType: "Homework", entityId: h.id });
  res.status(201).json({ id: h.id });
});

homeworkRouter.delete("/:id", async (req, res) => {
  const a = actor(req);
  const h = await db().homework.findUnique({ where: { id: idParam(req.params.id, "That homework") } });
  if (!h) throw notFound("That homework");
  if (!a.isAdmin && h.createdById !== a.id) throw forbidden("Only the teacher who gave this homework (or admin) can remove it.");
  await db().homework.delete({ where: { id: h.id } });
  await audit(req, { area: "HOMEWORK", action: "homework.delete", summary: `removed homework "${h.title}"`, entityType: "Homework", entityId: h.id });
  res.json({ ok: true });
});

const reviewBody = z.object({ status: z.enum(["CHECKED", "REDO"]), feedback: longTextSchema.default("") }).strict();

homeworkRouter.post("/submissions/:id/review", async (req, res) => {
  const a = actor(req);
  const body = parseBody(reviewBody, req.body);
  const sub = await db().homeworkSubmission.findUnique({ where: { id: idParam(req.params.id, "That submission") }, include: { homework: { include: { course: true } }, student: true } });
  if (!sub) throw notFound("That submission");
  await assertClassAccess(a, sub.homework);
  await db().homeworkSubmission.update({ where: { id: sub.id }, data: { status: body.status, feedback: body.feedback || null, checkedById: a.id, checkedAt: new Date() } });
  await notifyParents([sub.studentId], {
    category: "HOMEWORK",
    title: body.status === "CHECKED" ? "Homework checked" : "Homework needs redo",
    body: `${sub.homework.title} (${sub.homework.subject || sub.homework.course.name})${body.feedback ? `: ${body.feedback}` : ""}`,
  });
  await audit(req, {
    area: "HOMEWORK",
    action: "homework.review",
    summary: `reviewed ${sub.student.name}'s homework "${sub.homework.title}"`,
    entityType: "HomeworkSubmission",
    entityId: sub.id,
    fromLabel: sub.status === "SUBMITTED" ? "To check" : sub.status === "CHECKED" ? "Checked" : "Needs redo",
    toLabel: body.status === "CHECKED" ? "Checked" : "Needs redo",
  });
  res.json({ ok: true });
});

/** Admin / staff homework report for a date range (by class, with "not completed"). */
const reportQuery = z.object({ from: zDate, to: zDate, grade: z.union([zGrade, z.literal("")]).optional(), courseId: zOptionalId, format: z.string().optional() });

async function homeworkReport(a: ReturnType<typeof actor>, q: z.infer<typeof reportQuery>) {
  const where: Prisma.HomeworkWhereInput = { dueOn: { gte: dbDate(q.from), lte: dbDate(q.to) } };
  if (q.grade) where.grade = q.grade;
  if (q.courseId) where.courseId = q.courseId;
  if (!a.isAdmin) {
    const mine = await db().teachingAssignment.findMany({ where: { staffId: a.id }, select: { grade: true, courseId: true } });
    where.OR = mine.length ? mine.map((m) => ({ grade: m.grade, courseId: m.courseId })) : [{ id: "00000000-0000-0000-0000-000000000000" }];
  }
  const hw = await db().homework.findMany({ where, include: { course: true, submissions: { select: { studentId: true, status: true } }, createdBy: { select: { name: true } } }, orderBy: { dueOn: "desc" }, take: 500 });
  const rows = [];
  for (const h of hw) {
    const total = await db().student.count({ where: classStudentsWhere(h) });
    rows.push({
      id: h.id,
      title: h.title,
      classLabel: classLabel(h.grade, h.course.name, h.subject),
      teacher: h.createdBy?.name ?? "—",
      givenOn: ymd(h.givenOn),
      dueOn: ymd(h.dueOn),
      total,
      submitted: h.submissions.length,
      checked: h.submissions.filter((s) => s.status === "CHECKED").length,
      notCompleted: Math.max(0, total - h.submissions.filter((s) => s.status !== "REDO").length),
    });
  }
  return rows;
}

homeworkRouter.get("/report/summary", async (req, res) => {
  const q = parseQuery(reportQuery, req.query);
  const rows = await homeworkReport(actor(req), q);
  const sum = (k: "total" | "submitted" | "checked" | "notCompleted") => rows.reduce((t, r) => t + r[k], 0);
  res.json({ totals: { homework: rows.length, expected: sum("total"), submitted: sum("submitted"), checked: sum("checked"), notCompleted: sum("notCompleted") }, rows });
});

homeworkRouter.get("/report/export", async (req, res) => {
  const q = parseQuery(reportQuery, req.query);
  const rows = await homeworkReport(actor(req), q);
  sendTable(res, parseFormat(q.format), `homework-${q.from}-to-${q.to}`, [
    { header: "Homework", value: (r) => r.title },
    { header: "Class", value: (r) => r.classLabel },
    { header: "Teacher", value: (r) => r.teacher },
    { header: "Given", value: (r) => r.givenOn },
    { header: "Due", value: (r) => r.dueOn },
    { header: "Students", value: (r) => r.total },
    { header: "Submitted", value: (r) => r.submitted },
    { header: "Checked", value: (r) => r.checked },
    { header: "Not completed", value: (r) => r.notCompleted },
  ], rows);
});

// ───────────────────────────── Class updates ─────────────────────────────
export const classUpdatesRouter = Router();
classUpdatesRouter.use(portalUser);

const updatesQuery = z.object({
  grade: z.union([zGrade, z.literal("")]).optional(),
  courseId: zOptionalId,
  from: zDate.optional(),
  to: zDate.optional(),
  page: zPage,
});

classUpdatesRouter.get("/", async (req, res) => {
  const a = actor(req);
  const q = parseQuery(updatesQuery, req.query);
  const where: Prisma.ClassUpdateWhereInput = {};
  if (q.grade) where.grade = q.grade;
  if (q.courseId) where.courseId = q.courseId;
  if (q.from || q.to) where.date = { ...(q.from ? { gte: dbDate(q.from) } : {}), ...(q.to ? { lte: dbDate(q.to) } : {}) };
  if (!a.isAdmin) where.staffId = a.id;
  const rows = await db().classUpdate.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (q.page - 1) * 30,
    take: 30,
    include: { course: { select: { name: true } }, student: { select: { name: true } } },
  });
  const total = await db().classUpdate.count({ where });
  res.json({
    total,
    rows: rows.map((u) => ({
      id: u.id,
      classLabel: classLabel(u.grade, u.course.name, u.subject),
      grade: u.grade,
      courseId: u.courseId,
      student: u.student?.name ?? null,
      text: u.text,
      homework: u.homework,
      date: ymd(u.date),
      author: u.authorName,
      createdAt: u.createdAt,
    })),
  });
});

const postBody = zClass.extend({ studentId: zOptionalId, text: longTextSchema.min(1, { error: "Write what you taught today." }), homework: longTextSchema.default("") }).strict();

classUpdatesRouter.post("/", async (req, res) => {
  const a = actor(req);
  const body = parseBody(postBody, req.body);
  await assertClassAccess(a, body);
  if (body.studentId) await assertStudentAccess(a, body.studentId);
  const u = await db().classUpdate.create({
    data: { staffId: a.id, authorName: a.name, grade: body.grade, courseId: body.courseId, subject: body.subject, studentId: body.studentId ?? null, text: body.text, homework: body.homework || null, date: dbDate(todayIst()) },
    include: { course: true },
  });
  const targets = body.studentId ? [body.studentId] : await classStudentIds(body);
  const sent = await notifyParents(targets, {
    category: "CLASSES",
    title: `Class update · ${u.subject || u.course.name}`,
    body: `${u.text}${u.homework ? ` Homework: ${u.homework}` : ""}`,
  });
  await audit(req, { area: "HOMEWORK", action: "class_update.post", summary: `posted a class update for ${classLabel(u.grade, u.course.name, u.subject)}`, entityType: "ClassUpdate", entityId: u.id });
  res.status(201).json({ id: u.id, notified: sent });
});

classUpdatesRouter.delete("/:id", async (req, res) => {
  const a = actor(req);
  const u = await db().classUpdate.findUnique({ where: { id: idParam(req.params.id, "That update") } });
  if (!u) throw notFound("That update");
  if (!a.isAdmin && u.staffId !== a.id) throw forbidden();
  await db().classUpdate.delete({ where: { id: u.id } });
  await audit(req, { area: "HOMEWORK", action: "class_update.delete", summary: `deleted a class update (${gradeLabel(u.grade)})`, entityType: "ClassUpdate", entityId: u.id });
  res.json({ ok: true });
});

export { zId };
