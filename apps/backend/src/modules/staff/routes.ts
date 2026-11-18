import type { Prisma } from "@dd/db";
import { emailSchema } from "@dd/shared/auth";
import { addressSchema, gradeLabel, gradeNumber, mobileSchema, personNameSchema } from "@dd/shared/domain";
import { Router } from "express";
import * as z from "zod";
import { nextStaffCode } from "../../lib/codes";
import { addDays, dbDate, istWeekday, todayIst, ymd } from "../../lib/dates";
import { db } from "../../lib/db";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors";
import { parseFormat, sendTable } from "../../lib/export";
import { actor, adminOnly } from "../../middleware/auth";
import { idParam, parseBody, parseQuery, zId, zSearch, zTime } from "../../middleware/validate";
import { audit } from "../../services/audit";
import { applyRows, currentRows, diffRows, flattenSelections, teachingCatalog, toSelections, validateRows } from "../../services/teaching";
import { classStudentsWhere, staffClasses } from "../../services/scope";
import { issueTemporaryPassword, processPasswordHelp } from "../auth/service";
import { revokeAllSessions } from "../auth/sessions";
import { maskMobile, zGrade } from "../common";

/**
 * /v1/staff (admin): staff list, staff detail, teaching assignment (grade + course, which
 * decides which students a teacher sees), timetable, password reset, disable/enable.
 */
export const staffRouter = Router();
staffRouter.use(adminOnly);

/** Did this teacher mark attendance today for every class they have today (or any class)? */
async function attendanceDoneToday(staffId: string) {
  const today = dbDate(todayIst());
  const rows = await db().teachingAssignment.findMany({ where: { staffId }, select: { grade: true, courseId: true } });
  if (!rows.length) return null;
  for (const r of rows) {
    const marked = await db().attendanceRecord.count({ where: { date: today, student: classStudentsWhere(r) } });
    if (!marked) return false;
  }
  return true;
}

const listQuery = z.object({ q: zSearch, filter: z.enum(["all", "active", "unassigned"]).default("all") });

async function staffRows(q: z.infer<typeof listQuery>) {
  const where: Prisma.UserWhereInput = { role: "STAFF" };
  if (q.q) where.OR = [{ name: { contains: q.q, mode: "insensitive" } }, { subject: { contains: q.q, mode: "insensitive" } }, { mobile: { contains: q.q } }];
  if (q.filter === "active") where.status = "ACTIVE";
  if (q.filter === "unassigned") where.teachingAssignments = { none: {} };
  const users = await db().user.findMany({
    where,
    orderBy: { name: "asc" },
    include: { teachingAssignments: { include: { course: { select: { name: true } } } } },
  });
  return Promise.all(
    users.map(async (u) => {
      const grades = [...new Set(u.teachingAssignments.map((t) => t.grade))].sort((a, b) => gradeNumber(a) - gradeNumber(b));
      const courses = [...new Set(u.teachingAssignments.map((t) => t.subject || t.course.name))];
      const students = u.teachingAssignments.length
        ? await db().student.count({ where: { OR: u.teachingAssignments.map((t) => classStudentsWhere(t)) } })
        : 0;
      return {
        id: u.id,
        name: u.name,
        mobile: maskMobile(u.mobile),
        subject: u.subject,
        email: u.email,
        grades: grades.map((g) => gradeLabel(g).replace("Grade ", "")),
        gradesLabel: grades.length ? `Grade ${grades.map((g) => gradeLabel(g).replace("Grade ", "")).join(", ")}` : "—",
        courses,
        students,
        today: u.status === "ACTIVE" ? await attendanceDoneToday(u.id) : null,
        status: u.status,
      };
    }),
  );
}

staffRouter.get("/", async (req, res) => {
  const q = parseQuery(listQuery, req.query);
  const today = dbDate(todayIst());
  const [rows, active, unassigned, updatesToday, pendingRegistrations] = await Promise.all([
    staffRows(q),
    db().user.count({ where: { role: "STAFF", status: "ACTIVE" } }),
    db().user.count({ where: { role: "STAFF", status: { in: ["ACTIVE", "INVITED"] }, teachingAssignments: { none: {} } } }),
    db().classUpdate.count({ where: { date: today } }),
    db().registration.count({ where: { type: "STAFF", status: { in: ["PENDING", "INFO_REQUESTED"] } } }),
  ]);
  const notMarked = q.filter === "all" && !q.q ? rows.filter((r) => r.today === false).length : (await staffRows({ filter: "active" })).filter((r) => r.today === false).length;
  res.json({ stats: { active, unassigned, notMarked, updatesToday }, pendingRegistrations, rows });
});

staffRouter.get("/export", async (req, res) => {
  const q = parseQuery(listQuery.extend({ format: z.string().optional() }), req.query);
  const rows = await staffRows(q);
  sendTable(res, parseFormat(q.format), "staff", [
    { header: "Teacher", value: (r) => r.name },
    { header: "Email", value: (r) => r.email },
    { header: "Subject", value: (r) => r.subject },
    { header: "Assigned grades", value: (r) => r.gradesLabel },
    { header: "Courses", value: (r) => r.courses.join(", ") },
    { header: "Students", value: (r) => r.students },
    { header: "Status", value: (r) => r.status },
  ], rows);
});

