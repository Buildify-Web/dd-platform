import { gradeLabel, isGrade } from "@dd/shared/domain";
import { Router } from "express";
import * as z from "zod";
import { nextEnrolmentChangeCode, nextRegistrationCode } from "../../lib/codes";
import { dbDate, ymd } from "../../lib/dates";
import { db } from "../../lib/db";
import { RateLimiter } from "../../lib/rate-limit";
import { conflict, notFound, rateLimited } from "../../lib/errors";
import { actor, adminOnly, authenticate, requireRole } from "../../middleware/auth";
import { idParam, parseBody, parseQuery } from "../../middleware/validate";
import { audit } from "../../services/audit";
import { notifyAdmins, notifyUsers } from "../../services/notify";
import { applyRows, currentRows, diffRows, storedRows, teachingCatalog, validateRows, type TeachingRow } from "../../services/teaching";
import { decideEnrolmentChange, decideLeave, getEnrolmentChange, leaveDays } from "./enrolment";
import { approveRegistration, getRegistration, rejectRegistration, requestMoreInfo } from "./registrations";
import { approveBody, decisionBody, publicRegistrationBody, requestInfoBody, staffLeaveBody } from "./schemas";

/**
 * /v1/approvals (admin): student & staff registrations, parent enrolment changes, leave.
 * /v1/leave/mine (staff): own leave requests.
 * /v1/public/registrations: registration intake from the mobile app (no sign-in).
 */
export const approvalsRouter = Router();
approvalsRouter.use(adminOnly);

const listQuery = z.object({
  tab: z.enum(["students", "staff", "enrolment", "leave", "teaching"]).default("students"),
  status: z.enum(["pending", "decided"]).default("pending"),
});

