import { COURSE_CATEGORIES, courseNameSchema, formatINR, type Grade, gradeLabel, gradeNumber, gradesAllowedFor, longTextSchema, rupeesSchema } from "@dd/shared/domain";
import { Router } from "express";
import * as z from "zod";
import { dbDate, todayIst, ymd } from "../../lib/dates";
import { db } from "../../lib/db";
import { badRequest, conflict, notFound } from "../../lib/errors";
import { adminOnly } from "../../middleware/auth";
import { idParam, parseBody, zDate } from "../../middleware/validate";
import { audit } from "../../services/audit";
import { notifyParents } from "../../services/notify";
import { zGrade } from "../common";

/**
 * /v1/courses and /v1/competitions (admin). Fees are editable at any time; every change is
 * audited. Grade rules from the scope are enforced per category (gradesAllowedFor).
 */
export const coursesRouter = Router();
coursesRouter.use(adminOnly);

const courseBody = z
  .object({
    name: courseNameSchema,
    category: z.enum(COURSE_CATEGORIES),
    grades: z.array(zGrade).min(1, { error: "Choose at least one grade." }),
    subjects: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
    monthlyFee: rupeesSchema,
    isMandatory: z.boolean().default(false),
    published: z.boolean().default(true),
  })
  .strict();

function checkGrades(category: (typeof COURSE_CATEGORIES)[number], grades: string[]) {
  const allowed = gradesAllowedFor(category);
  const bad = grades.filter((g) => !allowed.includes(g as never));
  if (bad.length)
    throw badRequest(`This kind of course can't be offered for ${bad.map((g) => gradeLabel(g as never)).join(", ")}.`, { grades: "Some grades aren't allowed for this course type." });
}

coursesRouter.get("/", async (_req, res) => {
  const courses = await db().course.findMany({
    orderBy: [{ archivedAt: { sort: "desc", nulls: "first" } }, { category: "asc" }, { name: "asc" }],
    include: { _count: { select: { enrolments: { where: { endedAt: null } } } } },
  });
  res.json({
    rows: courses.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      grades: c.grades,
      subjects: c.subjects,
      monthlyFee: c.monthlyFee,
      isMandatory: c.isMandatory,
      published: c.published,
      archived: !!c.archivedAt,
      students: c._count.enrolments,
    })),
  });
});

coursesRouter.post("/", async (req, res) => {
  const body = parseBody(courseBody, req.body);
  checkGrades(body.category, body.grades);
  const c = await db().course.create({ data: body });
  await audit(req, { area: "COURSES", action: "course.create", summary: `created the course ${c.name} (${formatINR(c.monthlyFee)}/month)`, entityType: "Course", entityId: c.id, after: body });
  res.status(201).json({ id: c.id });
});

coursesRouter.patch("/:id", async (req, res) => {
  const id = idParam(req.params.id, "That course");
  const body = parseBody(courseBody.partial().strict(), req.body);
  const before = await db().course.findUnique({ where: { id } });
  if (!before) throw notFound("That course");
  checkGrades(body.category ?? before.category, body.grades ?? before.grades);
  const after = await db().course.update({ where: { id }, data: body });
  await audit(req, {
    area: "COURSES",
    action: "course.update",
    summary: `updated the course ${after.name}`,
    entityType: "Course",
    entityId: id,
    fromLabel: body.monthlyFee !== undefined && body.monthlyFee !== before.monthlyFee ? formatINR(before.monthlyFee) : null,
    toLabel: body.monthlyFee !== undefined && body.monthlyFee !== before.monthlyFee ? formatINR(after.monthlyFee) : null,
    before,
    after,
  });
  res.json({ ok: true });
});

