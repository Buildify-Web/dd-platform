import type { FeeRecord, FeeStatus, Prisma } from "@dd/db";
import { formatINR, monthKey, monthLabel } from "@dd/shared/domain";
import { db } from "../lib/db";

type Tx = Prisma.TransactionClient;

/**
 * Monthly fees. Each active student gets one FeeRecord per month ("YYYY-MM") listing the
 * charges: every active enrolment's course fee (or the per-student override), plus one-time
 * and competition charges added during the month. `paid` = verified payments applied to it.
 * Status: Paid completely / Paid partially (balance used in reminders) / Unpaid, unless an
 * admin set a manual status.
 */
export const deriveStatus = (total: number, paid: number, override: FeeStatus | null): FeeStatus =>
  override ?? (total > 0 && paid >= total ? "PAID" : paid > 0 ? "PARTIAL" : total === 0 ? "PAID" : "UNPAID");

export const balanceOf = (r: Pick<FeeRecord, "totalDue" | "paid">) => Math.max(0, r.totalDue - r.paid);

/** Course charges for a student from their active enrolments. */
async function courseCharges(studentId: string, tx: Tx) {
  const enrolments = await tx.enrolment.findMany({
    where: { studentId, endedAt: null },
    include: { course: { select: { id: true, name: true, monthlyFee: true, category: true, isMandatory: true } } },
    orderBy: { startedAt: "asc" },
  });
  return enrolments.map((e) => {
    const overridden = e.feeOverride !== null && e.feeOverride !== e.course.monthlyFee;
    return {
      type: overridden ? ("OVERRIDE" as const) : ("COURSE" as const),
      label: e.course.name,
      detail: overridden
        ? `${formatINR(e.course.monthlyFee)} → ${formatINR(e.feeOverride!)} override${e.overrideReason ? ` (${e.overrideReason})` : ""}`
        : e.course.isMandatory
          ? "Core course"
          : null,
      amount: overridden ? e.feeOverride! : e.course.monthlyFee,
      courseId: e.course.id,
    };
  });
}

/** Recomputes total, paid and status from the charges and verified payments. */
export async function recalc(recordId: string, tx: Tx = db()) {
  const [charges, paid, record] = await Promise.all([
    tx.feeCharge.aggregate({ where: { recordId }, _sum: { amount: true } }),
    tx.payment.aggregate({ where: { recordId, status: "VERIFIED" }, _sum: { amount: true } }),
    tx.feeRecord.findUniqueOrThrow({ where: { id: recordId }, select: { statusOverride: true } }),
  ]);
  const totalDue = charges._sum.amount ?? 0;
  const paidSum = paid._sum.amount ?? 0;
  return tx.feeRecord.update({
    where: { id: recordId },
    data: { totalDue, paid: paidSum, status: deriveStatus(totalDue, paidSum, record.statusOverride) },
  });
}

/** The student's record for a month, created (with charges) if missing. */
export async function ensureRecord(studentId: string, month: string, tx: Tx = db()) {
  const existing = await tx.feeRecord.findUnique({ where: { studentId_month: { studentId, month } } });
  if (existing) return existing;
  const charges = await courseCharges(studentId, tx);
  const totalDue = charges.reduce((s, c) => s + c.amount, 0);
  const record = await tx.feeRecord.create({
    data: {
      studentId,
      month,
      totalDue,
      status: deriveStatus(totalDue, 0, null),
      charges: { create: charges },
      events: { create: { text: `${monthLabel(month).split(" ")[0]} fee generated`, actor: "System", amount: totalDue, kind: "generated" } },
    },
  });
  return record;
}

/**
 * Makes sure every active student with at least one course has a record for `month`
 * (only for the current or past months). Safe to call repeatedly.
 */
export async function ensureMonth(month = monthKey()) {
  if (month > monthKey()) return 0;
  const missing = await db().student.findMany({
    where: { status: "ACTIVE", enrolments: { some: { endedAt: null } }, feeRecords: { none: { month } } },
    select: { id: true },
  });
  for (const s of missing) {
    await db()
      .$transaction((tx) => ensureRecord(s.id, month, tx))
      .catch(() => undefined); // a parallel request may have created it
  }
  return missing.length;
}

/** Monthly total a student would pay with these course ids (registration / enrolment-change previews). */
export async function monthlyTotalFor(courseIds: string[], overrides: Map<string, number> = new Map()) {
  if (!courseIds.length) return 0;
  const courses = await db().course.findMany({ where: { id: { in: courseIds } }, select: { id: true, monthlyFee: true } });
  return courses.reduce((s, c) => s + (overrides.get(c.id) ?? c.monthlyFee), 0);
}

/** "Paid partially · ₹1,750" for audit chips. */
export const statusChip = (status: FeeStatus, paid: number) =>
  status === "PAID" ? "Paid completely" : status === "PARTIAL" ? `Paid partially · ${formatINR(paid)}` : "Unpaid";