approvalsRouter.get("/", async (req, res) => {
  const { tab, status } = parseQuery(listQuery, req.query);
  const open = ["PENDING", "INFO_REQUESTED"] as const;
  const regStatus = status === "pending" ? { in: [...open] } : { in: ["APPROVED", "REJECTED"] as ("APPROVED" | "REJECTED")[] };
  const [students, staff, enrolment, leave, teaching] = await Promise.all([
    db().registration.count({ where: { type: "STUDENT", status: { in: [...open] } } }),
    db().registration.count({ where: { type: "STAFF", status: { in: [...open] } } }),
    db().enrolmentChange.count({ where: { status: "PENDING" } }),
    db().leaveRequest.count({ where: { status: "PENDING" } }),
    db().teachingChangeRequest.count({ where: { status: "PENDING" } }),
  ]);
  let items: unknown[] = [];
  if (tab === "students" || tab === "staff") {
    const rows = await db().registration.findMany({
      where: { type: tab === "students" ? "STUDENT" : "STAFF", status: regStatus },
      orderBy: { submittedAt: status === "pending" ? "asc" : "desc" },
      take: 100,
    });
    items = rows.map((r) => {
      const d = (r.data ?? {}) as Record<string, unknown>;
      return {
        id: r.id,
        code: r.code,
        status: r.status,
        submittedAt: r.submittedAt,
        name: (tab === "students" ? d.studentName : d.name) ?? "—",
        detail: tab === "students" ? `${isGrade(d.grade) ? gradeLabel(d.grade) : "Grade not set"} · ${d.fatherName ?? d.motherName ?? ""}` : `${d.subject || "Teacher"} · ${d.email ?? ""}`,
        mobile: d.mobile ?? null,
      };
    });
  } else if (tab === "teaching") {
    const rows = await db().teachingChangeRequest.findMany({
      where: status === "pending" ? { status: "PENDING" } : { status: { in: ["APPROVED", "REJECTED"] } },
      include: { staff: { select: { name: true, subject: true } } },
      orderBy: { submittedAt: status === "pending" ? "asc" : "desc" },
      take: 100,
    });
    const names = new Map((await teachingCatalog()).map((c) => [c.id, c.name]));
    const parts = (w: TeachingRow) => ({ grade: gradeLabel(w.grade), course: names.get(w.courseId) ?? "Course", subject: w.subject });
    items = await Promise.all(
      rows.map(async (r) => {
        const wanted = storedRows(r.rows);
        const base = { id: r.id, status: r.status, submittedAt: r.submittedAt, name: r.staff.name, detail: r.staff.subject ?? "Teacher", decisionNote: r.decisionNote };
        // kind: "add" / "remove" for a waiting request (against what they teach now), "keep" once decided.
        if (r.status !== "PENDING") return { ...base, changes: wanted.map((w) => ({ kind: "keep", ...parts(w) })) };
        const diff = diffRows(await currentRows(r.staffId), wanted);
        return {
          ...base,
          changes: [...diff.added.map((w) => ({ kind: "add", ...parts(w) })), ...diff.removed.map((w) => ({ kind: "remove", ...parts(w) }))],
        };
      }),
    );
  } else if (tab === "enrolment") {
    const rows = await db().enrolmentChange.findMany({
      where: status === "pending" ? { status: "PENDING" } : { status: { in: ["APPROVED", "REJECTED"] } },
      include: { student: { select: { name: true, grade: true } } },
      orderBy: { requestedAt: status === "pending" ? "asc" : "desc" },
      take: 100,
    });
    const courseIds = [...new Set(rows.flatMap((r) => [...r.addCourseIds, ...r.removeCourseIds]))];
    const courses = new Map((await db().course.findMany({ where: { id: { in: courseIds } }, select: { id: true, name: true } })).map((c) => [c.id, c.name]));
    items = rows.map((r) => ({
      id: r.id,
      code: r.code,
      status: r.status,
      submittedAt: r.requestedAt,
      name: r.student.name,
      detail: [
        ...r.addCourseIds.map((c) => `+ ${courses.get(c) ?? "Course"}`),
        ...r.removeCourseIds.map((c) => `− ${courses.get(c) ?? "Course"}`),
      ].join(", "),
      grade: gradeLabel(r.student.grade),
    }));
  } else {
    const rows = await db().leaveRequest.findMany({
      where: status === "pending" ? { status: "PENDING" } : { status: { in: ["APPROVED", "REJECTED"] } },
      include: { student: { select: { name: true, grade: true } }, staff: { select: { name: true, subject: true } } },
      orderBy: { fromDate: status === "pending" ? "asc" : "desc" },
      take: 100,
    });
    items = rows.map((r) => ({
      id: r.id,
      status: r.status,
      submittedAt: r.requestedAt,
      kind: r.kind,
      name: r.student?.name ?? r.staff?.name ?? "—",
      detail: r.student ? gradeLabel(r.student.grade) : `Staff · ${r.staff?.subject ?? "Teacher"}`,
      fromDate: ymd(r.fromDate),
      toDate: ymd(r.toDate),
      days: leaveDays(r.fromDate, r.toDate),
      sessions: r.sessions,
      reason: r.reason,
      decisionNote: r.decisionNote,
    }));
  }
  res.json({ counts: { students, staff, enrolment, leave, teaching }, items });
});

// ── Registrations ──
approvalsRouter.get("/registrations/:id", async (req, res) => {
  res.json(await getRegistration(idParam(req.params.id, "That registration")));
});
approvalsRouter.post("/registrations/:id/approve", async (req, res) => {
  const body = parseBody(approveBody, req.body);
  res.json(await approveRegistration(req, idParam(req.params.id, "That registration"), body.data, body.photoFileId));
});
approvalsRouter.post("/registrations/:id/request-info", async (req, res) => {
  res.json(await requestMoreInfo(req, idParam(req.params.id, "That registration"), parseBody(requestInfoBody, req.body).note));
});
approvalsRouter.post("/registrations/:id/reject", async (req, res) => {
  res.json(await rejectRegistration(req, idParam(req.params.id, "That registration"), parseBody(decisionBody, req.body).note));
});
/** Admin enters a registration on a parent's or teacher's behalf (it is then reviewed as usual). */
approvalsRouter.post("/registrations", async (req, res) => {
  const body = parseBody(publicRegistrationBody, req.body);
  const r = await db().registration.create({ data: { code: await nextRegistrationCode(), type: body.type, data: body.data } });
  res.status(201).json({ id: r.id, code: r.code });
});

