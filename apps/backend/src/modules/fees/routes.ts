import type { FeeStatus, Prisma } from "@dd/db";
import { FEE_STATUSES, feeStatusLabel, formatINR, gradeLabel, longTextSchema, monthKey, monthLabel, PAYMENT_METHODS, paymentMethodLabel, rupeesSchema } from "@dd/shared/domain";
import { Router } from "express";
import * as z from "zod";
import { dbDate, istTime, shortDate, todayIst, ymd } from "../../lib/dates";
import { db } from "../../lib/db";
import { badRequest, conflict, notFound } from "../../lib/errors";
import { parseFormat, sendTable } from "../../lib/export";
import { actor, adminOnly } from "../../middleware/auth";
import { idParam, parseBody, parseQuery, zDate, zId, zMonth, zPage, zSearch } from "../../middleware/validate";
import { audit } from "../../services/audit";
import { balanceOf, ensureMonth, ensureRecord, recalc, statusChip } from "../../services/fees";
import { notifyParents } from "../../services/notify";
import { shortRef, zGrade } from "../common";

/**
 * /v1/fees (admin): monthly fee status per student, the student fee record (charges,
 * overrides, one-time payments, offline payments, manual status, reminder exemption) and
 * /v1/payments: verification of payments parents submit from the app (GPay / bank).
 */
export const feesRouter = Router();
feesRouter.use(adminOnly);

const listQuery = z.object({
  month: zMonth.default(() => monthKey()),
  status: z.union([z.enum(FEE_STATUSES), z.literal("")]).optional(),
  grade: z.union([zGrade, z.literal("")]).optional(),
  q: zSearch,
  page: zPage,
});

function recordsWhere(q: z.infer<typeof listQuery>): Prisma.FeeRecordWhereInput {
  return {
    month: q.month,
    ...(q.status ? { status: q.status } : {}),
    student: {
      ...(q.grade ? { grade: q.grade } : {}),
      ...(q.q ? { OR: [{ name: { contains: q.q, mode: "insensitive" } }, { parentName: { contains: q.q, mode: "insensitive" } }, { mobile: { contains: q.q } }] } : {}),
    },
  };
}

const PAGE = 15;

feesRouter.get("/", async (req, res) => {
  const q = parseQuery(listQuery, req.query);
  await ensureMonth(q.month);
  const where = recordsWhere(q);
  const [all, total, rows] = await Promise.all([
    db().feeRecord.findMany({ where: { month: q.month }, select: { status: true, totalDue: true, paid: true } }),
    db().feeRecord.count({ where }),
    db().feeRecord.findMany({
      where,
      include: { student: { select: { id: true, name: true, code: true, grade: true, parentName: true, mobile: true, feeRemindersEnabled: true } } },
      orderBy: [{ status: "desc" }, { student: { name: "asc" } }],
      skip: (q.page - 1) * PAGE,
      take: PAGE,
    }),
  ]);
  const sum = (f: (r: (typeof all)[number]) => number) => all.reduce((t, r) => t + f(r), 0);
  res.json({
    month: q.month,
    monthLabel: monthLabel(q.month),
    stats: {
      due: sum((r) => r.totalDue),
      collected: sum((r) => r.paid),
      outstanding: sum((r) => balanceOf(r)),
      paid: all.filter((r) => r.status === "PAID").length,
      partial: all.filter((r) => r.status === "PARTIAL").length,
      unpaid: all.filter((r) => r.status === "UNPAID").length,
    },
    total,
    page: q.page,
    pageSize: PAGE,
    rows: rows.map((r) => ({
      recordId: r.id,
      studentId: r.student.id,
      name: r.student.name,
      code: r.student.code,
      grade: gradeLabel(r.student.grade),
      parentName: r.student.parentName,
      mobile: r.student.mobile,
      totalDue: r.totalDue,
      paid: r.paid,
      balance: balanceOf(r),
      status: r.status,
      manual: !!r.statusOverride,
      reminders: r.student.feeRemindersEnabled,
    })),
  });
});

