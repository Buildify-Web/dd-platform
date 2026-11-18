import { formatINR, gradeLabel, monthKey, monthLabel, sessionLabel } from "@dd/shared/domain";
import { dbDate, hhmmToMinutes, istMinutes, istWeekday, monthBounds, todayIst } from "../lib/dates";
import { db } from "../lib/db";
import { logger } from "../lib/logger";
import { deliver } from "../modules/announcements/routes";
import { checkDevices } from "../modules/rfid/routes";
import { sendEmail } from "../services/email";
import { noticeEmail } from "../services/email/templates";
import { balanceOf, ensureMonth } from "../services/fees";
import { notifyAdmins, notifyParents, notifyUsers } from "../services/notify";
import { classStudentsWhere } from "../services/scope";
import { getSettings } from "../services/settings";

/**
 * Automatic jobs (scope §6.5). Runs in the backend process every minute when JOBS_ENABLED
 * (default on). Each daily job runs once per day thanks to a JobRun key, so restarts and
 * several instances never double-send. Move to apps/worker (+ Redis) when scaling out.
 */
async function once(key: string, fn: () => Promise<void>) {
  try {
    await db().jobRun.create({ data: { key } });
  } catch {
    return; // already ran
  }
  try {
    await fn();
    logger.info({ job: key }, "job done");
  } catch (err) {
    logger.error({ err, job: key }, "job failed");
    await db().jobRun.delete({ where: { key } }).catch(() => undefined); // retry next minute
  }
}

const at = (hhmm: string) => istMinutes() >= hhmmToMinutes(hhmm);

/** Scheduled announcements whose time has come. */
async function sendScheduled() {
  const due = await db().announcement.findMany({ where: { status: "SCHEDULED", scheduledFor: { lte: new Date() } }, take: 20 });
  for (const a of due) {
    // Claim it first so two instances can't both send.
    const claimed = await db().announcement.updateMany({ where: { id: a.id, status: "SCHEDULED" }, data: { status: "DRAFT" } });
    if (claimed.count) await deliver(a).catch((err) => logger.error({ err }, "scheduled announcement failed"));
  }
}

/** Fee reminders on the 10th (all with a balance), 20th and last day (still unpaid). */
async function feeReminders() {
  const s = await getSettings();
  if (!s.feeReminders) return;
  const today = todayIst();
  const day = Number(today.slice(8));
  const month = monthKey();
  const { days } = monthBounds(month);
  const kind = day === 10 ? "10" : day === 20 ? "20" : day === days ? "last" : null;
  if (!kind || !at("10:00")) return;
  await once(`fee-reminder:${month}:${kind}`, async () => {
    await ensureMonth(month);
    const records = await db().feeRecord.findMany({
      where: { month, status: { in: ["UNPAID", "PARTIAL"] }, student: { status: "ACTIVE", feeRemindersEnabled: true } },
      include: { student: true, reminders: true },
    });
    const n = kind === "10" ? 1 : kind === "20" ? 2 : 3;
    let sent = 0;
    for (const r of records) {
      const balance = balanceOf(r);
      if (balance <= 0 || r.reminders.some((x) => x.kind === kind)) continue;
      await db().$transaction([
        db().feeReminder.create({ data: { recordId: r.id, kind, amount: balance } }),
        db().feeEvent.create({ data: { recordId: r.id, text: `Reminder ${n} sent`, actor: "System", kind: "reminder" } }),
      ]);
      await notifyParents([r.studentId], {
        category: "FEES",
        title: `Fee reminder · ${monthLabel(month)}`,
        body: `${formatINR(balance)} is due for ${r.student.name}${r.status === "PARTIAL" ? ` (paid ${formatINR(r.paid)} of ${formatINR(r.totalDue)})` : ""}. Please pay from the app.`,
      });
      if (r.student.email)
        void sendEmail(
          noticeEmail({
            to: r.student.email,
            name: r.student.parentName ?? "Parent",
            subject: `Fee reminder: ${formatINR(balance)} due for ${r.student.name}`,
            heading: "Fee reminder",
            paragraphs: [`This is a reminder that ${monthLabel(month)} fees for ${r.student.name} are pending.`, "You can pay from the Dynamic Donalds app (GPay or bank transfer), or at the office."],
            rows: [
              ["Total due", formatINR(r.totalDue)],
              ["Paid", formatINR(r.paid)],
              ["Balance", formatINR(balance)],
            ],
            tag: "fee-reminder",
          }),
        );
      sent++;
    }
    await notifyAdmins({ category: "PAYMENTS", title: `Fee reminder ${n} sent`, body: `${sent} parents were reminded about ${monthLabel(month)} fees.`, actionLabel: "Open", href: "/admin/reports?tab=dues" });
  });
}

