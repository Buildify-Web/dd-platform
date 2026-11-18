import type { Prisma } from "@dd/db";
import { gradeLabel, gradeNumber, gradeShort, monthKey, monthLabel, paymentMethodLabel } from "@dd/shared/domain";
import { Router } from "express";
import * as z from "zod";
import { addDays, daysBetween, dbDate, shortDate, todayIst, ymd } from "../../lib/dates";
import { db } from "../../lib/db";
import { badRequest } from "../../lib/errors";
import { parseFormat, sendTable } from "../../lib/export";
import { adminOnly } from "../../middleware/auth";
import { parseQuery, zDate } from "../../middleware/validate";
import { balanceOf } from "../../services/fees";
import { getSettings } from "../../services/settings";
import { zGrade, zOptionalId } from "../common";

/**
 * /v1/reports (admin): date-range reports with CSV / Excel export.
 *   attendance  average, sessions, by grade, students below the threshold
 *   dues        outstanding balances (any month) per student
 *   collection  verified payments by method and day
 * Homework reports live at /v1/homework/report/*.
 */
export const reportsRouter = Router();
reportsRouter.use(adminOnly);

const rangeQuery = z
  .object({
    from: zDate.default(() => addDays(todayIst(), -6)),
    to: zDate.default(() => todayIst()),
    grade: z.union([zGrade, z.literal("")]).optional(),
    courseId: zOptionalId,
    format: z.string().optional(),
  })
  .refine((q) => q.from <= q.to, { error: "The start date is after the end date." });

async function attendanceReport(q: z.infer<typeof rangeQuery>) {
  if (daysBetween(q.from, q.to).length > 366) throw badRequest("Choose a range of up to one year.");
  const s = await getSettings();
  const studentWhere: Prisma.StudentWhereInput = {
    status: "ACTIVE",
    ...(q.grade ? { grade: q.grade } : {}),
    ...(q.courseId ? { enrolments: { some: { courseId: q.courseId, endedAt: null } } } : {}),
  };
  const records = await db().attendanceRecord.findMany({
    where: { date: { gte: dbDate(q.from), lte: dbDate(q.to) }, status: { not: "NA" }, student: studentWhere },
    select: { studentId: true, session: true, status: true, source: true, student: { select: { name: true, grade: true, code: true } } },
  });
  const rate = (rs: typeof records) => (rs.length ? Math.round((rs.filter((r) => r.status === "PRESENT").length / rs.length) * 1000) / 10 : null);
  const session = (x: "MORNING" | "EVENING") => {
    const rs = records.filter((r) => r.session === x);
    return { rate: rate(rs), checkIns: rs.filter((r) => r.status === "PRESENT").length };
  };
  const perStudent = new Map<string, { name: string; code: string; grade: (typeof records)[number]["student"]["grade"]; present: number; absent: number; leave: number }>();
  for (const r of records) {
    const x = perStudent.get(r.studentId) ?? { name: r.student.name, code: r.student.code, grade: r.student.grade, present: 0, absent: 0, leave: 0 };
    if (r.status === "PRESENT") x.present++;
    else if (r.status === "ABSENT") x.absent++;
    else if (r.status === "LEAVE") x.leave++;
    perStudent.set(r.studentId, x);
  }
  const students = [...perStudent.entries()].map(([id, x]) => {
    const total = x.present + x.absent + x.leave;
    return { studentId: id, name: x.name, code: x.code, grade: gradeLabel(x.grade), present: x.present, absent: x.absent, leave: x.leave, rate: total ? Math.round((x.present / total) * 100) : 0 };
  });
  const grades = [...new Set(records.map((r) => r.student.grade))].sort((a, b) => gradeNumber(a) - gradeNumber(b));
  const byGrade = grades.map((g) => ({ grade: g, label: gradeShort(g), rate: rate(records.filter((r) => r.student.grade === g)) ?? 0 }));
  const below = students.filter((x) => x.rate < s.attendanceThreshold).sort((a, b) => a.rate - b.rate);
  return {
    range: { from: q.from, to: q.to, label: `${shortDate(dbDate(q.from))}–${shortDate(dbDate(q.to))}` },
    threshold: s.attendanceThreshold,
    average: rate(records),
    morning: session("MORNING"),
    evening: session("EVENING"),
    belowCount: below.length,
    byGrade,
    below: below.slice(0, 50),
    students,
  };
}

reportsRouter.get("/attendance", async (req, res) => {
  const { students: _all, ...rest } = await attendanceReport(parseQuery(rangeQuery, req.query));
  res.json(rest);
});

reportsRouter.get("/attendance/export", async (req, res) => {
  const q = parseQuery(rangeQuery, req.query);
  const r = await attendanceReport(q);
  sendTable(res, parseFormat(q.format), `attendance-${q.from}-to-${q.to}`, [
    { header: "Admission no.", value: (x) => x.code },
    { header: "Student", value: (x) => x.name },
    { header: "Grade", value: (x) => x.grade },
    { header: "Present", value: (x) => x.present },
    { header: "Absent", value: (x) => x.absent },
    { header: "Leave", value: (x) => x.leave },
    { header: "Rate %", value: (x) => x.rate },
  ], r.students.sort((a, b) => a.name.localeCompare(b.name)));
});