feesRouter.get("/export", async (req, res) => {
  const q = parseQuery(listQuery.extend({ format: z.string().optional() }), req.query);
  await ensureMonth(q.month);
  const rows = await db().feeRecord.findMany({ where: recordsWhere(q), include: { student: true }, orderBy: { student: { name: "asc" } } });
  sendTable(res, parseFormat(q.format), `fees-${q.month}`, [
    { header: "Admission no.", value: (r) => r.student.code },
    { header: "Student", value: (r) => r.student.name },
    { header: "Grade", value: (r) => gradeLabel(r.student.grade) },
    { header: "Parent", value: (r) => r.student.parentName },
    { header: "Mobile", value: (r) => r.student.mobile },
    { header: "Due (₹)", value: (r) => r.totalDue },
    { header: "Paid (₹)", value: (r) => r.paid },
    { header: "Balance (₹)", value: (r) => balanceOf(r) },
    { header: "Status", value: (r) => feeStatusLabel[r.status] },
  ], rows);
});

async function feeView(studentId: string, month: string) {
  const s = await db().student.findUnique({
    where: { id: studentId },
    include: { enrolments: { where: { endedAt: null }, include: { course: true } } },
  });
  if (!s) throw notFound("That student");
  if (month <= monthKey() && s.enrolments.length) await ensureRecord(studentId, month);
  const [record, months] = await Promise.all([
    db().feeRecord.findUnique({
      where: { studentId_month: { studentId, month } },
      include: { charges: { orderBy: { createdAt: "asc" } }, events: { orderBy: { at: "desc" } }, reminders: true },
    }),
    db().feeRecord.findMany({ where: { studentId }, select: { month: true, status: true }, orderBy: { month: "desc" } }),
  ]);
  return {
    student: { id: s.id, name: s.name, code: s.code, grade: gradeLabel(s.grade), feeRemindersEnabled: s.feeRemindersEnabled, parentName: s.parentName },
    month,
    monthLabel: monthLabel(month),
    months,
    enrolments: s.enrolments.map((e) => ({ id: e.id, courseId: e.courseId, name: e.course.name, fee: e.course.monthlyFee, override: e.feeOverride })),
    record: record
      ? {
          id: record.id,
          totalDue: record.totalDue,
          paid: record.paid,
          balance: balanceOf(record),
          status: record.status,
          statusOverride: record.statusOverride,
          charges: record.charges.map((c) => ({ id: c.id, type: c.type, label: c.label, detail: c.detail, amount: c.amount })),
          history: record.events.map((e) => ({
            id: e.id,
            when: ymd(e.at) === todayIst() || e.kind === "payment" ? `${shortDate(e.at)}, ${istTime(e.at)}` : shortDate(e.at),
            text: e.text,
            actor: e.actor,
            amount: e.amount,
            kind: e.kind,
          })),
          reminders: record.reminders.map((r) => r.kind),
        }
      : null,
  };
}

feesRouter.get("/students/:studentId", async (req, res) => {
  const { month } = parseQuery(z.object({ month: zMonth.default(() => monthKey()) }), req.query);
  res.json(await feeView(idParam(req.params.studentId, "That student"), month));
});

const paymentBody = z
  .object({ month: zMonth, amount: rupeesSchema.refine((n) => n > 0, { error: "Enter the amount received." }), method: z.enum(PAYMENT_METHODS), paidOn: zDate, reference: z.string().trim().max(60).default("") })
  .strict();

