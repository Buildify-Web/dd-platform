import type { Prisma } from "@dd/db";
import { emailSchema } from "@dd/shared/auth";
import {
  addressSchema,
  effectiveSessionType,
  gradeLabel,
  gradeNumber,
  isGrade,
  LEARNING_MODES,
  learningModeLabel,
  mobileSchema,
  monthKey,
  personNameSchema,
  SESSION_TYPES,
  sessionTypeLabel,
} from "@dd/shared/domain";
import { Router } from "express";
import * as z from "zod";
import { monthBounds, prevMonth, dbDate, todayIst, ymd } from "../../lib/dates";
import { db } from "../../lib/db";
import { badRequest, conflict, notFound } from "../../lib/errors";
import { parseFormat, sendTable } from "../../lib/export";
import { actor, adminOnly, portalUser } from "../../middleware/auth";
import { idParam, parseBody, parseQuery, zId, zMonth, zPage, zSearch } from "../../middleware/validate";
import { audit } from "../../services/audit";
import { removeFile } from "../../services/files";
import { balanceOf, ensureRecord, recalc } from "../../services/fees";
import { assertStudentAccess, classStudentsWhere, staffClasses as staffClassesFor } from "../../services/scope";
import { zGrade, zOptionalId } from "../common";

/**
 * /v1/students: the Students list, the student profile (all tabs) and enrolment edits.
 * Admin only, except the read endpoints staff need for their own students.
 */
export const studentsRouter = Router();

const PAGE_SIZE = 10;

const listQuery = z.object({
  q: zSearch,
  grade: z.union([zGrade, z.literal("")]).optional(),
  courseId: zOptionalId,
  mode: z.enum(["", "ONLINE", "OFFLINE", "ONE_ON_ONE", "GROUP"]).optional(),
  status: z.enum(["", "ACTIVE", "INACTIVE"]).optional(),
  page: zPage,
});

function listWhere(q: z.infer<typeof listQuery>): Prisma.StudentWhereInput {
  const and: Prisma.StudentWhereInput[] = [];
  if (q.q)
    and.push({
      OR: [
        { name: { contains: q.q, mode: "insensitive" } },
        { parentName: { contains: q.q, mode: "insensitive" } },
        { mobile: { contains: q.q } },
        { code: { contains: q.q, mode: "insensitive" } },
      ],
    });
  if (q.grade) and.push({ grade: q.grade });
  if (q.courseId) and.push({ enrolments: { some: { courseId: q.courseId, endedAt: null } } });
  if (q.mode === "ONLINE" || q.mode === "OFFLINE") and.push({ sessionType: q.mode });
  if (q.mode === "ONE_ON_ONE" || q.mode === "GROUP") and.push({ learningMode: q.mode });
  if (q.status) and.push({ status: q.status });
  return and.length ? { AND: and } : {};
}

/** Attendance % (present / marked, NA excluded) per student for a date range. */
async function attendanceRates(studentIds: string[], from: string, to: string) {
  if (!studentIds.length) return new Map<string, number | null>();
  const rows = await db().attendanceRecord.groupBy({
    by: ["studentId", "status"],
    where: { studentId: { in: studentIds }, date: { gte: dbDate(from), lte: dbDate(to) }, status: { not: "NA" } },
    _count: { _all: true },
  });
  const agg = new Map<string, { p: number; t: number }>();
  for (const r of rows) {
    const x = agg.get(r.studentId) ?? { p: 0, t: 0 };
    x.t += r._count._all;
    if (r.status === "PRESENT") x.p += r._count._all;
    agg.set(r.studentId, x);
  }
  return new Map(studentIds.map((id) => [id, agg.get(id)?.t ? Math.round((agg.get(id)!.p / agg.get(id)!.t) * 100) : null]));
}

const courseShort = (name: string) => name.replace("Science", "Sci");