staffRouter.get("/:id", async (req, res) => {
  const id = idParam(req.params.id, "That staff member");
  const u = await db().user.findFirst({
    where: { id, role: "STAFF" },
    include: { teachingAssignments: { include: { course: true } }, rfidCards: { where: { status: "ACTIVE" }, take: 1 } },
  });
  if (!u) throw notFound("That staff member");
  const classes = await staffClasses(id);
  const today = todayIst();
  const weekStart = addDays(today, -((istWeekday() + 6) % 7)); // Monday
  const students = u.teachingAssignments.length ? await db().student.count({ where: { OR: u.teachingAssignments.map((t) => classStudentsWhere(t)) } }) : 0;
  const [markedDays, updates, reviewed, papers] = await Promise.all([
    db().attendanceRecord.groupBy({ by: ["date"], where: { markedById: id, date: { gte: dbDate(weekStart), lte: dbDate(today) } } }),
    db().classUpdate.count({ where: { staffId: id, date: { gte: dbDate(weekStart) } } }),
    db().homeworkSubmission.count({ where: { checkedById: id, checkedAt: { gte: dbDate(weekStart) } } }),
    db().questionPaper.findMany({ where: { uploadedById: id, createdAt: { gte: dbDate(weekStart) } }, select: { status: true } }),
  ]);
  const workdays = Math.min(6, ((istWeekday() + 6) % 7) + 1);
  const awaiting = papers.filter((p) => p.status === "AWAITING").length;
  res.json({
    staff: {
      id: u.id,
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      mobileMasked: maskMobile(u.mobile),
      subject: u.subject,
      designation: u.designation ?? "Teacher",
      staffCode: u.staffCode,
      status: u.status,
      rfid: u.rfidCards[0]?.uid ?? null,
      lastLoginAt: u.lastLoginAt,
    },
    assignment: { selection: toSelections(u.teachingAssignments.map((t) => ({ grade: t.grade, courseId: t.courseId, subject: t.subject }))) },
    classes,
    studentsVisible: students,
    week: {
      attendanceDays: markedDays.length,
      workdays,
      updates,
      reviewed,
      papersUploaded: papers.length,
      papersAwaiting: awaiting,
    },
  });
});

/** Grade by grade: for each grade the courses taught, and for a course with subjects the subjects (none = whole course). */
const assignmentBody = z
  .object({
    selection: z
      .array(z.object({ grade: zGrade, courseId: zId, subjects: z.array(z.string().trim().min(1).max(60)).max(10).default([]) }).strict())
      .max(300),
  })
  .strict();

/** Replaces the teacher's assignment with every valid grade × course pair. Timetables of kept rows stay. */
staffRouter.put("/:id/assignment", async (req, res) => {
  const id = idParam(req.params.id, "That staff member");
  const body = parseBody(assignmentBody, req.body);
  const u = await db().user.findFirst({ where: { id, role: "STAFF" } });
  if (!u) throw notFound("That staff member");
  const before = await currentRows(id);
  const wanted = validateRows(flattenSelections(body.selection), await teachingCatalog());
  await applyRows(id, wanted);
  const diff = diffRows(before, wanted);
  await audit(req, {
    area: "STAFF",
    action: "staff.assignment",
    summary: `changed ${u.name}'s teaching: ${diff.added.length} added, ${diff.removed.length} removed`,
    entityType: "User",
    entityId: id,
    before,
    after: wanted,
  });
  res.json({ ok: true, rows: wanted.length });
});

const timetableBody = z
  .object({
    rows: z
      .array(
        z
          .object({
            key: z.string().max(120),
            days: z.array(z.number().int().min(0).max(6)).max(7),
            startTime: zTime.or(z.literal("")),
            endTime: zTime.or(z.literal("")),
            room: z.string().trim().max(30),
          })
          .strict(),
      )
      .max(60),
  })
  .strict();

staffRouter.put("/:id/timetable", async (req, res) => {
  const id = idParam(req.params.id, "That staff member");
  const { rows } = parseBody(timetableBody, req.body);
  const assignments = await db().teachingAssignment.findMany({ where: { staffId: id } });
  for (const r of rows) {
    const t = assignments.find((x) => `${x.grade}.${x.courseId}.${x.subject}` === r.key);
    if (!t) continue;
    if (r.startTime && r.endTime && r.endTime <= r.startTime) throw badRequest("A class must end after it starts.");
    await db().teachingAssignment.update({
      where: { id: t.id },
      data: { days: [...new Set(r.days)].sort(), startTime: r.startTime || null, endTime: r.endTime || null, room: r.room || null },
    });
  }
  await audit(req, { area: "STAFF", action: "staff.timetable", summary: "updated a teacher's timetable", entityType: "User", entityId: id, after: rows });
  res.json({ ok: true });
});

