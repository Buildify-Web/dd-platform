import type { Prisma } from "@dd/db";
import { badRequest, conflict } from "../../lib/errors";
import { Router } from "express";
import * as z from "zod";
import { db } from "../../lib/db";
import { actor, authenticate, requireRole } from "../../middleware/auth";
import { parseBody, zId } from "../../middleware/validate";
import { audit } from "../../services/audit";
import { notifyAdmins } from "../../services/notify";
import {
  currentRows,
  flattenSelections,
  sameRows,
  storedRows,
  teachingCatalog,
  toSelections,
  validateRows,
} from "../../services/teaching";
import { zGrade } from "../common";

/**
 * /v1/me/teaching (staff): the courses this teacher teaches. Changes are proposed here and take
 * effect only after the admin approves them in Approvals → Teaching changes.
 */
export const myTeachingRouter = Router();
myTeachingRouter.use(authenticate, requireRole("STAFF"));

const selectionBody = z
  .object({
    selection: z
      .array(z.object({ grade: zGrade, courseId: zId, subjects: z.array(z.string().trim().min(1).max(60)).max(10).default([]) }).strict())
      .max(300),
  })
  .strict();

myTeachingRouter.get("/", async (req, res) => {
  const a = actor(req);
  const [catalog, rows, pending, last] = await Promise.all([
    teachingCatalog(),
    currentRows(a.id),
    db().teachingChangeRequest.findFirst({ where: { staffId: a.id, status: "PENDING" } }),
    db().teachingChangeRequest.findFirst({ where: { staffId: a.id, status: { in: ["APPROVED", "REJECTED"] } }, orderBy: { reviewedAt: "desc" } }),
  ]);
  res.json({
    catalog,
    current: toSelections(rows),
    pending: pending ? { submittedAt: pending.submittedAt, selection: toSelections(storedRows(pending.rows)) } : null,
    lastDecision: last ? { status: last.status, note: last.decisionNote, reviewedAt: last.reviewedAt } : null,
  });
});

/** Proposes the full set of courses this teacher wants to teach. Replaces any request still pending. */
myTeachingRouter.put("/request", async (req, res) => {
  const a = actor(req);
  const body = parseBody(selectionBody, req.body);
  const wanted = validateRows(flattenSelections(body.selection), await teachingCatalog());
  if (!wanted.length) throw badRequest("Choose at least one course to teach.");
  if (sameRows(wanted, await currentRows(a.id))) throw conflict("That's what you teach now. Change a course before you submit.");

  const pending = await db().teachingChangeRequest.findFirst({ where: { staffId: a.id, status: "PENDING" }, select: { id: true } });
  const rows = wanted as unknown as Prisma.InputJsonValue;
  const saved = pending
    ? await db().teachingChangeRequest.update({ where: { id: pending.id }, data: { rows, submittedAt: new Date() } })
    : await db().teachingChangeRequest.create({ data: { staffId: a.id, rows } });

  await notifyAdmins({
    category: "APPROVALS",
    title: "Teaching changes to review",
    body: `${a.name} wants to change the courses they teach.`,
    actionLabel: "Review",
    href: "/admin/approvals?tab=teaching",
  });
  await audit(req, { area: "STAFF", action: "teaching.request", summary: `${a.name} sent teaching changes for approval`, entityType: "TeachingChangeRequest", entityId: saved.id });
  res.json({ ok: true });
});

/** Withdraws a pending request. Nothing changes in what the teacher teaches. */
myTeachingRouter.delete("/request", async (req, res) => {
  const a = actor(req);
  await db().teachingChangeRequest.deleteMany({ where: { staffId: a.id, status: "PENDING" } });
  res.json({ ok: true });
});