/** Admin records an offline payment (cash at office, or a transfer they've confirmed). */
feesRouter.post("/students/:studentId/payments", async (req, res) => {
  const a = actor(req);
  const studentId = idParam(req.params.studentId, "That student");
  const body = parseBody(paymentBody, req.body);
  if (body.paidOn > todayIst()) throw badRequest("The payment date is in the future.", { paidOn: "Pick today or earlier." });
  if (body.method !== "CASH" && !body.reference) throw badRequest("Add the UTR / reference number.", { reference: "Required for GPay and bank transfers." });
  const student = await db().student.findUnique({ where: { id: studentId } });
  if (!student) throw notFound("That student");
  const before = await ensureRecord(studentId, body.month);
  const after = await db().$transaction(async (tx) => {
    await tx.payment.create({
      data: { studentId, recordId: before.id, amount: body.amount, method: body.method, reference: body.reference || null, paidOn: dbDate(body.paidOn), source: "ADMIN", status: "VERIFIED", reviewedAt: new Date(), reviewedById: a.id, submittedByName: a.name },
    });
    await tx.feeEvent.create({
      data: { recordId: before.id, text: `${paymentMethodLabel[body.method]} payment recorded${body.reference ? ` · ${shortRef(body.reference)}` : ""}`, actor: "Admin", amount: body.amount, kind: "payment" },
    });
    return recalc(before.id, tx);
  });
  await notifyParents([studentId], { category: "FEES", title: "Payment received", body: `${formatINR(body.amount)} received for ${student.name} (${monthLabel(body.month)}). Balance: ${formatINR(balanceOf(after))}.` });
  await audit(req, {
    area: "FEES",
    action: "payment.record",
    summary: `recorded a ${paymentMethodLabel[body.method]} payment of ${formatINR(body.amount)} for ${student.name}`,
    entityType: "FeeRecord",
    entityId: before.id,
    fromLabel: statusChip(before.status, before.paid),
    toLabel: statusChip(after.status, after.paid),
    after: body,
  });
  res.status(201).json({ status: after.status, balance: balanceOf(after) });
});

const overrideBody = z
  .object({ month: zMonth, courseId: zId, amount: rupeesSchema, reason: z.string().trim().max(120).default(""), ongoing: z.boolean().default(true) })
  .strict();

/** Per-student course fee override (e.g. sibling concession). */
feesRouter.post("/students/:studentId/override", async (req, res) => {
  const studentId = idParam(req.params.studentId, "That student");
  const body = parseBody(overrideBody, req.body);
  const e = await db().enrolment.findFirst({ where: { studentId, courseId: body.courseId, endedAt: null }, include: { course: true, student: true } });
  if (!e) throw notFound("That enrolment");
  const record = await ensureRecord(studentId, body.month);
  const base = e.course.monthlyFee;
  const isOverride = body.amount !== base;
  await db().$transaction(async (tx) => {
    if (body.ongoing) await tx.enrolment.update({ where: { id: e.id }, data: { feeOverride: isOverride ? body.amount : null, overrideReason: isOverride ? body.reason || null : null } });
    const charge = await tx.feeCharge.findFirst({ where: { recordId: record.id, courseId: body.courseId } });
    const detail = isOverride ? `${formatINR(base)} → ${formatINR(body.amount)} override${body.reason ? ` (${body.reason})` : ""}` : null;
    if (charge) await tx.feeCharge.update({ where: { id: charge.id }, data: { type: isOverride ? "OVERRIDE" : "COURSE", amount: body.amount, detail } });
    else await tx.feeCharge.create({ data: { recordId: record.id, courseId: body.courseId, type: isOverride ? "OVERRIDE" : "COURSE", label: e.course.name, amount: body.amount, detail } });
    await tx.feeEvent.create({ data: { recordId: record.id, text: `${e.course.name} fee override ${formatINR(charge?.amount ?? base)} → ${formatINR(body.amount)}`, actor: "Admin", kind: "override" } });
    await recalc(record.id, tx);
  });
  await audit(req, {
    area: "FEES",
    action: "fee.override",
    summary: `changed ${e.student.name}'s ${e.course.name} fee`,
    entityType: "FeeRecord",
    entityId: record.id,
    fromLabel: formatINR(base),
    toLabel: formatINR(body.amount),
    after: body,
  });
  res.json({ ok: true });
});

const oneTimeBody = z
  .object({ month: zMonth, label: z.string().trim().min(1, { error: "Name the charge." }).max(120), detail: z.string().trim().max(200).default(""), amount: rupeesSchema.refine((n) => n > 0, { error: "Enter an amount." }) })
  .strict();