/** Archive (hidden from enrolment). Only when nobody is enrolled. */
coursesRouter.post("/:id/archive", async (req, res) => {
  const id = idParam(req.params.id, "That course");
  const c = await db().course.findUnique({ where: { id }, include: { _count: { select: { enrolments: { where: { endedAt: null } } } } } });
  if (!c) throw notFound("That course");
  const { archived } = parseBody(z.object({ archived: z.boolean() }).strict(), req.body);
  if (archived && c._count.enrolments) throw conflict(`${c._count.enrolments} students are still enrolled. Move them first.`);
  await db().course.update({ where: { id }, data: { archivedAt: archived ? new Date() : null, published: archived ? false : c.published } });
  await audit(req, { area: "COURSES", action: archived ? "course.archive" : "course.restore", summary: `${archived ? "archived" : "restored"} the course ${c.name}`, entityType: "Course", entityId: id });
  res.json({ ok: true });
});

/**
 * Roster for one course: students waiting for approval (registrations that chose it), active
 * students enrolled in it with the teacher allocated to each, and the teachers who teach it.
 */
coursesRouter.get("/:id/roster", async (req, res) => {
  const id = idParam(req.params.id, "That course");
  const course = await db().course.findUnique({ where: { id }, select: { id: true, name: true, grades: true, monthlyFee: true, archivedAt: true } });
  if (!course) throw notFound("That course");

  const [regs, enrolments, assignments] = await Promise.all([
    db().registration.findMany({ where: { type: "STUDENT", status: { in: ["PENDING", "INFO_REQUESTED"] } }, orderBy: { submittedAt: "asc" } }),
    db().enrolment.findMany({
      where: { courseId: id, endedAt: null, student: { status: "ACTIVE" } },
      include: {
        student: {
          select: {
            id: true,
            code: true,
            name: true,
            grade: true,
            parentName: true,
            mobile: true,
            allocations: { where: { courseId: id }, select: { staffId: true, staff: { select: { name: true } } }, take: 1 },
          },
        },
      },
    }),
    db().teachingAssignment.findMany({
      where: { courseId: id, staff: { status: "ACTIVE" } },
      include: { staff: { select: { id: true, name: true, subject: true } } },
      orderBy: [{ grade: "asc" }, { staff: { name: "asc" } }],
    }),
  ]);

  const pending = regs
    .map((r) => ({ r, d: (r.data ?? {}) as Record<string, unknown> }))
    .filter(({ d }) => Array.isArray(d.courseIds) && (d.courseIds as unknown[]).includes(id))
    .map(({ r, d }) => ({
      id: r.id,
      code: r.code,
      status: r.status,
      submittedAt: r.submittedAt,
      studentName: typeof d.studentName === "string" ? d.studentName : "",
      grade: typeof d.grade === "string" ? d.grade : "",
      parentName: (typeof d.fatherName === "string" && d.fatherName) || (typeof d.motherName === "string" ? d.motherName : ""),
      mobile: typeof d.mobile === "string" ? d.mobile : "",
      learningMode: typeof d.learningMode === "string" ? d.learningMode : "GROUP",
      sessionType: typeof d.sessionType === "string" ? d.sessionType : "OFFLINE",
    }));

  const allocatedCount = new Map<string, number>();
  const students = enrolments
    .map((e) => e.student)
    .sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name))
    .map((s) => {
      const alloc = s.allocations[0];
      if (alloc) allocatedCount.set(`${alloc.staffId}|${s.grade}`, (allocatedCount.get(`${alloc.staffId}|${s.grade}`) ?? 0) + 1);
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        grade: s.grade,
        parentName: s.parentName,
        mobile: s.mobile,
        allocation: alloc ? { staffId: alloc.staffId, staffName: alloc.staff.name } : null,
      };
    });

  res.json({
    course: { id: course.id, name: course.name, grades: course.grades, monthlyFee: course.monthlyFee, archived: !!course.archivedAt },
    pending,
    students,
    // One row per teacher, however many grades they teach this course in.
    staff: [...assignments
      .reduce((byStaff, a) => {
        const row = byStaff.get(a.staffId) ?? { staffId: a.staffId, name: a.staff.name, subjects: [] as string[], grades: [] as Grade[] };
        const subject = a.subject || a.staff.subject || "";
        if (subject && !row.subjects.includes(subject)) row.subjects.push(subject);
        if (!row.grades.includes(a.grade)) row.grades.push(a.grade);
        return byStaff.set(a.staffId, row);
      }, new Map<string, { staffId: string; name: string; subjects: string[]; grades: Grade[] }>())
      .values()].map((r) => ({
      staffId: r.staffId,
      name: r.name,
      subject: r.subjects.join(", "),
      grades: [...r.grades].sort((x, y) => gradeNumber(x) - gradeNumber(y)),
      allocated: r.grades.reduce((n, g) => n + (allocatedCount.get(`${r.staffId}|${g}`) ?? 0), 0),
    })),
  });
});