async function listRows(where: Prisma.StudentWhereInput, skip: number, take: number) {
  const students = await db().student.findMany({
    where,
    orderBy: [{ status: "asc" }, { name: "asc" }],
    skip,
    take,
    include: {
      enrolments: { where: { endedAt: null }, include: { course: { select: { name: true } } } },
      feeRecords: { where: { month: monthKey() }, select: { status: true, totalDue: true, paid: true } },
    },
  });
  const { from } = monthBounds(monthKey());
  const rates = await attendanceRates(
    students.map((s) => s.id),
    from,
    ymd(new Date()),
  );
  return students.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    parentName: s.parentName,
    mobile: s.mobile,
    grade: s.grade,
    gradeLabel: gradeLabel(s.grade),
    courses: s.enrolments.map((e) => courseShort(e.course.name)),
    sessionType: s.sessionType,
    learningMode: s.learningMode,
    modeLabel: s.enrolments.length ? `${sessionTypeLabel(s.sessionType)} · ${learningModeLabel(s.learningMode)}` : null,
    attendance: rates.get(s.id) ?? null,
    fee: s.feeRecords[0] ? { status: s.feeRecords[0].status, balance: balanceOf(s.feeRecords[0]) } : null,
    status: s.status,
  }));
}

studentsRouter.get("/", ...adminOnly, async (req, res) => {
  const q = parseQuery(listQuery, req.query);
  const where = listWhere(q);
  const monthStart = new Date(`${monthKey()}-01T00:00:00+05:30`);
  const [total, active, inactive, oneOnOne, newThisMonth] = await Promise.all([
    db().student.count({ where }),
    db().student.count({ where: { status: "ACTIVE" } }),
    db().student.count({ where: { status: "INACTIVE" } }),
    db().student.count({ where: { status: "ACTIVE", learningMode: "ONE_ON_ONE" } }),
    db().student.count({ where: { joinedAt: { gte: monthStart } } }),
  ]);
  const rows = await listRows(where, (q.page - 1) * PAGE_SIZE, PAGE_SIZE);
  res.json({ stats: { active, inactive, oneOnOne, newThisMonth }, total, page: q.page, pageSize: PAGE_SIZE, rows });
});

studentsRouter.get("/export", ...adminOnly, async (req, res) => {
  const q = parseQuery(listQuery.extend({ format: z.string().optional() }), req.query);
  const rows = await listRows(listWhere(q), 0, 5000);
  sendTable(res, parseFormat(q.format), `students-${ymd(new Date())}`, [
    { header: "Admission no.", value: (r) => r.code },
    { header: "Student", value: (r) => r.name },
    { header: "Parent", value: (r) => r.parentName },
    { header: "Mobile", value: (r) => r.mobile },
    { header: "Grade", value: (r) => r.gradeLabel },
    { header: "Courses", value: (r) => r.courses.join(", ") },
    { header: "Session · mode", value: (r) => r.modeLabel },
    { header: "Attendance % (month)", value: (r) => r.attendance },
    { header: `Fees (${monthKey()})`, value: (r) => r.fee?.status ?? "" },
    { header: "Balance", value: (r) => r.fee?.balance ?? "" },
    { header: "Status", value: (r) => r.status },
  ], rows);
});