/** One-time payment (counts toward the outstanding balance and reminders). */
feesRouter.post("/students/:studentId/one-time", async (req, res) => {
  const studentId = idParam(req.params.studentId, "That student");
  const body = parseBody(oneTimeBody, req.body);
  const s = await db().student.findUnique({ where: { id: studentId } });
  if (!s) throw notFound("That student");
  const record = await ensureRecord(studentId, body.month);
  await db().$transaction(async (tx) => {
    await tx.feeCharge.create({ data: { recordId: record.id, type: "ONE_TIME", label: body.label, detail: body.detail || null, amount: body.amount } });
    await tx.feeEvent.create({ data: { recordId: record.id, text: `One-time charge: ${body.label}`, actor: "Admin", amount: body.amount, kind: "one-time" } });
    await recalc(record.id, tx);
  });
  await notifyParents([studentId], { category: "FEES", title: "New charge added", body: `${body.label}: ${formatINR(body.amount)} added to ${monthLabel(body.month)} fees.` });
  await audit(req, { area: "FEES", action: "fee.one_time", summary: `added a one-time charge "${body.label}" (${formatINR(body.amount)}) for ${s.name}`, entityType: "FeeRecord", entityId: record.id });
  res.status(201).json({ ok: true });
});

feesRouter.delete("/charges/:id", async (req, res) => {
  const c = await db().feeCharge.findUnique({ where: { id: idParam(req.params.id, "That charge") }, include: { record: { include: { student: true } } } });
  if (!c) throw notFound("That charge");
  if (c.type !== "ONE_TIME" && c.type !== "COMPETITION") throw conflict("Course charges follow the student's enrolment. Remove the course or override its fee instead.");
  await db().$transaction(async (tx) => {
    await tx.feeCharge.delete({ where: { id: c.id } });
    await tx.feeEvent.create({ data: { recordId: c.recordId, text: `Removed charge: ${c.label}`, actor: "Admin", amount: -c.amount, kind: "one-time" } });
    await recalc(c.recordId, tx);
  });
  await audit(req, { area: "FEES", action: "fee.charge_remove", summary: `removed the charge "${c.label}" from ${c.record.student.name}'s fees`, entityType: "FeeRecord", entityId: c.recordId });
  res.json({ ok: true });
});

/** Manual status (or null to go back to automatic). */
feesRouter.post("/records/:id/status", async (req, res) => {
  const id = idParam(req.params.id, "That fee record");
  const { status } = parseBody(z.object({ status: z.enum(FEE_STATUSES).nullable() }).strict(), req.body);
  const before = await db().feeRecord.findUnique({ where: { id }, include: { student: true } });
  if (!before) throw notFound("That fee record");
  const after = await db().$transaction(async (tx) => {
    await tx.feeRecord.update({ where: { id }, data: { statusOverride: status } });
    await tx.feeEvent.create({ data: { recordId: id, text: status ? `Status set to ${feeStatusLabel[status]}` : "Status set to automatic", actor: "Admin", kind: "status" } });
    return recalc(id, tx);
  });
  await audit(req, {
    area: "FEES",
    action: "fee.status",
    summary: `set ${before.student.name}'s ${monthLabel(before.month)} fee status manually`,
    entityType: "FeeRecord",
    entityId: id,
    fromLabel: feeStatusLabel[before.status],
    toLabel: feeStatusLabel[after.status],
  });
  res.json({ status: after.status });
});

feesRouter.post("/students/:studentId/reminders", async (req, res) => {
  const studentId = idParam(req.params.studentId, "That student");
  const { enabled } = parseBody(z.object({ enabled: z.boolean() }).strict(), req.body);
  const s = await db().student.update({ where: { id: studentId }, data: { feeRemindersEnabled: enabled } }).catch(() => null);
  if (!s) throw notFound("That student");
  await audit(req, { area: "FEES", action: "fee.reminders", summary: `${enabled ? "turned on" : "exempted"} automatic fee reminders for ${s.name}`, entityType: "Student", entityId: s.id, fromLabel: enabled ? "Exempt" : "On", toLabel: enabled ? "On" : "Exempt" });
  res.json({ ok: true });
});