/** After each session ends: absentee summary to admin. */
async function absenteeAlerts() {
  const s = await getSettings();
  const today = todayIst();
  const sessions: { session: "MORNING" | "EVENING" | "DAY"; end: string }[] = [
    { session: "MORNING", end: s.morningEnd },
    { session: "EVENING", end: s.eveningEnd },
    { session: "DAY", end: s.eveningEnd },
  ];
  for (const x of sessions) {
    if (!at(x.end)) continue;
    await once(`absentees:${today}:${x.session}`, async () => {
      const absent = await db().attendanceRecord.findMany({ where: { date: dbDate(today), session: x.session, status: "ABSENT" }, include: { student: { select: { name: true, grade: true } } }, take: 200 });
      const marked = await db().attendanceRecord.count({ where: { date: dbDate(today), session: x.session } });
      if (!marked) return;
      const names = absent.slice(0, 6).map((r) => `${r.student.name} (${gradeLabel(r.student.grade).replace("Grade ", "Gr ")})`);
      await notifyAdmins({
        category: "SYSTEM",
        title: `${sessionLabel(x.session)} session: ${absent.length} absent`,
        body: absent.length ? `${names.join(", ")}${absent.length > 6 ? ` and ${absent.length - 6} more` : ""}.` : "Everyone marked was present.",
        actionLabel: "Open",
        href: "/admin/reports",
      });
    });
  }
}

/** At the deadline: reminder to the teacher and admin for classes with no attendance yet. */
async function attendancePending() {
  const s = await getSettings();
  if (!at(s.attendanceDeadline)) return;
  const today = todayIst();
  await once(`attendance-pending:${today}`, async () => {
    const assignments = await db().teachingAssignment.findMany({ include: { course: { select: { name: true } }, staff: { select: { id: true, name: true, status: true } } } });
    const missing: string[] = [];
    for (const t of assignments) {
      if (t.staff.status !== "ACTIVE") continue;
      if (t.days.length && !t.days.includes(istWeekday())) continue;
      const students = await db().student.count({ where: classStudentsWhere(t) });
      if (!students) continue;
      const marked = await db().attendanceRecord.count({ where: { date: dbDate(today), student: classStudentsWhere(t) } });
      if (marked) continue;
      const label = `${gradeLabel(t.grade)} · ${t.subject || t.course.name}`;
      missing.push(`${label} (${t.staff.name.split(" ")[0]})`);
      await notifyUsers([t.staff.id], { category: "CLASSES", title: "Attendance not marked", body: `Please mark attendance for ${label}.`, actionLabel: "Open", href: "/staff/attendance", urgent: true });
    }
    if (missing.length)
      await notifyAdmins({ category: "SYSTEM", title: `Attendance not marked by ${s.attendanceDeadline}`, body: missing.slice(0, 8).join(", ") + (missing.length > 8 ? ` and ${missing.length - 8} more` : ""), actionLabel: "Check", href: "/admin/staff", urgent: true });
  });
}

/** End of day: homework "not completed" report to admin. */
async function homeworkDaily() {
  const s = await getSettings();
  if (!at(s.homeworkReportTime)) return;
  const today = todayIst();
  await once(`homework-daily:${today}`, async () => {
    const due = await db().homework.findMany({ where: { dueOn: dbDate(today) }, include: { course: { select: { name: true } }, submissions: { select: { studentId: true, status: true } } } });
    if (!due.length) return;
    const lines: string[] = [];
    for (const h of due) {
      const total = await db().student.count({ where: classStudentsWhere(h) });
      const done = h.submissions.filter((x) => x.status !== "REDO").length;
      if (total - done > 0) lines.push(`${gradeLabel(h.grade)} ${h.subject || h.course.name}: ${total - done} not completed`);
      const missingStudents = await db().student.findMany({ where: { ...classStudentsWhere(h), id: { notIn: h.submissions.map((x) => x.studentId) } }, select: { id: true } });
      await notifyParents(
        missingStudents.map((m) => m.id),
        { category: "HOMEWORK", title: "Homework not submitted", body: `"${h.title}" (${h.subject || h.course.name}) was due today and hasn't been submitted.` },
      );
    }
    if (lines.length) await notifyAdmins({ category: "SYSTEM", title: "Homework not completed today", body: lines.join("; ").slice(0, 480), actionLabel: "Open", href: "/admin/homework" });
  });
}

/** Completed homework is hidden from parents 1 month after submission; expired auth rows cleaned. */
async function dailyCleanup() {
  await once(`cleanup:${todayIst()}`, async () => {
    const cutoff = new Date(Date.now() - 30 * 86_400_000);
    await db().homeworkSubmission.updateMany({ where: { status: "CHECKED", hiddenAt: null, submittedAt: { lt: cutoff } }, data: { hiddenAt: new Date() } });
    await db().authToken.deleteMany({ where: { OR: [{ expiresAt: { lt: cutoff } }, { usedAt: { lt: cutoff } }] } });
    await db().session.deleteMany({ where: { OR: [{ revokedAt: { lt: cutoff } }, { expiresAt: { lt: cutoff } }] } });
    await db().jobRun.deleteMany({ where: { ranAt: { lt: new Date(Date.now() - 90 * 86_400_000) } } });
  });
}

async function tick() {
  for (const job of [sendScheduled, feeReminders, absenteeAlerts, attendancePending, homeworkDaily, dailyCleanup, checkDevices]) {
    try {
      await job();
    } catch (err) {
      logger.error({ err, job: job.name }, "scheduled job crashed");
    }
  }
}

let timer: NodeJS.Timeout | undefined;

export function startJobs() {
  if (timer) return;
  logger.info("background jobs started (every minute)");
  void tick();
  timer = setInterval(() => void tick(), 60_000);
  timer.unref();
}

export function stopJobs() {
  if (timer) clearInterval(timer);
  timer = undefined;
}