/** Admin: student registrations (website or app) still waiting for a decision, newest first. */
studentsRouter.get("/registrations", ...adminOnly, async (_req, res) => {
  const regs = await db().registration.findMany({
    where: { type: "STUDENT", status: { in: ["PENDING", "INFO_REQUESTED"] } },
    orderBy: { submittedAt: "desc" },
    take: 200,
  });
  const courseIds = [...new Set(regs.flatMap((r) => (Array.isArray((r.data as { courseIds?: unknown })?.courseIds) ? ((r.data as { courseIds: string[] }).courseIds) : [])))];
  const courses = await db().course.findMany({ where: { id: { in: courseIds } }, select: { id: true, name: true } });
  const nameOf = new Map(courses.map((c) => [c.id, c.name]));
  res.json({
    rows: regs.map((r) => {
      const d = (r.data ?? {}) as Record<string, unknown>;
      const ids = Array.isArray(d.courseIds) ? (d.courseIds as string[]) : [];
      return {
        id: r.id,
        code: r.code,
        status: r.status,
        submittedAt: r.submittedAt,
        studentName: typeof d.studentName === "string" ? d.studentName : "",
        gradeLabel: isGrade(d.grade) ? gradeLabel(d.grade) : "",
        parentName: (typeof d.fatherName === "string" && d.fatherName) || (typeof d.motherName === "string" ? d.motherName : ""),
        courses: ids.map((id) => nameOf.get(id)).filter((n): n is string => !!n),
        source: typeof d.schoolIdCardFileId === "string" ? "Website" : "App",
      };
    }),
  });
});

/** Staff: students in the classes this teacher is assigned to, grouped by class. */
studentsRouter.get("/mine", ...portalUser, async (req, res) => {
  const a = actor(req);
  const classes = await staffClassesFor(a.id);
  const { from } = monthBounds(monthKey());
  const out = [];
  for (const c of classes) {
    const students = await db().student.findMany({
      where: classStudentsWhere(c),
      orderBy: [{ rollNo: "asc" }, { name: "asc" }],
      select: { id: true, name: true, rollNo: true, parentName: true },
    });
    const ids = students.map((s) => s.id);
    const rates = await attendanceRates(ids, from, ymd(new Date()));
    const today = dbDate(todayIst());
    const todays = await db().attendanceRecord.findMany({ where: { studentId: { in: ids }, date: today }, select: { studentId: true, status: true } });
    const leaves = await db().leaveRequest.findMany({ where: { studentId: { in: ids }, status: "APPROVED", fromDate: { lte: today }, toDate: { gte: today } }, select: { studentId: true } });
    const todayBy = new Map(todays.map((t) => [t.studentId, t.status]));
    const onLeave = new Set(leaves.map((l) => l.studentId));
    out.push({
      key: c.key,
      label: c.label,
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        rollNo: s.rollNo,
        parentName: s.parentName,
        attendance: rates.get(s.id) ?? null,
        today: onLeave.has(s.id) ? "LEAVE" : (todayBy.get(s.id) ?? null),
      })),
    });
  }
  res.json({ classes: out });
});