// ───────────────────────────── Payments to review ─────────────────────────────
export const paymentsRouter = Router();
paymentsRouter.use(adminOnly);

const paymentsQuery = z.object({ status: z.enum(["PENDING", "VERIFIED", "ALL"]).default("PENDING"), method: z.union([z.enum(PAYMENT_METHODS), z.literal("")]).optional(), format: z.string().optional() });

function paymentsWhere(q: z.infer<typeof paymentsQuery>): Prisma.PaymentWhereInput {
  return { ...(q.status === "ALL" ? {} : { status: q.status }), ...(q.method ? { method: q.method } : {}), ...(q.status === "PENDING" ? { source: "PARENT" } : {}) };
}

const submittedLabel = (d: Date) => {
  const day = ymd(d);
  if (day === todayIst()) return `Today, ${istTime(d)}`;
  if (day === ymd(new Date(Date.now() - 86_400_000))) return "Yesterday";
  return shortDate(d);
};

paymentsRouter.get("/", async (req, res) => {
  const q = parseQuery(paymentsQuery, req.query);
  const monthStart = new Date(`${monthKey()}-01T00:00:00+05:30`);
  const [pending, verifiedMonth, cashMonth, rejected, rows] = await Promise.all([
    db().payment.count({ where: { status: "PENDING", source: "PARENT" } }),
    db().payment.aggregate({ where: { status: "VERIFIED", reviewedAt: { gte: monthStart } }, _count: { _all: true }, _sum: { amount: true } }),
    db().payment.aggregate({ where: { status: "VERIFIED", method: "CASH", source: "ADMIN", reviewedAt: { gte: monthStart } }, _sum: { amount: true } }),
    db().payment.count({ where: { status: "REJECTED", reviewedAt: { gte: monthStart } } }),
    db().payment.findMany({
      where: paymentsWhere(q),
      orderBy: { submittedAt: q.status === "PENDING" ? "desc" : "desc" },
      take: 100,
      include: { student: { select: { name: true, parentName: true } } },
    }),
  ]);
  res.json({
    stats: { pending, verifiedCount: verifiedMonth._count._all, verifiedAmount: verifiedMonth._sum.amount ?? 0, cash: cashMonth._sum.amount ?? 0, rejected },
    rows: rows.map((p) => ({
      id: p.id,
      submitted: submittedLabel(p.submittedAt),
      student: p.student.name,
      parent: p.submittedByName ?? p.student.parentName,
      method: p.method,
      reference: p.reference,
      amount: p.amount,
      status: p.status,
      source: p.source,
    })),
  });
});

paymentsRouter.get("/export", async (req, res) => {
  const q = parseQuery(paymentsQuery, req.query);
  const rows = await db().payment.findMany({ where: paymentsWhere(q), orderBy: { submittedAt: "desc" }, take: 5000, include: { student: true } });
  sendTable(res, parseFormat(q.format), `payments-${todayIst()}`, [
    { header: "Submitted", value: (p) => p.submittedAt.toISOString() },
    { header: "Student", value: (p) => p.student.name },
    { header: "Parent", value: (p) => p.submittedByName ?? p.student.parentName },
    { header: "Method", value: (p) => paymentMethodLabel[p.method] },
    { header: "Reference", value: (p) => p.reference },
    { header: "Amount (₹)", value: (p) => p.amount },
    { header: "Paid on", value: (p) => ymd(p.paidOn) },
    { header: "Status", value: (p) => p.status },
    { header: "Source", value: (p) => p.source },
  ], rows);
});

