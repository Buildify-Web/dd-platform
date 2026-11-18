import type { NotificationCategory, Prisma } from "@dd/db";
import { db } from "../lib/db";
import { logger } from "../lib/logger";

type Note = {
  category: NotificationCategory;
  title: string;
  body: string;
  actionLabel?: string;
  href?: string;
  urgent?: boolean;
};

const clip = (n: Note) => ({
  category: n.category,
  title: n.title.slice(0, 120),
  body: n.body.slice(0, 500),
  actionLabel: n.actionLabel?.slice(0, 20) ?? null,
  href: n.href?.slice(0, 200) ?? null,
  urgent: n.urgent ?? false,
});

/**
 * In-app notifications. Portal users read theirs in the Notifications inbox; PARENT rows are
 * for the mobile app (push delivery via FCM is added with the app). Notifications never break
 * the action that triggered them: failures are logged.
 */
export async function notifyUsers(userIds: string[], note: Note, tx?: Prisma.TransactionClient) {
  if (!userIds.length) return;
  try {
    await (tx ?? db()).notification.createMany({ data: [...new Set(userIds)].map((userId) => ({ recipientType: "USER" as const, userId, ...clip(note) })) });
  } catch (err) {
    logger.error({ err }, "notifyUsers failed");
  }
}

/** Every active admin (approvals, payments, system alerts). */
export async function notifyAdmins(note: Note, tx?: Prisma.TransactionClient) {
  const admins = await (tx ?? db()).user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
  await notifyUsers(
    admins.map((a) => a.id),
    note,
    tx,
  );
}

/**
 * Parents of these students. Only ACTIVE students' parents are notified (scope §5).
 */
export async function notifyParents(studentIds: string[], note: Note, tx?: Prisma.TransactionClient) {
  if (!studentIds.length) return 0;
  const client = tx ?? db();
  try {
    const active = await client.student.findMany({ where: { id: { in: [...new Set(studentIds)] }, status: "ACTIVE" }, select: { id: true } });
    if (!active.length) return 0;
    await client.notification.createMany({ data: active.map((s) => ({ recipientType: "PARENT" as const, studentId: s.id, ...clip(note) })) });
    return active.length;
  } catch (err) {
    logger.error({ err }, "notifyParents failed");
    return 0;
  }
}
