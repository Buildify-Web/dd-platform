import { auditAreaLabel, gradeLabel, monthKey, monthLabel } from "@dd/shared/domain";
import { Router } from "express";
import { dbDate, greeting, hhmmToMinutes, istMinutes, istTime, istWeekday, shortDate, todayIst, ymd } from "../../lib/dates";
import { db } from "../../lib/db";
import { actor, adminOnly, authenticate, requireRole } from "../../middleware/auth";
import { balanceOf, ensureMonth } from "../../services/fees";
import { classStudentsWhere, staffClasses } from "../../services/scope";
import { getSettings } from "../../services/settings";

/** /v1/dashboard/admin and /v1/dashboard/staff: the two home screens. */
export const dashboardRouter = Router();

const dateLabel = () => new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" }).format(new Date());

dashboardRouter.get("/admin", ...adminOnly, async (req, res) => {
  const a = actor(req);
  const month = monthKey();
  await ensureMonth(month);
  const today = dbDate(todayIst());
  const s = await getSettings();
  const [active, attendance, regs, enrol, leave, papers, payments, records, recent, competitions, unknownCards, enquiries] = await Promise.all([
    db().student.count({ where: { status: "ACTIVE" } }),
    db().attendanceRecord.groupBy({ by: ["session", "status"], where: { date: today }, _count: { _all: true } }),
    db().registration.count({ where: { status: { in: ["PENDING", "INFO_REQUESTED"] } } }),
    db().enrolmentChange.count({ where: { status: "PENDING" } }),
    db().leaveRequest.count({ where: { status: "PENDING" } }),
    db().questionPaper.count({ where: { status: "AWAITING" } }),
    db().payment.count({ where: { status: "PENDING", source: "PARENT" } }),
    db().feeRecord.findMany({ where: { month }, select: { totalDue: true, paid: true, status: true } }),
    db().auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    db().competition.findMany({ where: { archivedAt: null, date: { gte: today } }, orderBy: { date: "asc" }, take: 3, include: { _count: { select: { registrations: true } } } }),
    db().rfidScan.groupBy({ by: ["cardUid"], where: { result: "UNKNOWN", resolvedAt: null } }).then((g) => g.length),
    db().enquiry.count({ where: { status: "NEW" } }),
  ]);
  const count = (session: string | null, status: string) => attendance.filter((r) => (!session || r.session === session) && r.status === status).reduce((t, r) => t + r._count._all, 0);
  const marked = attendance.filter((r) => r.status !== "NA").reduce((t, r) => t + r._count._all, 0);
  const present = count(null, "PRESENT");
  const due = records.reduce((t, r) => t + r.totalDue, 0);
  const collected = records.reduce((t, r) => t + r.paid, 0);

  // Classes with no attendance yet today (after the deadline this is a reminder).
  const classes = await db().teachingAssignment.findMany({ include: { staff: { select: { name: true } }, course: { select: { name: true } } } });
  const notMarked: string[] = [];
  for (const c of classes) {
    if (!(await db().student.count({ where: classStudentsWhere(c) }))) continue;
    const any = await db().attendanceRecord.count({ where: { date: today, student: classStudentsWhere(c) } });
    if (!any) notMarked.push(`${gradeLabel(c.grade)} · ${c.subject || c.course.name} (${c.staff.name.split(" ")[0]})`);
  }

  res.json({
    greeting: `${greeting()}, ${a.name.split(" ")[0]}`,
    dateLabel: dateLabel(),
    kpis: {
      active,
      attendance: { present, marked, rate: marked ? Math.round((present / marked) * 100) : null, absent: count(null, "ABSENT"), leave: count(null, "LEAVE") },
      approvals: regs + enrol + leave,
      payments,
      outstanding: records.reduce((t, r) => t + balanceOf(r), 0),
      collected,
      due,
      monthLabel: monthLabel(month),
    },
    sessions: (["MORNING", "EVENING", "DAY"] as const).map((x) => ({ session: x, present: count(x, "PRESENT"), absent: count(x, "ABSENT"), leave: count(x, "LEAVE") })),
    attention: [
      { key: "registrations", label: "Registrations to review", count: regs, href: "/admin/approvals?tab=students" },
      { key: "enrolment", label: "Course changes to approve", count: enrol, href: "/admin/approvals?tab=enrolment" },
      { key: "leave", label: "Leave requests", count: leave, href: "/admin/leave" },
      { key: "payments", label: "Payments to verify", count: payments, href: "/admin/payments" },
      { key: "papers", label: "Question papers awaiting activation", count: papers, href: "/admin/question-papers" },
      { key: "rfid", label: "Unknown RFID cards", count: unknownCards, href: "/admin/rfid" },
      { key: "enquiries", label: "New website enquiries", count: enquiries, href: "/admin/website?tab=enquiries" },
    ].filter((x) => x.count > 0),
    notMarked: { deadline: s.attendanceDeadline, pastDeadline: istMinutes() > hhmmToMinutes(s.attendanceDeadline), classes: notMarked.slice(0, 8), total: notMarked.length },
    recent: recent.map((r) => ({ id: r.id, actor: r.actorName, summary: r.summary, area: auditAreaLabel[r.area], time: ymd(r.createdAt) === ymd(new Date()) ? istTime(r.createdAt) : shortDate(r.createdAt) })),
    competitions: competitions.map((c) => ({ id: c.id, name: c.name, date: shortDate(c.date), registrations: c._count.registrations })),
  });
});

