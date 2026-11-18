import type { Grade, Prisma } from "@dd/db";
import { assignmentsAllowed, gradeLabel } from "@dd/shared/domain";
import { Router } from "express";
import * as z from "zod";
import { shortDate, todayIst, ymd, dbDate } from "../../lib/dates";
import { db } from "../../lib/db";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors";
import { actor, adminOnly, portalUser } from "../../middleware/auth";
import { idParam, parseBody, parseQuery, zId } from "../../middleware/validate";
import { audit } from "../../services/audit";
import { removeFile } from "../../services/files";
import { notifyAdmins, notifyParents, notifyUsers } from "../../services/notify";
import { assertClassAccess, assertStudentAccess, classLabel, classStudentIds, classStudentsWhere } from "../../services/scope";
import { zClass, zGrade, zOptionalId } from "../common";

const sizeLabel = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const typeLabel = (mime: string) => (mime === "application/pdf" ? "PDF" : mime.startsWith("image/") ? "IMG" : "DOC");
const whenLabel = (d: Date) => (ymd(d) === todayIst() ? "Today" : shortDate(d));

// ───────────────────────────── Assignments (Grades 9–12) ─────────────────────────────

/**
 * /v1/assignments: teachers share a file with a class (or one student); students and
 * parents get a link. Answers go to the teacher's email, never uploaded here.
 * Deleting (teacher: own; admin: any) removes it everywhere and its link stops working.
 */
export const assignmentsRouter = Router();
assignmentsRouter.use(portalUser);

assignmentsRouter.get("/", async (req, res) => {
  const a = actor(req);
  const q = parseQuery(z.object({ grade: z.union([zGrade, z.literal("")]).optional(), courseId: zOptionalId, deleted: z.enum(["0", "1"]).default("0") }), req.query);
  const where: Prisma.AssignmentWhereInput = { deletedAt: q.deleted === "1" ? { not: null } : null };
  if (q.grade) where.grade = q.grade;
  if (q.courseId) where.courseId = q.courseId;
  if (!a.isAdmin) where.createdById = a.id;
  const rows = await db().assignment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { course: true, student: { select: { name: true } }, createdBy: { select: { name: true } }, _count: { select: { views: true } } },
  });
  const files = new Map((await db().storedFile.findMany({ where: { id: { in: rows.map((r) => r.fileId) } } })).map((f) => [f.id, f]));
  const out = [];
  for (const r of rows) {
    const total = r.studentId ? 1 : await db().student.count({ where: classStudentsWhere(r) });
    const f = files.get(r.fileId);
    out.push({
      id: r.id,
      title: r.title,
      classLabel: classLabel(r.grade, r.course.name, r.subject),
      student: r.student?.name ?? null,
      when: whenLabel(r.createdAt),
      createdAt: r.createdAt,
      fileId: r.fileId,
      fileType: f ? typeLabel(f.mimeType) : "DOC",
      fileName: f?.originalName ?? null,
      opened: r._count.views,
      total,
      teacher: r.createdBy?.name ?? "—",
      deleted: !!r.deletedAt,
    });
  }
  res.json({ rows: out });
});

const assignmentBody = zClass.extend({ title: z.string().trim().min(1, { error: "Add a title." }).max(120), fileId: zId, studentId: zOptionalId }).strict();

assignmentsRouter.post("/", async (req, res) => {
  const a = actor(req);
  const body = parseBody(assignmentBody, req.body);
  if (!assignmentsAllowed(body.grade)) throw badRequest("Assignments are only for Grades 9–12.");
  await assertClassAccess(a, body);
  if (body.studentId) await assertStudentAccess(a, body.studentId);
  const file = await db().storedFile.findUnique({ where: { id: body.fileId } });
  if (!file || file.purpose !== "ASSIGNMENT" || (file.uploadedById !== a.id && !a.isAdmin)) throw badRequest("Upload the file again.");
  const r = await db().assignment.create({
    data: { title: body.title, grade: body.grade, courseId: body.courseId, subject: body.subject, studentId: body.studentId ?? null, fileId: body.fileId, createdById: a.id },
    include: { course: true },
  });
  const label = classLabel(r.grade, r.course.name, r.subject);
  await notifyParents(body.studentId ? [body.studentId] : await classStudentIds(body), {
    category: "HOMEWORK",
    title: `New assignment · ${r.subject || r.course.name}`,
    body: `${r.title}. Open it in the app; email your answers to your teacher.`,
  });
  if (!a.isAdmin) await notifyAdmins({ category: "SYSTEM", title: "New assignment shared", body: `${a.name} shared "${r.title}" with ${label}.`, actionLabel: "View", href: "/admin/assignments" });
  await audit(req, { area: "PAPERS", action: "assignment.create", summary: `shared the assignment "${r.title}" with ${label}`, entityType: "Assignment", entityId: r.id });
  res.status(201).json({ id: r.id });
});