/** Student profile header + stats + overview fields + courses. */
studentsRouter.get("/:id", ...portalUser, async (req, res) => {
  const id = idParam(req.params.id, "That student");
  await assertStudentAccess(actor(req), id);
  const s = await db().student.findUnique({
    where: { id },
    include: {
      enrolments: { where: { endedAt: null }, include: { course: true }, orderBy: { startedAt: "asc" } },
      rfidCards: { where: { status: "ACTIVE" }, take: 1 },
    },
  });
  if (!s) throw notFound("That student");
  const month = monthKey();
  const { from } = monthBounds(month);
  const prev = monthBounds(prevMonth(month));
  const [rate, prevRate, record, homeworkDone, homeworkTotal, lastMark, outstanding] = await Promise.all([
    attendanceRates([id], from, ymd(new Date())).then((m) => m.get(id) ?? null),
    attendanceRates([id], prev.from, prev.to).then((m) => m.get(id) ?? null),
    db().feeRecord.findUnique({ where: { studentId_month: { studentId: id, month } } }),
    db().homeworkSubmission.count({ where: { studentId: id, status: "CHECKED", homework: { givenOn: { gte: dbDate(from) } } } }),
    db().homework.count({
      where: { givenOn: { gte: dbDate(from) }, grade: s.grade, courseId: { in: s.enrolments.map((e) => e.courseId) } },
    }),
    db().mark.findFirst({ where: { studentId: id }, orderBy: { test: { createdAt: "desc" } }, include: { test: { include: { course: { select: { name: true } } } } } }),
    db().feeRecord.findMany({ where: { studentId: id }, select: { totalDue: true, paid: true } }),
  ]);
  const courses = await db().course.findMany({ where: { archivedAt: null, grades: { has: s.grade } }, orderBy: { name: "asc" } });
  res.json({
    student: {
      id: s.id,
      code: s.code,
      name: s.name,
      grade: s.grade,
      gradeLabel: gradeLabel(s.grade),
      rollNo: s.rollNo,
      parentName: s.parentName,
      fatherName: s.fatherName,
      motherName: s.motherName,
      mobile: s.mobile,
      email: s.email,
      address: s.address,
      dateOfBirth: s.dateOfBirth ? s.dateOfBirth.toISOString().slice(0, 10) : null,
      gender: s.gender,
      schoolName: s.schoolName,
      schoolIdCardFileId: s.schoolIdCardFileId,
      sessionType: s.sessionType,
      learningMode: s.learningMode,
      status: s.status,
      photoFileId: s.photoFileId,
      feeRemindersEnabled: s.feeRemindersEnabled,
      joinedAt: s.joinedAt,
      rfid: s.rfidCards[0]?.uid ?? null,
    },
    stats: {
      attendance: rate,
      attendanceDelta: rate !== null && prevRate !== null ? rate - prevRate : null,
      outstanding: outstanding.reduce((t, r) => t + balanceOf(r), 0),
      feeStatus: record?.status ?? null,
      homework: { done: homeworkDone, total: homeworkTotal },
      lastTest: lastMark
        ? { score: lastMark.score, max: lastMark.test.maxMarks, label: `${lastMark.test.subject || lastMark.test.course.name} · ${lastMark.test.name}` }
        : null,
    },
    enrolments: s.enrolments.map((e) => ({
      id: e.id,
      courseId: e.courseId,
      name: e.course.name,
      fee: e.course.monthlyFee,
      feeOverride: e.feeOverride,
      overrideReason: e.overrideReason,
      mandatory: e.course.isMandatory && (gradeNumber(s.grade) === 9 || gradeNumber(s.grade) === 10),
      startedAt: e.startedAt,
    })),
    availableCourses: courses
      .filter((c) => !s.enrolments.some((e) => e.courseId === c.id))
      .map((c) => ({ id: c.id, name: c.name, fee: c.monthlyFee })),
  });
});

const updateBody = z
  .object({
    name: personNameSchema,
    grade: zGrade,
    fatherName: personNameSchema.or(z.literal("")),
    motherName: personNameSchema.or(z.literal("")),
    mobile: mobileSchema,
    email: emailSchema.or(z.literal("")),
    address: addressSchema,
    sessionType: z.enum(SESSION_TYPES),
    learningMode: z.enum(LEARNING_MODES),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    feeRemindersEnabled: z.boolean(),
  })
  .partial()
  .strict();

studentsRouter.patch("/:id", ...adminOnly, async (req, res) => {
  const id = idParam(req.params.id, "That student");
  const body = parseBody(updateBody, req.body);
  const before = await db().student.findUnique({ where: { id }, include: { enrolments: { where: { endedAt: null } } } });
  if (!before) throw notFound("That student");
  if (body.status === "INACTIVE" && before.status !== "INACTIVE" && before.enrolments.length)
    throw conflict("A student can be made inactive only when no courses are enrolled. Remove their courses first.", { fields: { status: "Remove all courses first." } });
  if (body.grade && body.grade !== before.grade && before.enrolments.length)
    throw conflict("Change of grade: remove courses that aren't offered for the new grade first.", { fields: { grade: "Remove current courses first." } });
  const mode = body.learningMode ?? before.learningMode;
  const data: Prisma.StudentUpdateInput = {
    ...body,
    fatherName: body.fatherName === "" ? null : body.fatherName,
    motherName: body.motherName === "" ? null : body.motherName,
    email: body.email === "" ? null : body.email,
    sessionType: effectiveSessionType(mode, body.sessionType ?? before.sessionType),
  };
  if (body.fatherName || body.motherName) data.parentName = body.fatherName || body.motherName || before.parentName;
  const after = await db().student.update({ where: { id }, data });
  const changed = Object.keys(body).filter((k) => (before as Record<string, unknown>)[k] !== (after as Record<string, unknown>)[k]);
  if (changed.length)
    await audit(req, {
      area: "STUDENTS",
      action: "student.update",
      summary: `updated ${after.name}'s details (${changed.join(", ")})`,
      entityType: "Student",
      entityId: id,
      fromLabel: body.status && body.status !== before.status ? (before.status === "ACTIVE" ? "Active" : "Inactive") : null,
      toLabel: body.status && body.status !== before.status ? (after.status === "ACTIVE" ? "Active" : "Inactive") : null,
      before: Object.fromEntries(changed.map((k) => [k, (before as Record<string, unknown>)[k]])),
      after: Object.fromEntries(changed.map((k) => [k, (after as Record<string, unknown>)[k]])),
    });
  res.json({ ok: true });
});

