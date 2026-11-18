import type { Prisma } from "@dd/db";
import { db } from "./db";

type Tx = Prisma.TransactionClient;

/**
 * Next value of a readable sequence ("DD-0921", "REG-0922"). Atomic (one upsert with an
 * increment), so two approvals at the same moment never get the same code.
 */
export async function nextSequence(key: string, start: number, tx: Tx = db()): Promise<number> {
  const row = await tx.counter.upsert({ where: { key }, create: { key, value: start }, update: { value: { increment: 1 } } });
  return row.value;
}

export const pad = (n: number, width = 4) => String(n).padStart(width, "0");

export const nextStudentCode = async (tx?: Tx) => `DD-${pad(await nextSequence("student", 1, tx))}`;
export const nextStaffCode = async (tx?: Tx) => `DD-ST-${pad(await nextSequence("staff", 1, tx), 3)}`;
export const nextRegistrationCode = async (tx?: Tx) => `REG-${pad(await nextSequence("registration", 1, tx))}`;
export const nextEnrolmentChangeCode = async (tx?: Tx) => `ENR-${pad(await nextSequence("enrolment-change", 1, tx))}`;