// ── Teaching changes (a teacher asks to change the courses they teach) ──
approvalsRouter.post("/teaching/:id/approve", async (req, res) => {
  const a = actor(req);
  const id = idParam(req.params.id, "That request");
  const r = await db().teachingChangeRequest.findUnique({ where: { id }, include: { staff: { select: { name: true, status: true } } } });
  if (!r) throw notFound("That request");
  if (r.status !== "PENDING") throw conflict("This request has already been decided.");
  if (r.staff.status !== "ACTIVE") throw conflict("This teacher's account isn't active. Activate it before approving.");

  // Checked again against today's courses: a course archived since the request was sent is refused.
  const wanted = validateRows(storedRows(r.rows), await teachingCatalog());
  const before = await currentRows(r.staffId);
  await applyRows(r.staffId, wanted);
  await db().teachingChangeRequest.update({ where: { id }, data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: a.id, decisionNote: null } });

  const diff = diffRows(before, wanted);
  await audit(req, {
    area: "APPROVALS",
    action: "teaching.approve",
    summary: `approved ${r.staff.name}'s teaching changes: ${diff.added.length} added, ${diff.removed.length} removed`,
    entityType: "TeachingChangeRequest",
    entityId: id,
    fromLabel: "Pending",
    toLabel: "Approved",
    before,
    after: wanted,
  });
  await notifyUsers([r.staffId], {
    category: "CLASSES",
    title: "Your teaching changes are approved",
    body: `${diff.added.length} course${diff.added.length === 1 ? "" : "s"} added and ${diff.removed.length} removed. Your classes are updated.`,
    actionLabel: "View",
    href: "/staff/teaching",
  });
  res.json({ ok: true });
});

approvalsRouter.post("/teaching/:id/reject", async (req, res) => {
  const a = actor(req);
  const id = idParam(req.params.id, "That request");
  const { note } = parseBody(z.object({ note: z.string().trim().min(1, { error: "Tell the teacher what to change." }).max(500) }).strict(), req.body);
  const r = await db().teachingChangeRequest.findUnique({ where: { id }, select: { status: true, staffId: true, staff: { select: { name: true } } } });
  if (!r) throw notFound("That request");
  if (r.status !== "PENDING") throw conflict("This request has already been decided.");
  await db().teachingChangeRequest.update({ where: { id }, data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: a.id, decisionNote: note } });
  await audit(req, {
    area: "APPROVALS",
    action: "teaching.reject",
    summary: `rejected ${r.staff.name}'s teaching changes`,
    entityType: "TeachingChangeRequest",
    entityId: id,
    fromLabel: "Pending",
    toLabel: "Rejected",
  });
  await notifyUsers([r.staffId], { category: "CLASSES", title: "Your teaching changes were not approved", body: note, actionLabel: "View", href: "/staff/teaching" });
  res.json({ ok: true });
});

// ── Enrolment changes ──
approvalsRouter.get("/enrolment/:id", async (req, res) => {
  res.json(await getEnrolmentChange(idParam(req.params.id, "That enrolment change")));
});
approvalsRouter.post("/enrolment/:id/approve", async (req, res) => {
  res.json(await decideEnrolmentChange(req, idParam(req.params.id, "That enrolment change"), true, parseBody(decisionBody, req.body).note));
});
approvalsRouter.post("/enrolment/:id/reject", async (req, res) => {
  res.json(await decideEnrolmentChange(req, idParam(req.params.id, "That enrolment change"), false, parseBody(decisionBody, req.body).note));
});

