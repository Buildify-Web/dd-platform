import type { AttendanceSession, AttendanceStatus, Grade } from "@dd/db";
import { ATTENDANCE_STATUSES, attendanceStatusLabel, gradeLabel, hasTwoSessions, sessionLabel, sessionsForGrade } from "@dd/shared/domain";
import { Router } from "express";
import * as z from "zod";
import { dbDate, hhmmToMinutes, istMinutes, istTime, todayIst } from "../../lib/dates";
import { db } from "../../lib/db";
import { badRequest, forbidden } from "../../lib/errors";
import { actor, portalUser } from "../../middleware/auth";
import { parseBody, parseQuery, zDate, zId } from "../../middleware/validate";
import { audit } from "../../services/audit";
import { notifyParents } from "../../services/notify";
import { assertClassAccess, classStudentsWhere } from "../../services/scope";
import { getSettings } from "../../services/settings";
import { zGrade, zOptionalId } from "../common";

/**
 * /v1/attendance: the "Mark attendance" sheet (admin and staff).
 * RFID taps pre-fill Present; approved leave pre-fills Leave; anything can be edited before
 * saving. Changing an existing mark is a correction and is written to the audit log.
 * Parents are notified straight away when their child is marked Absent.
 */
export const attendanceRouter = Router();
attendanceRouter.use(portalUser);

const sheetQuery = z.object({
  date: zDate.default(() => todayIst()),
  grade: zGrade,
  courseId: zOptionalId,
  session: z.enum(["DAY", "MORNING", "EVENING"]).optional(),
});

/** The requested session if valid for the grade; otherwise the one in progress (by the RFID split time). */
async function resolveSession(grade: Grade, s: AttendanceSession | undefined): Promise<AttendanceSession> {
  const allowed = sessionsForGrade(grade);
  if (s && allowed.includes(s)) return s;
  if (allowed.length === 1) return allowed[0]!;
  const { sessionSplit } = await getSettings();
  return istMinutes() < hhmmToMinutes(sessionSplit) ? "MORNING" : "EVENING";
}

attendanceRouter.get("/sheet", async (req, res) => {
  const a = actor(req);
  const q = parseQuery(sheetQuery, req.query);
  if (!q.courseId && !a.isAdmin) throw forbidden("Choose one of your classes.");
  if (q.courseId) await assertClassAccess(a, { grade: q.grade, courseId: q.courseId });
  if (q.date > todayIst()) throw badRequest("Attendance can't be marked for a future date.");
  const session = await resolveSession(q.grade, q.session);
  const where = q.courseId ? classStudentsWhere({ grade: q.grade, courseId: q.courseId }) : { status: "ACTIVE" as const, grade: q.grade };
  const students = await db().student.findMany({ where, orderBy: [{ rollNo: "asc" }, { name: "asc" }], select: { id: true, name: true, rollNo: true } });
  const ids = students.map((s) => s.id);
  const date = dbDate(q.date);
  const [records, leaves, s] = await Promise.all([
    db().attendanceRecord.findMany({ where: { studentId: { in: ids }, date, session } }),
    db().leaveRequest.findMany({ where: { studentId: { in: ids }, status: { in: ["APPROVED", "PENDING"] }, fromDate: { lte: date }, toDate: { gte: date } } }),
    getSettings(),
  ]);
  const byStudent = new Map(records.map((r) => [r.studentId, r]));
  const rows = students.map((st) => {
    const r = byStudent.get(st.id);
    const leave = leaves.find((l) => l.studentId === st.id && (!l.sessions.length || l.sessions.includes(session)));
    let source: string;
    if (r?.source === "RFID" && r.rfidAt) source = `RFID · ${istTime(r.rfidAt)}${r.late ? " · Late" : ""}`;
    else if (r?.source === "LEAVE" || (!r && leave?.status === "APPROVED")) source = "Leave approved";
    else if (r?.source === "MANUAL") source = `Manual · ${r.markedByName ?? "Staff"}`;
    else source = "No tap";
    return {
      studentId: st.id,
      name: st.name,
      rollNo: st.rollNo,
      status: (r?.status ?? (leave?.status === "APPROVED" ? "LEAVE" : null)) as AttendanceStatus | null,
      saved: !!r,
      source,
      leave: leave ? (leave.status === "APPROVED" ? "Approved leave" : "Leave applied") : null,
    };
  });
  const count = (st: AttendanceStatus | null) => rows.filter((r) => r.status === st).length;
  res.json({
    date: q.date,
    grade: q.grade,
    gradeLabel: gradeLabel(q.grade),
    courseId: q.courseId ?? null,
    session,
    sessions: sessionsForGrade(q.grade),
    twoSessions: hasTwoSessions(q.grade),
    deadline: s.attendanceDeadline,
    counts: { present: count("PRESENT"), absent: count("ABSENT"), leave: count("LEAVE"), na: count("NA"), notMarked: count(null) },
    rows,
  });
});