// ── Enrolments (admin edits directly; parent requests go through approvals) ──
/**
 * Admin: permanently deletes a student, with their approved registration, photo and school ID
 * card. Refused when the student has payment records, because those are kept for the accounts
 * (mark the student inactive instead). Attendance, marks and homework go with the student.
 */
studentsRouter.delete("/:id", ...adminOnly, async (req, res) => {
  const id = idParam(req.params.id, "That student");
  const s = await db().student.findUnique({
    where: { id },
    select: { id: true, name: true, code: true, photoFileId: true, schoolIdCardFileId: true, registrationId: true, _count: { select: { payments: true } } },
  });
  if (!s) throw notFound("That student");
  if (s._count.payments > 0) {
    throw conflict("This student has payment records, so they can't be deleted. Mark them inactive instead to keep the accounts.");
  }
  await db().$transaction(async (tx) => {
    await tx.student.delete({ where: { id } });
    if (s.registrationId) await tx.registration.deleteMany({ where: { id: s.registrationId } });
  });
  for (const fileId of [s.photoFileId, s.schoolIdCardFileId]) {
    if (fileId) await removeFile(fileId);
  }
  await audit(req, { area: "STUDENTS", action: "student.delete", summary: `deleted the student ${s.name} (${s.code})`, entityType: "Student", entityId: id, fromLabel: s.name, toLabel: "Deleted" });
  res.json({ ok: true });
});

studentsRouter.post("/:id/enrolments", ...adminOnly, async (req, res) => {
  const id = idParam(req.params.id, "That student");
  const { courseId } = parseBody(z.object({ courseId: zId }).strict(), req.body);
  const s = await db().student.findUnique({ where: { id } });
  if (!s) throw notFound("That student");
  const course = await db().course.findUnique({ where: { id: courseId } });
  if (!course || course.archivedAt) throw notFound("That course");
  if (!course.grades.includes(s.grade)) throw badRequest(`${course.name} isn't offered for ${gradeLabel(s.grade)}.`);
  if (await db().enrolment.findFirst({ where: { studentId: id, courseId, endedAt: null } })) throw conflict("Already enrolled in this course.");
  await db().$transaction(async (tx) => {
    await tx.enrolment.create({ data: { studentId: id, courseId } });
    if (s.status === "INACTIVE") await tx.student.update({ where: { id }, data: { status: "ACTIVE" } });
    // The current month's record picks up the new course straight away.
    const record = await tx.feeRecord.findUnique({ where: { studentId_month: { studentId: id, month: monthKey() } } });
    if (record) {
      await tx.feeCharge.create({ data: { recordId: record.id, type: "COURSE", label: course.name, amount: course.monthlyFee, courseId } });
      await tx.feeEvent.create({ data: { recordId: record.id, text: `${course.name} added`, actor: actor(req).name, amount: course.monthlyFee, kind: "course" } });
      await recalc(record.id, tx);
    } else {
      await ensureRecord(id, monthKey(), tx);
    }
  });
  await audit(req, { area: "STUDENTS", action: "enrolment.add", summary: `enrolled ${s.name} in ${course.name}`, entityType: "Student", entityId: id });
  res.status(201).json({ ok: true });
});