// ── Leave ──
approvalsRouter.post("/leave/:id/approve", async (req, res) => {
  res.json(await decideLeave(req, idParam(req.params.id, "That leave request"), true, parseBody(decisionBody, req.body).note));
});
approvalsRouter.post("/leave/:id/reject", async (req, res) => {
  res.json(await decideLeave(req, idParam(req.params.id, "That leave request"), false, parseBody(decisionBody, req.body).note));
});

// ───────────────────────────── Staff: own leave ─────────────────────────────
export const myLeaveRouter = Router();
myLeaveRouter.use(authenticate, requireRole("STAFF", "ADMIN"));

myLeaveRouter.get("/", async (req, res) => {
  const a = actor(req);
  const rows = await db().leaveRequest.findMany({ where: { staffId: a.id }, orderBy: { fromDate: "desc" }, take: 50 });
  const approvedDays = rows.filter((r) => r.status === "APPROVED").reduce((s, r) => s + leaveDays(r.fromDate, r.toDate), 0);
  res.json({
    approvedDays,
    items: rows.map((r) => ({ id: r.id, fromDate: ymd(r.fromDate), toDate: ymd(r.toDate), reason: r.reason, status: r.status, decisionNote: r.decisionNote, days: leaveDays(r.fromDate, r.toDate) })),
  });
});

myLeaveRouter.post("/", async (req, res) => {
  const a = actor(req);
  const body = parseBody(staffLeaveBody, req.body);
  const l = await db().leaveRequest.create({
    data: { kind: "STAFF", staffId: a.id, fromDate: dbDate(body.fromDate), toDate: dbDate(body.toDate), reason: body.reason },
  });
  await notifyAdmins({
    category: "APPROVALS",
    title: "Leave request",
    body: `${a.name} requested leave ${body.fromDate === body.toDate ? body.fromDate : `${body.fromDate} to ${body.toDate}`}.`,
    actionLabel: "Open",
    href: "/admin/leave",
  });
  res.status(201).json({ id: l.id });
});

// ───────────────────────────── Public intake (mobile app) ─────────────────────────────
export const publicRegistrationsRouter = Router();
const intakeLimit = new RateLimiter(10, 60 * 60_000);

publicRegistrationsRouter.post("/", async (req, res) => {
  const hit = intakeLimit.hit(req.ctx.ip);
  if (!hit.ok) throw rateLimited(hit.retryAfter);
  const body = parseBody(publicRegistrationBody, req.body);
  const r = await db().registration.create({ data: { code: await nextRegistrationCode(), type: body.type, data: body.data } });
  const name = body.type === "STUDENT" ? body.data.studentName : body.data.name;
  await notifyAdmins({
    category: "APPROVALS",
    title: body.type === "STUDENT" ? "New parent registration" : "New staff registration",
    body: body.type === "STUDENT" ? `${body.data.fatherName || body.data.motherName} registered ${name}. Review details.` : `${name} registered as staff. Review details.`,
    actionLabel: "Review",
    href: `/admin/approvals/registrations/${r.id}`,
    urgent: true,
  });
  res.status(201).json({ code: r.code, status: "PENDING" });
});

/** Parent enrolment change intake (used by the app once parent sign-in exists). */
export async function createEnrolmentChange(studentId: string, addCourseIds: string[], removeCourseIds: string[]) {
  const s = await db().student.findUniqueOrThrow({ where: { id: studentId }, select: { name: true } });
  const c = await db().enrolmentChange.create({ data: { code: await nextEnrolmentChangeCode(), studentId, addCourseIds, removeCourseIds } });
  await notifyAdmins({ category: "APPROVALS", title: "Course enrolment change", body: `A course change was requested for ${s.name}.`, actionLabel: "Review", href: `/admin/approvals/enrolment/${c.id}` });
  return c;
}