dashboardRouter.get("/staff", authenticate, requireRole("STAFF", "ADMIN"), async (req, res) => {
  const a = actor(req);
  const classes = await staffClasses(a.id);
  const today = dbDate(todayIst());
  const weekday = istWeekday();
  const now = istMinutes();
  const scheduledToday = classes.filter((c) => c.days.includes(weekday));
  const list = (scheduledToday.length ? scheduledToday : classes).sort((x, y) => (x.startTime ?? "99").localeCompare(y.startTime ?? "99"));

  const rows = [];
  for (const c of list) {
    const [attendance, update] = await Promise.all([
      db().attendanceRecord.count({ where: { date: today, student: classStudentsWhere(c) } }),
      db().classUpdate.count({ where: { date: today, grade: c.grade, courseId: c.courseId, ...(c.subject ? { subject: c.subject } : {}) } }),
    ]);
    rows.push({ ...c, attendanceDone: attendance > 0, updateDone: update > 0, past: !!c.endTime && hhmmToMinutes(c.endTime) < now });
  }
  const upcoming = rows.find((r) => r.startTime && hhmmToMinutes(r.endTime ?? r.startTime) > now && scheduledToday.length);
  const fmt = (t: string | null) => {
    if (!t) return null;
    const m = hhmmToMinutes(t);
    return `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")}`;
  };

  const todo: { label: string; done: boolean; href: string }[] = [];
  for (const r of rows) todo.push({ label: `Post ${r.label} class update`, done: r.updateDone, href: `/staff/class-updates?class=${encodeURIComponent(r.key)}` });
  const lastTest = classes.length
    ? await db().test.findFirst({ where: { OR: classes.map((c) => ({ grade: c.grade, courseId: c.courseId })) }, orderBy: { createdAt: "desc" }, include: { _count: { select: { marks: true } } } })
    : null;
  if (lastTest) {
    const cls = classes.find((c) => c.grade === lastTest.grade && c.courseId === lastTest.courseId);
    const missing = (cls?.studentCount ?? 0) - lastTest._count.marks;
    todo.push({ label: `Enter ${lastTest.name} marks · ${gradeLabel(lastTest.grade).replace("Grade ", "Gr ")}`, done: missing <= 0, href: `/staff/marks?class=${encodeURIComponent(cls?.key ?? "")}&test=${lastTest.id}` });
  }
  const toCheck = classes.length
    ? await db().homeworkSubmission.count({ where: { status: "SUBMITTED", homework: { OR: classes.map((c) => ({ grade: c.grade, courseId: c.courseId })) } } })
    : 0;
  todo.push({ label: toCheck ? `Check ${toCheck} homework submissions` : "Homework all checked", done: toCheck === 0, href: "/staff/homework" });

  const fromAdmin = await db().announcement.findFirst({ where: { kind: "ANNOUNCEMENT", status: "SENT" }, orderBy: { sentAt: "desc" } });
  res.json({
    greeting: `${greeting()}, ${a.name.split(" ")[0]}`,
    dateLabel: dateLabel(),
    next: upcoming
      ? {
          key: upcoming.key,
          label: upcoming.label,
          inMinutes: Math.max(0, hhmmToMinutes(upcoming.startTime!) - now),
          started: hhmmToMinutes(upcoming.startTime!) <= now,
          time: `${fmt(upcoming.startTime)}${upcoming.endTime ? ` – ${fmt(upcoming.endTime)}` : ""} ${hhmmToMinutes(upcoming.startTime!) >= 720 ? "PM" : "AM"}`,
          room: upcoming.room,
          students: upcoming.studentCount,
        }
      : null,
    classes: rows.map((r) => ({ key: r.key, label: r.label, time: fmt(r.startTime), students: r.studentCount, attendanceDone: r.attendanceDone, updateDone: r.updateDone, past: r.past })),
    scheduled: scheduledToday.length > 0,
    totals: { classes: rows.length, students: rows.reduce((t, r) => t + r.studentCount, 0) },
    todo,
    fromAdmin: fromAdmin ? { title: fromAdmin.title, message: fromAdmin.message } : null,
  });
});