assignmentsRouter.delete("/:id", async (req, res) => {
  const a = actor(req);
  const r = await db().assignment.findUnique({ where: { id: idParam(req.params.id, "That assignment") }, include: { course: true } });
  if (!r || r.deletedAt) throw notFound("That assignment");
  if (!a.isAdmin && r.createdById !== a.id) throw forbidden();
  await db().assignment.update({ where: { id: r.id }, data: { deletedAt: new Date(), deletedById: a.id } });
  await removeFile(r.fileId);
  if (a.isAdmin && r.createdById && r.createdById !== a.id)
    await notifyUsers([r.createdById], { category: "CLASSES", title: "Assignment removed", body: `Admin removed "${r.title}". Its link no longer works.` });
  await audit(req, { area: "PAPERS", action: "assignment.delete", summary: `deleted the assignment "${r.title}" (${classLabel(r.grade, r.course.name, r.subject)})`, entityType: "Assignment", entityId: r.id, fromLabel: "Shared", toLabel: "Deleted" });
  res.json({ ok: true });
});

// ───────────────────────────── Question papers ─────────────────────────────

/**
 * /v1/question-papers: staff (and admin) upload; papers stay hidden from parents until
 * admin activates them. Admin is alerted on each upload. Deleted papers' links stop working.
 */
export const papersRouter = Router();
papersRouter.use(portalUser);

papersRouter.get("/", async (req, res) => {
  const a = actor(req);
  const q = parseQuery(z.object({ status: z.enum(["AWAITING", "ACTIVE", "DELETED"]).default("AWAITING") }), req.query);
  const scope: Prisma.QuestionPaperWhereInput = a.isAdmin ? {} : { uploadedById: a.id };
  const [awaiting, active, deleted, rows] = await Promise.all([
    db().questionPaper.count({ where: { ...scope, status: "AWAITING" } }),
    db().questionPaper.count({ where: { ...scope, status: "ACTIVE" } }),
    db().questionPaper.count({ where: { ...scope, status: "DELETED" } }),
    db().questionPaper.findMany({
      where: { ...scope, status: q.status },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { course: { select: { name: true } }, student: { select: { name: true } }, uploadedBy: { select: { name: true } } },
    }),
  ]);
  const files = new Map((await db().storedFile.findMany({ where: { id: { in: rows.map((r) => r.fileId) } } })).map((f) => [f.id, f]));
  res.json({
    counts: { AWAITING: awaiting, ACTIVE: active, DELETED: deleted },
    rows: rows.map((r) => {
      const f = files.get(r.fileId);
      const day = ymd(r.createdAt) === todayIst() ? "today" : ymd(r.createdAt) === ymd(new Date(Date.now() - 86_400_000)) ? "yesterday" : shortDate(r.createdAt);
      return {
        id: r.id,
        title: r.subject || r.course?.name ? `${r.subject || r.course?.name} · ${r.title}` : r.title,
        file: f ? `${typeLabel(f.mimeType)} · ${sizeLabel(f.size)}` : "File removed",
        fileId: r.status === "DELETED" ? null : r.fileId,
        forLabel: `${gradeLabel(r.grade)} · ${r.student?.name ?? "all"}`,
        uploaded: `${r.uploadedBy?.name ?? "—"} · ${day}`,
        status: r.status,
        mine: r.uploadedById === a.id,
      };
    }),
  });
});

const paperBody = z
  .object({ title: z.string().trim().min(1, { error: "Add a title." }).max(120), grade: zGrade, courseId: zOptionalId, subject: z.string().trim().max(60).default(""), studentId: zOptionalId, fileId: zId })
  .strict();