const saveBody = z
  .object({
    date: zDate,
    grade: zGrade,
    courseId: zOptionalId,
    session: z.enum(["DAY", "MORNING", "EVENING"]),
    entries: z
      .array(z.object({ studentId: zId, status: z.enum(ATTENDANCE_STATUSES) }).strict())
      .min(1, { error: "Mark at least one student." })
      .max(300),
  })
  .strict();

attendanceRouter.put("/sheet", async (req, res) => {
  const a = actor(req);
  const body = parseBody(saveBody, req.body);
  if (!body.courseId && !a.isAdmin) throw forbidden("Choose one of your classes.");
  if (body.courseId) await assertClassAccess(a, { grade: body.grade, courseId: body.courseId });
  if (body.date > todayIst()) throw badRequest("Attendance can't be marked for a future date.");
  const session = await resolveSession(body.grade, body.session);
  if (session !== body.session) throw badRequest(`${gradeLabel(body.grade)} uses ${sessionsForGrade(body.grade).map(sessionLabel).join(" / ")} attendance.`);

  const where = body.courseId ? classStudentsWhere({ grade: body.grade, courseId: body.courseId }) : { status: "ACTIVE" as const, grade: body.grade };
  const allowed = new Set((await db().student.findMany({ where, select: { id: true } })).map((s) => s.id));
  const entries = body.entries.filter((e) => allowed.has(e.studentId));
  if (entries.length !== body.entries.length) throw forbidden("Some students aren't in this class.");

  const date = dbDate(body.date);
  const existing = new Map((await db().attendanceRecord.findMany({ where: { date, session, studentId: { in: entries.map((e) => e.studentId) } } })).map((r) => [r.studentId, r]));
  const corrections: { studentId: string; from: AttendanceStatus; to: AttendanceStatus }[] = [];
  const newlyAbsent: string[] = [];

  await db().$transaction(async (tx) => {
    for (const e of entries) {
      const prev = existing.get(e.studentId);
      if (prev?.status === e.status) continue;
      if (prev) corrections.push({ studentId: e.studentId, from: prev.status, to: e.status });
      if (e.status === "ABSENT") newlyAbsent.push(e.studentId);
      await tx.attendanceRecord.upsert({
        where: { studentId_date_session: { studentId: e.studentId, date, session } },
        create: { studentId: e.studentId, date, session, status: e.status, source: "MANUAL", markedById: a.id, markedByName: a.name },
        // An RFID-sourced Present that a teacher confirms keeps its tap time; anything changed becomes manual.
        update: { status: e.status, source: "MANUAL", markedById: a.id, markedByName: a.name, markedAt: new Date() },
      });
    }
  });

  const label = `${gradeLabel(body.grade)} · ${sessionLabel(session)} · ${body.date}`;
  if (corrections.length) {
    const names = new Map((await db().student.findMany({ where: { id: { in: corrections.map((c) => c.studentId) } }, select: { id: true, name: true } })).map((s) => [s.id, s.name]));
    await audit(req, {
      area: "ATTENDANCE",
      action: "attendance.correct",
      summary: `corrected attendance for ${corrections.length === 1 ? names.get(corrections[0]!.studentId) : `${corrections.length} students`} (${label})`,
      entityType: "Attendance",
      entityId: `${body.grade}:${body.date}:${session}`,
      fromLabel: corrections.length === 1 ? attendanceStatusLabel[corrections[0]!.from] : null,
      toLabel: corrections.length === 1 ? attendanceStatusLabel[corrections[0]!.to] : null,
      before: corrections.map((c) => ({ student: names.get(c.studentId), status: c.from })),
      after: corrections.map((c) => ({ student: names.get(c.studentId), status: c.to })),
    });
  }
  const fresh = entries.length - corrections.length;
  if (fresh > 0)
    await audit(req, { area: "ATTENDANCE", action: "attendance.mark", summary: `marked attendance for ${label}`, entityType: "Attendance", entityId: `${body.grade}:${body.date}:${session}` });
  if (newlyAbsent.length)
    await notifyParents(newlyAbsent, {
      category: "ATTENDANCE",
      title: "Marked absent",
      body: `Your child was marked absent for the ${sessionLabel(session).toLowerCase()} session on ${body.date}. If this is wrong, please contact the centre.`,
    });
  res.json({ saved: entries.length, corrections: corrections.length });
});

/** Today at a glance (admin dashboard). */
attendanceRouter.get("/today", async (_req, res) => {
  const date = dbDate(todayIst());
  const rows = await db().attendanceRecord.groupBy({ by: ["session", "status"], where: { date }, _count: { _all: true } });
  const active = await db().student.count({ where: { status: "ACTIVE" } });
  const sum = (session: AttendanceSession | null, status: AttendanceStatus) =>
    rows.filter((r) => (session ? r.session === session : true) && r.status === status).reduce((t, r) => t + r._count._all, 0);
  res.json({
    active,
    present: sum(null, "PRESENT"),
    absent: sum(null, "ABSENT"),
    leave: sum(null, "LEAVE"),
    sessions: (["DAY", "MORNING", "EVENING"] as const).map((s) => ({ session: s, present: sum(s, "PRESENT"), absent: sum(s, "ABSENT"), leave: sum(s, "LEAVE") })),
  });
});
