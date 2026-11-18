import type { AuditArea, Prisma } from "@dd/db";
import type { Request } from "express";
import { db } from "../lib/db";
import { logger } from "../lib/logger";

export type AuditEntry = {
  area: AuditArea;
  /** Machine action, e.g. "payment.verify". */
  action: string;
  /** Sentence after the actor's name: "verified a GPay payment for Madhuri Ishani". */
  summary: string;
  entityType?: string;
  entityId?: string;
  /** Status chips on the audit log: "Unpaid" → "Paid partially · ₹1,750". */
  fromLabel?: string | null;
  toLabel?: string | null;
  before?: unknown;
  after?: unknown;
};

const json = (v: unknown) => (v === undefined ? undefined : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue));

/**
 * Writes one permanent, read-only audit row. `req` supplies the actor + IP/UA (from the BFF).
 * Pass `null` for automatic jobs ("System"). Never throws: an audit failure is logged loudly
 * but does not undo the action (the action itself already committed).
 */
export async function audit(req: Request | null, entry: AuditEntry, tx?: Prisma.TransactionClient) {
  const user = req?.auth?.user;
  try {
    await (tx ?? db()).auditLog.create({
      data: {
        area: entry.area,
        action: entry.action,
        summary: entry.summary.slice(0, 300),
        actorId: user?.id ?? null,
        actorName: user?.name ?? "System",
        actorRole: user ? (user.role === "ADMIN" ? (user.isMainAdmin ? "Owner" : "Admin") : "Staff") : "System",
        entityType: entry.entityType ?? null,
        entityId: entry.entityId ?? null,
        fromLabel: entry.fromLabel?.slice(0, 80) ?? null,
        toLabel: entry.toLabel?.slice(0, 80) ?? null,
        before: json(entry.before),
        after: json(entry.after),
        ipAddress: req?.ctx.ip.slice(0, 45) ?? null,
        userAgent: req?.ctx.userAgent ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, action: entry.action }, "failed to write audit log");
  }
}