papersRouter.post("/", async (req, res) => {
  const a = actor(req);
  const body = parseBody(paperBody, req.body);
  if (body.courseId) await assertClassAccess(a, { grade: body.grade, courseId: body.courseId });
  else if (!a.isAdmin) throw badRequest("Choose the class this paper is for.");
  if (body.studentId) await assertStudentAccess(a, body.studentId);
  const file = await db().storedFile.findUnique({ where: { id: body.fileId } });
  if (!file || file.purpose !== "QUESTION_PAPER" || (file.uploadedById !== a.id && !a.isAdmin)) throw badRequest("Upload the file again.");
  const p = await db().questionPaper.create({
    data: { title: body.title, grade: body.grade, courseId: body.courseId ?? null, subject: body.subject, studentId: body.studentId ?? null, fileId: body.fileId, uploadedById: a.id },
  });
  await notifyAdmins({ category: "APPROVALS", title: "Question paper awaiting activation", body: `${a.name} uploaded "${body.title}" for ${gradeLabel(body.grade)}.`, actionLabel: "Review", href: "/admin/question-papers" });
  await audit(req, { area: "PAPERS", action: "paper.upload", summary: `uploaded the question paper "${body.title}" (${gradeLabel(body.grade)})`, entityType: "QuestionPaper", entityId: p.id, toLabel: "Awaiting activation" });
  res.status(201).json({ id: p.id });
});

async function paperTargets(p: { grade: Grade; courseId: string | null; studentId: string | null }) {
  if (p.studentId) return [p.studentId];
  if (p.courseId) return classStudentIds({ grade: p.grade, courseId: p.courseId });
  return (await db().student.findMany({ where: { status: "ACTIVE", grade: p.grade }, select: { id: true } })).map((s) => s.id);
}

papersRouter.post("/:id/activate", ...adminOnly, async (req, res) => {
  const a = actor(req);
  const p = await db().questionPaper.findUnique({ where: { id: idParam(req.params.id, "That paper") } });
  if (!p) throw notFound("That paper");
  if (p.status !== "AWAITING") throw conflict(p.status === "ACTIVE" ? "Already active." : "This paper was deleted.");
  await db().questionPaper.update({ where: { id: p.id }, data: { status: "ACTIVE", activatedAt: new Date(), activatedById: a.id } });
  await notifyParents(await paperTargets(p), { category: "HOMEWORK", title: "Question paper available", body: `${p.title} is now available in the app.` });
  if (p.uploadedById && p.uploadedById !== a.id) await notifyUsers([p.uploadedById], { category: "CLASSES", title: "Paper activated", body: `Admin activated "${p.title}". Parents can now open it.` });
  await audit(req, { area: "PAPERS", action: "paper.activate", summary: `activated the question paper "${p.title}"`, entityType: "QuestionPaper", entityId: p.id, fromLabel: "Awaiting activation", toLabel: "Active" });
  res.json({ ok: true });
});

papersRouter.post("/:id/deactivate", ...adminOnly, async (req, res) => {
  const p = await db().questionPaper.findUnique({ where: { id: idParam(req.params.id, "That paper") } });
  if (!p || p.status !== "ACTIVE") throw notFound("That active paper");
  await db().questionPaper.update({ where: { id: p.id }, data: { status: "AWAITING", activatedAt: null, activatedById: null } });
  if (p.uploadedById) await notifyUsers([p.uploadedById], { category: "CLASSES", title: "Paper deactivated", body: `Admin deactivated "${p.title}".`, actionLabel: "Review", href: "/staff/question-papers" });
  await audit(req, { area: "PAPERS", action: "paper.deactivate", summary: `deactivated the question paper "${p.title}"`, entityType: "QuestionPaper", entityId: p.id, fromLabel: "Active", toLabel: "Awaiting activation" });
  res.json({ ok: true });
});

papersRouter.delete("/:id", async (req, res) => {
  const a = actor(req);
  const p = await db().questionPaper.findUnique({ where: { id: idParam(req.params.id, "That paper") } });
  if (!p || p.status === "DELETED") throw notFound("That paper");
  if (!a.isAdmin && (p.uploadedById !== a.id || p.status !== "AWAITING")) throw forbidden("Only admin can delete an active paper.");
  await db().questionPaper.update({ where: { id: p.id }, data: { status: "DELETED", deletedAt: new Date(), deletedById: a.id } });
  await removeFile(p.fileId);
  await audit(req, { area: "PAPERS", action: "paper.delete", summary: `deleted the question paper "${p.title}"`, entityType: "QuestionPaper", entityId: p.id, fromLabel: p.status === "ACTIVE" ? "Active" : "Awaiting activation", toLabel: "Deleted" });
  res.json({ ok: true });
});

export { dbDate };