paymentsRouter.get("/:id", async (req, res) => {
  const p = await db().payment.findUnique({ where: { id: idParam(req.params.id, "That payment") }, include: { student: true, record: true } });
  if (!p) throw notFound("That payment");
  const records = await db().feeRecord.findMany({ where: { studentId: p.studentId }, orderBy: { month: "desc" }, take: 12 });
  const open = records.filter((r) => balanceOf(r) > 0);
  const suggested = p.recordId ?? [...open].sort((x, y) => x.month.localeCompare(y.month))[0]?.id ?? records[0]?.id ?? null;
  res.json({
    payment: {
      id: p.id,
      status: p.status,
      student: p.student.name,
      studentId: p.studentId,
      parent: p.submittedByName ?? p.student.parentName,
      method: p.method,
      reference: p.reference,
      amount: p.amount,
      paidOn: ymd(p.paidOn),
      screenshotFileId: p.screenshotFileId,
      note: p.note,
      balanceBefore: open.reduce((t, r) => t + balanceOf(r), 0),
    },
    applyOptions: records.map((r) => ({ id: r.id, label: `${monthLabel(r.month)} · balance ${formatINR(balanceOf(r))}`, balance: balanceOf(r) })),
    suggestedRecordId: suggested,
  });
});

paymentsRouter.post("/:id/verify", async (req, res) => {
  const body = parseBody(z.object({ recordId: zId.optional(), note: longTextSchema.default("") }).strict(), req.body);
  const a = actor(req);
  const p = await db().payment.findUnique({ where: { id: idParam(req.params.id, "That payment") }, include: { student: true } });
  if (!p) throw notFound("That payment");
  if (p.status !== "PENDING") throw conflict("This payment has already been reviewed.");
  const recordId = body.recordId ?? p.recordId ?? (await ensureRecord(p.studentId, monthKey())).id;
  const before = await db().feeRecord.findFirst({ where: { id: recordId, studentId: p.studentId } });
  if (!before) throw badRequest("Choose which month this payment applies to.", { recordId: "Pick a fee month." });
  const after = await db().$transaction(async (tx) => {
    await tx.payment.update({ where: { id: p.id }, data: { status: "VERIFIED", recordId, note: body.note || p.note, reviewedAt: new Date(), reviewedById: a.id } });
    await tx.feeEvent.create({
      data: { recordId, text: `${paymentMethodLabel[p.method]} payment verified${p.reference ? ` · ${p.method === "GPAY" ? "UTR " : ""}${shortRef(p.reference)}` : ""}`, actor: "Admin", amount: p.amount, kind: "payment" },
    });
    return recalc(recordId, tx);
  });
  await notifyParents([p.studentId], { category: "FEES", title: "Payment verified", body: `${formatINR(p.amount)} for ${p.student.name} is verified. ${after.status === "PAID" ? "Fees are fully paid." : `Remaining balance: ${formatINR(balanceOf(after))}.`}` });
  await audit(req, {
    area: "FEES",
    action: "payment.verify",
    summary: `verified a ${paymentMethodLabel[p.method]} payment for ${p.student.name}`,
    entityType: "Payment",
    entityId: p.id,
    fromLabel: statusChip(before.status, before.paid),
    toLabel: statusChip(after.status, after.paid),
    after: { amount: p.amount, recordId, reference: p.reference },
  });
  res.json({ status: after.status, balance: balanceOf(after) });
});

paymentsRouter.post("/:id/reject", async (req, res) => {
  const body = parseBody(z.object({ note: longTextSchema.default("") }).strict(), req.body);
  const a = actor(req);
  const p = await db().payment.findUnique({ where: { id: idParam(req.params.id, "That payment") }, include: { student: true } });
  if (!p) throw notFound("That payment");
  if (p.status !== "PENDING") throw conflict("This payment has already been reviewed.");
  await db().payment.update({ where: { id: p.id }, data: { status: "REJECTED", note: body.note || null, reviewedAt: new Date(), reviewedById: a.id } });
  await notifyParents([p.studentId], {
    category: "FEES",
    title: "Payment needs resubmitting",
    body: `We couldn't verify the ${formatINR(p.amount)} payment for ${p.student.name}.${body.note ? ` ${body.note}` : ""} Please check and resubmit.`,
  });
  await audit(req, { area: "FEES", action: "payment.reject", summary: `rejected a ${paymentMethodLabel[p.method]} payment for ${p.student.name}`, entityType: "Payment", entityId: p.id, fromLabel: "Pending", toLabel: "Rejected", after: { note: body.note } });
  res.json({ ok: true });
});

export type { FeeStatus };
