import { DEREGISTRATION_LAST_DAY, gradeLabel, monthKey, monthLabel, sessionsForGrade } from "@dd/shared/domain";
import type { Request } from "express";
import { addDays, dbDate, daysBetween, ymd } from "../../lib/dates";
import { db } from "../../lib/db";
import { conflict, notFound } from "../../lib/errors";
import { actor } from "../../middleware/auth";
import { audit } from "../../services/audit";
import { notifyParents, notifyUsers } from "../../services/notify";

/** Day of the month (IST) a request was made. */
const istDay = (d: Date) => Number(new Intl.DateTimeFormat("en-IN", { day: "numeric", timeZone: "Asia/Kolkata" }).format(d));

const nextMonthName = () => {
  const [y, m] = monthKey().split("-").map(Number);
  return monthLabel(new Date(Date.UTC(y!, m!, 1)).toISOString().slice(0, 7)).split(" ")[0];
};

export async function getEnrolmentChange(id: string) {
  const c = await db().enrolmentChange.findUnique({
    where: { id },
    include: {
      student: { include: { enrolments: { where: { endedAt: null }, include: { course: true }, orderBy: { startedAt: "asc" } } } },
    },
  });
  if (!c) throw notFound("That enrolment change");
  const s = c.student;
  const added = await db().course.findMany({ where: { id: { in: c.addCourseIds } } });
  const fee = (e: (typeof s.enrolments)[number]) => e.feeOverride ?? e.course.monthlyFee;

  const current = s.enrolments.map((e) => ({
    courseId: e.courseId,
    name: e.course.name,
    fee: fee(e),
    flag: e.course.isMandatory ? "Required" : c.removeCourseIds.includes(e.courseId) ? "Remove" : "Kept",
  }));
  const after = [
    ...s.enrolments
      .filter((e) => !c.removeCourseIds.includes(e.courseId))
      .map((e) => ({ courseId: e.courseId, name: e.course.name, fee: fee(e), flag: e.course.isMandatory ? "Required" : "Kept" })),
    ...added.map((x) => ({ courseId: x.id, name: x.name, fee: x.monthlyFee, flag: "New" })),
  ];
  const currentMonthly = current.reduce((t, x) => t + x.fee, 0);
  const newMonthly = after.reduce((t, x) => t + x.fee, 0);
  const day = istDay(c.requestedAt);
  return {
    id: c.id,
    code: c.code,
    status: c.status,
    note: c.note,
    requestedAt: c.requestedAt,
    student: { id: s.id, name: s.name, grade: s.grade, gradeLabel: gradeLabel(s.grade) },
    current,
    after,
    window: c.removeCourseIds.length
      ? { ok: day <= DEREGISTRATION_LAST_DAY, text: `Deregistration requested on ${day} ${new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "Asia/Kolkata" }).format(c.requestedAt)} — ${day <= DEREGISTRATION_LAST_DAY ? "inside" : "outside"} the day 1–${DEREGISTRATION_LAST_DAY} window.` }
      : null,
    fee: { currentMonthly, newMonthly, change: newMonthly - currentMonthly, takesEffect: `${nextMonthName()} fee` },
  };
}