// ── Pending dues ──
const duesQuery = z.object({ grade: z.union([zGrade, z.literal("")]).optional(), format: z.string().optional() });

async function duesReport(q: z.infer<typeof duesQuery>) {
  const records = await db().feeRecord.findMany({
    where: { status: { in: ["UNPAID", "PARTIAL"] }, month: { lte: monthKey() }, student: { status: "ACTIVE", ...(q.grade ? { grade: q.grade } : {}) } },
    include: { student: { select: { id: true, name: true, code: true, grade: true, parentName: true, mobile: true, feeRemindersEnabled: true } } },
    orderBy: { month: "asc" },
  });
  const by = new Map<string, { student: (typeof records)[number]["student"]; months: string[]; balance: number; due: number; paid: number }>();
  for (const r of records) {
    const b = balanceOf(r);
    if (b <= 0) continue;
    const x = by.get(r.studentId) ?? { student: r.student, months: [], balance: 0, due: 0, paid: 0 };
    x.months.push(monthLabel(r.month).slice(0, 3));
    x.balance += b;
    x.due += r.totalDue;
    x.paid += r.paid;
    by.set(r.studentId, x);
  }
  const rows = [...by.values()]
    .map((x) => ({
      studentId: x.student.id,
      name: x.student.name,
      code: x.student.code,
      grade: gradeLabel(x.student.grade),
      parent: x.student.parentName,
      mobile: x.student.mobile,
      months: x.months.join(", "),
      due: x.due,
      paid: x.paid,
      balance: x.balance,
      reminders: x.student.feeRemindersEnabled,
    }))
    .sort((a, b) => b.balance - a.balance);
  return { total: rows.reduce((t, r) => t + r.balance, 0), students: rows.length, rows };
}

reportsRouter.get("/dues", async (req, res) => res.json(await duesReport(parseQuery(duesQuery, req.query))));
reportsRouter.get("/dues/export", async (req, res) => {
  const q = parseQuery(duesQuery, req.query);
  const r = await duesReport(q);
  sendTable(res, parseFormat(q.format), `pending-dues-${todayIst()}`, [
    { header: "Admission no.", value: (x) => x.code },
    { header: "Student", value: (x) => x.name },
    { header: "Grade", value: (x) => x.grade },
    { header: "Parent", value: (x) => x.parent },
    { header: "Mobile", value: (x) => x.mobile },
    { header: "Months", value: (x) => x.months },
    { header: "Due (₹)", value: (x) => x.due },
    { header: "Paid (₹)", value: (x) => x.paid },
    { header: "Balance (₹)", value: (x) => x.balance },
    { header: "Reminders", value: (x) => (x.reminders ? "On" : "Exempt") },
  ], r.rows);
});

// ── Fee collection ──
async function collectionReport(q: z.infer<typeof rangeQuery>) {
  const payments = await db().payment.findMany({
    where: { status: "VERIFIED", paidOn: { gte: dbDate(q.from), lte: dbDate(q.to) }, ...(q.grade ? { student: { grade: q.grade } } : {}) },
    include: { student: { select: { name: true, code: true, grade: true } } },
    orderBy: { paidOn: "desc" },
  });
  const byMethod = (["CASH", "GPAY", "BANK_TRANSFER"] as const).map((m) => ({
    method: m,
    label: paymentMethodLabel[m],
    amount: payments.filter((p) => p.method === m).reduce((t, p) => t + p.amount, 0),
    count: payments.filter((p) => p.method === m).length,
  }));
  const days = daysBetween(q.from, q.to);
  const byDay = (days.length <= 62 ? days : []).map((d) => ({ date: d, label: shortDate(dbDate(d)), amount: payments.filter((p) => ymd(p.paidOn) === d).reduce((t, p) => t + p.amount, 0) }));
  return {
    total: payments.reduce((t, p) => t + p.amount, 0),
    count: payments.length,
    byMethod,
    byDay,
    rows: payments.slice(0, 200).map((p) => ({ id: p.id, date: ymd(p.paidOn), student: p.student.name, code: p.student.code, grade: gradeLabel(p.student.grade), method: paymentMethodLabel[p.method], reference: p.reference, amount: p.amount, source: p.source })),
    all: payments,
  };
}

reportsRouter.get("/collection", async (req, res) => {
  const { all: _all, ...rest } = await collectionReport(parseQuery(rangeQuery, req.query));
  res.json(rest);
});
reportsRouter.get("/collection/export", async (req, res) => {
  const q = parseQuery(rangeQuery, req.query);
  const r = await collectionReport(q);
  sendTable(res, parseFormat(q.format), `fee-collection-${q.from}-to-${q.to}`, [
    { header: "Date", value: (p) => ymd(p.paidOn) },
    { header: "Admission no.", value: (p) => p.student.code },
    { header: "Student", value: (p) => p.student.name },
    { header: "Grade", value: (p) => gradeLabel(p.student.grade) },
    { header: "Method", value: (p) => paymentMethodLabel[p.method] },
    { header: "Reference", value: (p) => p.reference },
    { header: "Amount (₹)", value: (p) => p.amount },
    { header: "Recorded by", value: (p) => (p.source === "ADMIN" ? "Admin" : "Parent (verified)") },
  ], r.all);
});