const allocateBody = z.object({ studentId: z.uuid({ error: "Invalid id." }), staffId: z.uuid({ error: "Invalid id." }).nullable() }).strict();

/**
 * Allocates a student to the teacher who handles them for this course. The teacher must teach
 * this course for the student's grade. Staff already see these students through that class.
 * Pass staffId: null to clear the allocation.
 */
coursesRouter.put("/:id/allocations", async (req, res) => {
  const courseId = idParam(req.params.id, "That course");
  const { studentId, staffId } = parseBody(allocateBody, req.body);
  const enrolment = await db().enrolment.findFirst({
    where: { courseId, studentId, endedAt: null },
    include: { course: { select: { name: true } }, student: { select: { name: true, grade: true } } },
  });
  if (!enrolment) throw badRequest("This student isn't enrolled in that course.", { studentId: "Pick a student enrolled in this course." });
  const { student, course } = enrolment;

  if (staffId === null) {
    await db().studentAllocation.deleteMany({ where: { courseId, studentId } });
    await audit(req, { area: "COURSES", action: "allocation.clear", summary: `cleared the teacher for ${student.name} in ${course.name}`, entityType: "Student", entityId: studentId });
    res.json({ ok: true, allocation: null });
    return;
  }

  const assignment = await db().teachingAssignment.findFirst({
    where: { staffId, courseId, grade: student.grade, staff: { status: "ACTIVE" } },
    include: { staff: { select: { name: true } } },
  });
  if (!assignment) throw badRequest("That teacher doesn't teach this course for the student's grade.", { staffId: "Choose a teacher for this course and grade." });

  await db().studentAllocation.upsert({
    where: { studentId_courseId: { studentId, courseId } },
    update: { staffId },
    create: { studentId, courseId, staffId },
  });
  await audit(req, {
    area: "COURSES",
    action: "allocation.set",
    summary: `allocated ${student.name} in ${course.name} to ${assignment.staff.name}`,
    entityType: "Student",
    entityId: studentId,
  });
  res.json({ ok: true, allocation: { staffId, staffName: assignment.staff.name } });
});

// ───────────────────────────── Competitions ─────────────────────────────
export const competitionsRouter = Router();
competitionsRouter.use(adminOnly);

const competitionBody = z
  .object({
    name: courseNameSchema,
    date: zDate,
    grades: z.array(zGrade).min(1, { error: "Choose at least one grade." }),
    registrationFee: rupeesSchema,
    transportFee: rupeesSchema.default(0),
    description: longTextSchema.default(""),
    published: z.boolean().default(true),
    subCompetitions: z
      .array(z.object({ id: z.uuid().optional(), name: courseNameSchema, fee: rupeesSchema }).strict())
      .max(20)
      .default([]),
  })
  .strict();

competitionsRouter.get("/", async (_req, res) => {
  const rows = await db().competition.findMany({
    orderBy: [{ archivedAt: { sort: "desc", nulls: "first" } }, { date: "desc" }],
    include: { subCompetitions: { orderBy: { sortOrder: "asc" } }, _count: { select: { registrations: true } } },
  });
  const today = todayIst();
  res.json({
    rows: rows.map((c) => ({
      id: c.id,
      name: c.name,
      date: ymd(c.date),
      upcoming: ymd(c.date) >= today,
      grades: c.grades,
      registrationFee: c.registrationFee,
      transportFee: c.transportFee,
      description: c.description,
      published: c.published,
      archived: !!c.archivedAt,
      subCompetitions: c.subCompetitions.map((s) => ({ id: s.id, name: s.name, fee: s.fee })),
      registrations: c._count.registrations,
    })),
  });
});