export async function decideEnrolmentChange(req: Request, id: string, approve: boolean, note?: string) {
  const a = actor(req);
  const view = await getEnrolmentChange(id);
  if (view.status !== "PENDING") throw conflict("This request has already been decided.");
  if (approve && view.window && !view.window.ok) throw conflict("Deregistration is only allowed on days 1–10 of the month. Reject this request or ask the parent to apply next month.");
  if (approve) {
    const mandatoryRemoved = view.current.some((x) => x.flag === "Required" && view.after.every((y) => y.courseId !== x.courseId));
    if (mandatoryRemoved) throw conflict("Maths & Science is mandatory for this grade and can't be removed.");
  }
  const change = await db().enrolmentChange.findUniqueOrThrow({ where: { id } });
  await db().$transaction(async (tx) => {
    if (approve) {
      if (change.removeCourseIds.length)
        await tx.enrolment.updateMany({ where: { studentId: change.studentId, courseId: { in: change.removeCourseIds }, endedAt: null }, data: { endedAt: new Date() } });
      for (const courseId of change.addCourseIds) {
        const exists = await tx.enrolment.findFirst({ where: { studentId: change.studentId, courseId, endedAt: null } });
        if (!exists) await tx.enrolment.create({ data: { studentId: change.studentId, courseId } });
      }
    }
    await tx.enrolmentChange.update({ where: { id }, data: { status: approve ? "APPROVED" : "REJECTED", note: note ?? change.note, reviewedAt: new Date(), reviewedById: a.id } });
  });
  await notifyParents([change.studentId], {
    category: "APPROVALS",
    title: approve ? "Course change approved" : "Course change not approved",
    body: approve ? `Your course change for ${view.student.name} is approved. It applies from the ${view.fee.takesEffect}.${note ? ` ${note}` : ""}` : `Your course change for ${view.student.name} was not approved.${note ? ` ${note}` : ""}`,
  });
  await audit(req, {
    area: "APPROVALS",
    action: approve ? "enrolment.approve" : "enrolment.reject",
    summary: `${approve ? "approved" : "rejected"} the course change for ${view.student.name}`,
    entityType: "EnrolmentChange",
    entityId: id,
    fromLabel: "Pending",
    toLabel: approve ? "Approved" : "Rejected",
    before: view.current,
    after: approve ? view.after : undefined,
  });
  return { status: approve ? "APPROVED" : "REJECTED" };
}

// ───────────────────────────── Leave ─────────────────────────────

export async function decideLeave(req: Request, id: string, approve: boolean, note?: string) {
  const a = actor(req);
  const l = await db().leaveRequest.findUnique({ where: { id }, include: { student: true, staff: true } });
  if (!l) throw notFound("That leave request");
  if (l.status !== "PENDING") throw conflict("This request has already been decided.");
  await db().$transaction(async (tx) => {
    await tx.leaveRequest.update({ where: { id }, data: { status: approve ? "APPROVED" : "REJECTED", reviewedAt: new Date(), reviewedById: a.id, decisionNote: note ?? null } });
    if (approve && l.student) {
      // Pre-fill "Leave" for each session on those days that isn't marked Present already.
      const sessions = l.sessions.length ? l.sessions : sessionsForGrade(l.student.grade);
      for (const day of daysBetween(ymd(l.fromDate), ymd(l.toDate))) {
        for (const session of sessions) {
          const existing = await tx.attendanceRecord.findUnique({ where: { studentId_date_session: { studentId: l.student.id, date: dbDate(day), session } } });
          if (existing?.status === "PRESENT") continue;
          await tx.attendanceRecord.upsert({
            where: { studentId_date_session: { studentId: l.student.id, date: dbDate(day), session } },
            create: { studentId: l.student.id, date: dbDate(day), session, status: "LEAVE", source: "LEAVE", markedById: a.id, markedByName: a.name },
            update: { status: "LEAVE", source: "LEAVE", markedById: a.id, markedByName: a.name },
          });
        }
      }
    }
  });
  const range = ymd(l.fromDate) === ymd(l.toDate) ? ymd(l.fromDate) : `${ymd(l.fromDate)} to ${ymd(l.toDate)}`;
  if (l.student)
    await notifyParents([l.student.id], {
      category: "ATTENDANCE",
      title: approve ? "Leave approved" : "Leave not approved",
      body: `Leave for ${l.student.name} (${range}) was ${approve ? "approved" : "not approved"}.${note ? ` ${note}` : ""}`,
    });
  if (l.staff)
    await notifyUsers([l.staff.id], {
      category: "ADMIN",
      title: approve ? "Leave approved" : "Leave not approved",
      body: `Your leave for ${range} was ${approve ? "approved" : "not approved"}.${note ? ` ${note}` : ""}`,
      actionLabel: "Open",
      href: "/staff/profile",
    });
  await audit(req, {
    area: l.student ? "ATTENDANCE" : "STAFF",
    action: approve ? "leave.approve" : "leave.reject",
    summary: `${approve ? "approved" : "rejected"} leave for ${l.student?.name ?? l.staff?.name ?? "—"} (${range})`,
    entityType: "LeaveRequest",
    entityId: id,
    fromLabel: "Pending",
    toLabel: approve ? "Approved" : "Rejected",
  });
  return { status: approve ? "APPROVED" : "REJECTED" };
}

export const leaveDays = (from: Date, to: Date) => daysBetween(ymd(from), ymd(to)).length;
export { addDays };