const createBody = z
  .object({ name: personNameSchema, email: emailSchema, mobile: mobileSchema, subject: z.string().trim().max(60).default(""), address: addressSchema.default("") })
  .strict();

/** Admin adds a teacher directly: account is created and the temporary password emailed. */
staffRouter.post("/", async (req, res) => {
  const body = parseBody(createBody, req.body);
  if (await db().user.findUnique({ where: { email: body.email } })) throw conflict("An account with this email already exists.", { fields: { email: "Already registered." } });
  const a = actor(req);
  const user = await db().user.create({
    data: {
      ...body,
      subject: body.subject || null,
      address: body.address || null,
      role: "STAFF",
      status: "PENDING_APPROVAL",
      designation: "Teacher",
      staffCode: await nextStaffCode(),
      approvedAt: new Date(),
      approvedById: a.id,
    },
  });
  await issueTemporaryPassword(user, req.ctx);
  await audit(req, { area: "STAFF", action: "staff.create", summary: `added ${user.name} as staff`, entityType: "User", entityId: user.id, toLabel: "Invited" });
  res.status(201).json({ id: user.id });
});

const patchBody = z
  .object({ name: personNameSchema, mobile: mobileSchema, subject: z.string().trim().max(60), designation: z.string().trim().max(100), address: addressSchema })
  .partial()
  .strict();

staffRouter.patch("/:id", async (req, res) => {
  const id = idParam(req.params.id, "That staff member");
  const body = parseBody(patchBody, req.body);
  const u = await db().user.findFirst({ where: { id, role: "STAFF" } });
  if (!u) throw notFound("That staff member");
  await db().user.update({ where: { id }, data: body });
  await audit(req, { area: "STAFF", action: "staff.update", summary: `updated ${u.name}'s details`, entityType: "User", entityId: id, after: body });
  res.json({ ok: true });
});

/** Active → reset link; Invited → fresh temporary password. */
staffRouter.post("/:id/reset-password", async (req, res) => {
  const id = idParam(req.params.id, "That staff member");
  const u = await db().user.findFirst({ where: { id, role: "STAFF" } });
  if (!u) throw notFound("That staff member");
  if (u.status === "DISABLED" || u.status === "REJECTED") throw conflict("Enable the account first.");
  if (u.status === "INVITED" || u.status === "PENDING_APPROVAL") await issueTemporaryPassword(u, req.ctx, { resent: true });
  else await processPasswordHelp(u.email, req.ctx);
  await audit(req, { area: "STAFF", action: "staff.reset_password", summary: `sent ${u.name} a password reset`, entityType: "User", entityId: id });
  res.json({ ok: true, sentTo: u.email });
});

staffRouter.post("/:id/status", async (req, res) => {
  const id = idParam(req.params.id, "That staff member");
  const { status } = parseBody(z.object({ status: z.enum(["ACTIVE", "DISABLED"]) }).strict(), req.body);
  const u = await db().user.findFirst({ where: { id, role: "STAFF" } });
  if (!u) throw notFound("That staff member");
  if (u.isMainAdmin) throw forbidden();
  if (status === "ACTIVE" && !u.passwordHash) {
    // Never activated: re-invite instead of enabling an account without a password.
    await db().user.update({ where: { id }, data: { status: "PENDING_APPROVAL" } });
    await issueTemporaryPassword(u, req.ctx, { resent: true });
  } else {
    await db().user.update({ where: { id }, data: { status } });
  }
  if (status === "DISABLED") await revokeAllSessions(id, "ACCOUNT_DISABLED");
  await audit(req, {
    area: "STAFF",
    action: status === "DISABLED" ? "staff.disable" : "staff.enable",
    summary: `${status === "DISABLED" ? "disabled" : "enabled"} ${u.name}'s account`,
    entityType: "User",
    entityId: id,
    fromLabel: u.status === "ACTIVE" ? "Active" : u.status === "DISABLED" ? "Disabled" : u.status,
    toLabel: status === "ACTIVE" ? "Active" : "Disabled",
  });
  res.json({ ok: true });
});

/**
 * Permanently deletes a staff account. Their sessions, assignments, timetable, RFID cards and
 * leave requests go with it. Class updates, homework, tests and attendance they recorded stay,
 * with the teacher link cleared. Use Disable instead to block sign-in and keep the account.
 */
staffRouter.delete("/:id", async (req, res) => {
  const id = idParam(req.params.id, "That staff member");
  const u = await db().user.findFirst({ where: { id, role: "STAFF" } });
  if (!u) throw notFound("That staff member");
  if (u.isMainAdmin) throw forbidden();
  await db().user.delete({ where: { id } });
  await audit(req, { area: "STAFF", action: "staff.delete", summary: `deleted ${u.name}'s account`, entityType: "User", entityId: id, fromLabel: u.name, toLabel: "Deleted" });
  res.json({ ok: true });
});

export { ymd };