competitionsRouter.get("/:id/registrations", async (req, res) => {
  const id = idParam(req.params.id, "That competition");
  const c = await db().competition.findUnique({ where: { id }, include: { subCompetitions: true } });
  if (!c) throw notFound("That competition");
  const regs = await db().competitionRegistration.findMany({ where: { competitionId: id }, include: { student: { select: { name: true, grade: true, code: true } } }, orderBy: { createdAt: "asc" } });
  const subs = new Map(c.subCompetitions.map((s) => [s.id, s.name]));
  res.json({
    rows: regs.map((r) => ({
      id: r.id,
      student: r.student.name,
      code: r.student.code,
      grade: gradeLabel(r.student.grade),
      events: r.subCompetitionIds.map((s) => subs.get(s) ?? "—"),
      transport: r.transport,
      total: r.total,
      at: r.createdAt,
    })),
  });
});

competitionsRouter.post("/", async (req, res) => {
  const body = parseBody(competitionBody, req.body);
  const c = await db().competition.create({
    data: {
      name: body.name,
      date: dbDate(body.date),
      grades: body.grades,
      registrationFee: body.registrationFee,
      transportFee: body.transportFee,
      description: body.description || null,
      published: body.published,
      subCompetitions: { create: body.subCompetitions.map((s, i) => ({ name: s.name, fee: s.fee, sortOrder: i })) },
    },
  });
  // Notify parents of the relevant grades on creation (scope §6.2).
  let notified = 0;
  if (body.published) {
    const students = await db().student.findMany({ where: { status: "ACTIVE", grade: { in: body.grades } }, select: { id: true } });
    notified = await notifyParents(
      students.map((s) => s.id),
      { category: "ANNOUNCEMENT", title: `New competition: ${c.name}`, body: `${c.name} on ${body.date}. Register from Course Enrolment in the app.` },
    );
  }
  await audit(req, { area: "COURSES", action: "competition.create", summary: `created the competition ${c.name}`, entityType: "Competition", entityId: c.id, after: body });
  res.status(201).json({ id: c.id, notified });
});

competitionsRouter.patch("/:id", async (req, res) => {
  const id = idParam(req.params.id, "That competition");
  const body = parseBody(competitionBody.partial().strict(), req.body);
  const before = await db().competition.findUnique({ where: { id }, include: { subCompetitions: true } });
  if (!before) throw notFound("That competition");
  await db().$transaction(async (tx) => {
    await tx.competition.update({
      where: { id },
      data: {
        name: body.name,
        date: body.date ? dbDate(body.date) : undefined,
        grades: body.grades,
        registrationFee: body.registrationFee,
        transportFee: body.transportFee,
        description: body.description === undefined ? undefined : body.description || null,
        published: body.published,
      },
    });
    if (body.subCompetitions) {
      const keep = body.subCompetitions.filter((s) => s.id).map((s) => s.id!);
      await tx.subCompetition.deleteMany({ where: { competitionId: id, id: { notIn: keep } } });
      for (const [i, s] of body.subCompetitions.entries()) {
        if (s.id && before.subCompetitions.some((x) => x.id === s.id)) await tx.subCompetition.update({ where: { id: s.id }, data: { name: s.name, fee: s.fee, sortOrder: i } });
        else await tx.subCompetition.create({ data: { competitionId: id, name: s.name, fee: s.fee, sortOrder: i } });
      }
    }
  });
  await audit(req, { area: "COURSES", action: "competition.update", summary: `updated the competition ${body.name ?? before.name}`, entityType: "Competition", entityId: id, before, after: body });
  res.json({ ok: true });
});

competitionsRouter.post("/:id/archive", async (req, res) => {
  const id = idParam(req.params.id, "That competition");
  const { archived } = parseBody(z.object({ archived: z.boolean() }).strict(), req.body);
  const c = await db().competition.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } }).catch(() => null);
  if (!c) throw notFound("That competition");
  await audit(req, { area: "COURSES", action: archived ? "competition.archive" : "competition.restore", summary: `${archived ? "archived" : "restored"} the competition ${c.name}`, entityType: "Competition", entityId: id });
  res.json({ ok: true });
});