studentsRouter.delete("/:id/enrolments/:enrolmentId", ...adminOnly, async (req, res) => {
  const id = idParam(req.params.id, "That student");
  const enrolmentId = idParam(req.params.enrolmentId, "That enrolment");
  const e = await db().enrolment.findFirst({ where: { id: enrolmentId, studentId: id, endedAt: null }, include: { course: true, student: true } });
  if (!e) throw notFound("That enrolment");
  const g = gradeNumber(e.student.grade);
  if (e.course.isMandatory && (g === 9 || g === 10)) throw conflict(`${e.course.name} is mandatory for ${gradeLabel(e.student.grade)}.`);
  await db().enrolment.update({ where: { id: enrolmentId }, data: { endedAt: new Date() } });
  await audit(req, { area: "STUDENTS", action: "enrolment.remove", summary: `removed ${e.student.name} from ${e.course.name}`, entityType: "Student", entityId: id });
  res.json({ ok: true });
});

// ── Profile tabs ──
studentsRouter.get("/:id/attendance", ...portalUser, async (req, res) => {
  const id = idParam(req.params.id, "That student");
  await assertStudentAccess(actor(req), id);
  const { month } = parseQuery(z.object({ month: zMonth.default(() => monthKey()) }), req.query);
  const { from, to } = monthBounds(month);
  const rows = await db().attendanceRecord.findMany({
    where: { studentId: id, date: { gte: dbDate(from), lte: dbDate(to) } },
    orderBy: [{ date: "desc" }, { session: "asc" }],
  });
  res.json({
    month,
    rows: rows.map((r) => ({ date: ymd(r.date), session: r.session, status: r.status, source: r.source, late: r.late, rfidAt: r.rfidAt, markedByName: r.markedByName })),
  });
});

studentsRouter.get("/:id/homework", ...portalUser, async (req, res) => {
  const id = idParam(req.params.id, "That student");
  await assertStudentAccess(actor(req), id);
  const s = await db().student.findUniqueOrThrow({ where: { id }, include: { enrolments: { where: { endedAt: null } } } });
  const hw = await db().homework.findMany({
    where: { grade: s.grade, courseId: { in: s.enrolments.map((e) => e.courseId) } },
    orderBy: { dueOn: "desc" },
    take: 30,
    include: { course: { select: { name: true } }, submissions: { where: { studentId: id } } },
  });
  res.json({
    rows: hw.map((h) => ({
      id: h.id,
      title: h.title,
      subject: h.subject || h.course.name,
      givenOn: ymd(h.givenOn),
      dueOn: ymd(h.dueOn),
      status: h.submissions[0]?.status ?? "NOT_SUBMITTED",
      submittedAt: h.submissions[0]?.submittedAt ?? null,
      feedback: h.submissions[0]?.feedback ?? null,
    })),
  });
});

studentsRouter.get("/:id/marks", ...portalUser, async (req, res) => {
  const id = idParam(req.params.id, "That student");
  await assertStudentAccess(actor(req), id);
  const marks = await db().mark.findMany({
    where: { studentId: id },
    include: { test: { include: { course: { select: { name: true } } } } },
    orderBy: { test: { createdAt: "desc" } },
    take: 50,
  });
  res.json({
    rows: marks.map((m) => ({
      testId: m.testId,
      test: m.test.name,
      subject: m.test.subject || m.test.course.name,
      score: m.score,
      max: m.test.maxMarks,
      visible: m.test.resultsVisible,
      date: m.test.heldOn ? ymd(m.test.heldOn) : null,
    })),
  });
});
