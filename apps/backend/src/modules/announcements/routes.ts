import type { Announcement, NotificationCategory, Prisma } from "@dd/db";
import { GRADES, gradeLabel, isGrade, LEARNING_MODES, monthKey, SESSION_TYPES } from "@dd/shared/domain";
import { Router } from "express";
import * as z from "zod";
import { addDays, greeting, istTime, shortDate, todayIst } from "../../lib/dates";
import { db } from "../../lib/db";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { actor, portalUser, type Actor } from "../../middleware/auth";
import { idParam, parseBody, parseQuery, zDate, zId } from "../../middleware/validate";
import { audit } from "../../services/audit";
import { removeFile } from "../../services/files";
import { notifyParents, notifyUsers } from "../../services/notify";
import { classLabel, classStudentsWhere, staffClasses } from "../../services/scope";
import { zOptionalId } from "../common";

/**
 * /v1/announcements: admin announcements (any audience) and staff class notices (only the
 * parents of their own classes). No audience filter = all active parents. Scheduled ones are
 * sent by the job scheduler (jobs/index.ts).
 * /v1/notifications: the signed-in user's inbox.
 */
export const announcementsRouter = Router();
announcementsRouter.use(portalUser);

const filtersSchema = z
  .object({ courseId: zOptionalId, sessionType: z.union([z.enum(SESSION_TYPES), z.literal("")]).optional(), learningMode: z.union([z.enum(LEARNING_MODES), z.literal("")]).optional() })
  .strict()
  .default({ courseId: undefined });
type Filters = z.infer<typeof filtersSchema>;

const audienceKey = z.string().regex(/^(ALL_PARENTS|DUES|COMPETITION|ALL_STAFF|GRADE:[A-Z0-9_]+|CLASS:[A-Z0-9_]+:[0-9a-f-]{36}:[^:]{0,60})$/);

/** Resolves audience keys to active student ids (their parents) and staff user ids. */
async function resolveAudience(keys: string[], filters: Filters) {
  const studentOr: Prisma.StudentWhereInput[] = [];
  let staff = false;
  for (const k of keys) {
    if (k === "ALL_PARENTS") studentOr.push({});
    else if (k === "DUES") studentOr.push({ feeRecords: { some: { status: { in: ["UNPAID", "PARTIAL"] }, month: { lte: monthKey() } } } });
    else if (k === "COMPETITION") studentOr.push({ competitionRegs: { some: { competition: { date: { gte: new Date(`${addDays(todayIst(), -1)}T00:00:00Z`) } } } } });
    else if (k === "ALL_STAFF") staff = true;
    else if (k.startsWith("GRADE:")) {
      const g = k.slice(6);
      if (isGrade(g)) studentOr.push({ grade: g });
    } else if (k.startsWith("CLASS:")) {
      const [, g, courseId] = k.split(":");
      if (isGrade(g) && courseId) studentOr.push(classStudentsWhere({ grade: g, courseId }));
    }
  }
  const and: Prisma.StudentWhereInput[] = [{ status: "ACTIVE" }];
  if (filters.courseId) and.push({ enrolments: { some: { courseId: filters.courseId, endedAt: null } } });
  if (filters.sessionType) and.push({ sessionType: filters.sessionType });
  if (filters.learningMode) and.push({ learningMode: filters.learningMode });
  const students = studentOr.length ? await db().student.findMany({ where: { AND: [...and, { OR: studentOr }] }, select: { id: true, mobile: true } }) : [];
  const staffUsers = staff ? await db().user.findMany({ where: { role: "STAFF", status: "ACTIVE" }, select: { id: true } }) : [];
  return {
    studentIds: students.map((s) => s.id),
    parents: new Set(students.map((s) => s.mobile)).size,
    staffIds: staffUsers.map((u) => u.id),
  };
}

async function audienceLabel(keys: string[]) {
  const parts: string[] = [];
  for (const k of keys) {
    if (k === "ALL_PARENTS") parts.push("All parents");
    else if (k === "DUES") parts.push("Parents with dues");
    else if (k === "COMPETITION") parts.push("Competition registrants");
    else if (k === "ALL_STAFF") parts.push("All staff");
    else if (k.startsWith("GRADE:") && isGrade(k.slice(6))) parts.push(gradeLabel(k.slice(6) as never));
    else if (k.startsWith("CLASS:")) {
      const [, g, courseId, subject] = k.split(":");
      const c = await db().course.findUnique({ where: { id: courseId! }, select: { name: true } });
      if (c && isGrade(g)) parts.push(classLabel(g, c.name, subject ?? ""));
    }
  }
  return parts.join(", ").slice(0, 200) || "All parents";
}

/** Staff may only address their own classes. */
async function assertAudienceAllowed(a: Actor, keys: string[]) {
  if (a.isAdmin) return;
  const mine = new Set((await staffClasses(a.id)).map((c) => `CLASS:${c.grade}:${c.courseId}:${c.subject}`));
  if (!keys.length || keys.some((k) => !mine.has(k))) throw forbidden("You can send notices only to parents of students in your assigned classes.");
}

/** Sends now: parent + staff notifications, status SENT. Used by the route and the scheduler. */
export async function deliver(a: Announcement) {
  const parsed = filtersSchema.safeParse(a.filters ?? {});
  const r = await resolveAudience(a.audiences, parsed.success ? parsed.data : { courseId: undefined });
  const note = { category: (a.kind === "CLASS_NOTICE" ? "CLASSES" : "ANNOUNCEMENT") as NotificationCategory, title: a.title, body: a.message };
  await notifyParents(r.studentIds, note);
  await notifyUsers(r.staffIds, { ...note, category: "ADMIN", actionLabel: "Open", href: "/staff/notifications" });
  return db().announcement.update({ where: { id: a.id }, data: { status: "SENT", sentAt: new Date(), recipientCount: r.parents + r.staffIds.length } });
}

announcementsRouter.get("/audiences", async (req, res) => {
  const a = actor(req);
  if (!a.isAdmin) {
    const classes = await staffClasses(a.id);
    res.json({
      groups: classes.map((c) => ({ key: `CLASS:${c.grade}:${c.courseId}:${c.subject}`, label: c.label, count: c.studentCount, kind: "class" })),
    });
    return;
  }
  const count = async (k: string) => (await resolveAudience([k], { courseId: undefined })).parents;
  const staffCount = await db().user.count({ where: { role: "STAFF", status: "ACTIVE" } });
  const grades = await db().student.groupBy({ by: ["grade"], where: { status: "ACTIVE" }, _count: { _all: true } });
  const gradeGroups = [];
  for (const g of GRADES) {
    if (!grades.some((x) => x.grade === g)) continue;
    gradeGroups.push({ key: `GRADE:${g}`, label: gradeLabel(g), count: await count(`GRADE:${g}`), kind: "grade" });
  }
  res.json({
    groups: [
      { key: "ALL_PARENTS", label: "All parents", count: await count("ALL_PARENTS"), kind: "all" },
      ...gradeGroups,
      { key: "DUES", label: "Parents with dues", count: await count("DUES"), kind: "dues" },
      { key: "COMPETITION", label: "Competition registrants", count: await count("COMPETITION"), kind: "competition" },
      { key: "ALL_STAFF", label: "All staff", count: staffCount, kind: "staff" },
    ],
  });
});

const previewBody = z.object({ audiences: z.array(audienceKey).max(30), filters: filtersSchema }).strict();

announcementsRouter.post("/preview", async (req, res) => {
  const a = actor(req);
  const body = parseBody(previewBody, req.body);
  await assertAudienceAllowed(a, body.audiences);
  const r = await resolveAudience(body.audiences, body.filters);
  res.json({ parents: r.parents, staff: r.staffIds.length, label: await audienceLabel(body.audiences) });
});

const createBody = z
  .object({
    title: z.string().trim().min(1, { error: "Add a title." }).max(80),
    message: z.string().trim().min(1, { error: "Write the message." }).max(500),
    audiences: z.array(audienceKey).min(1, { error: "Choose who should get it." }).max(30),
    filters: filtersSchema,
    attachmentFileId: zId.optional(),
    scheduledFor: z.iso.datetime({ offset: true }).optional(),
    draft: z.boolean().default(false),
  })
  .strict();

announcementsRouter.post("/", async (req, res) => {
  const a = actor(req);
  const body = parseBody(createBody, req.body);
  await assertAudienceAllowed(a, body.audiences);
  if (body.attachmentFileId) {
    const f = await db().storedFile.findUnique({ where: { id: body.attachmentFileId } });
    if (!f || f.purpose !== "ANNOUNCEMENT" || (f.uploadedById !== a.id && !a.isAdmin)) throw badRequest("Attach the file again.");
  }
  const scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
  if (scheduledFor && scheduledFor.getTime() < Date.now() - 60_000) throw badRequest("The scheduled time has passed.", { scheduledFor: "Pick a future time." });
  const me = await db().user.findUniqueOrThrow({ where: { id: a.id } });
  const senderLabel = a.isAdmin ? "Dynamic Donalds" : `${me.name.split(" ")[0]} · ${me.subject ?? "Teacher"}`;
  const created = await db().announcement.create({
    data: {
      kind: a.isAdmin ? "ANNOUNCEMENT" : "CLASS_NOTICE",
      title: body.title,
      message: body.message,
      audiences: body.audiences,
      audienceLabel: await audienceLabel(body.audiences),
      channels: ["PUSH", "IN_APP"],
      attachmentFileId: body.attachmentFileId ?? null,
      status: body.draft ? "DRAFT" : scheduledFor ? "SCHEDULED" : "DRAFT",
      scheduledFor,
      createdById: a.id,
      senderLabel,
      // Kept with the audience keys so scheduled sends resolve the same way.
      filters: Object.values(body.filters).some(Boolean) ? body.filters : undefined,
    },
  });
  let result = created;
  if (!body.draft && !scheduledFor) result = await deliver(created);
  await audit(req, {
    area: "ANNOUNCEMENTS",
    action: body.draft ? "announcement.draft" : scheduledFor ? "announcement.schedule" : "announcement.send",
    summary: `${body.draft ? "saved a draft" : scheduledFor ? "scheduled" : "sent"} ${a.isAdmin ? "the announcement" : "the class notice"} "${body.title}" to ${created.audienceLabel}`,
    entityType: "Announcement",
    entityId: created.id,
    toLabel: body.draft ? "Draft" : scheduledFor ? "Scheduled" : `Sent · ${result.recipientCount}`,
  });
  res.status(201).json({ id: created.id, status: result.status, recipients: result.recipientCount });
});

announcementsRouter.post("/:id/send", async (req, res) => {
  const a = actor(req);
  const ann = await db().announcement.findUnique({ where: { id: idParam(req.params.id, "That announcement") } });
  if (!ann) throw notFound("That announcement");
  if (!a.isAdmin && ann.createdById !== a.id) throw forbidden();
  if (ann.status === "SENT") throw conflict("Already sent.");
  const sent = await deliver(ann);
  await audit(req, { area: "ANNOUNCEMENTS", action: "announcement.send", summary: `sent "${ann.title}" to ${ann.audienceLabel}`, entityType: "Announcement", entityId: ann.id, fromLabel: ann.status === "DRAFT" ? "Draft" : "Scheduled", toLabel: `Sent · ${sent.recipientCount}` });
  res.json({ status: "SENT", recipients: sent.recipientCount });
});

announcementsRouter.delete("/:id", async (req, res) => {
  const a = actor(req);
  const ann = await db().announcement.findUnique({ where: { id: idParam(req.params.id, "That announcement") } });
  if (!ann) throw notFound("That announcement");
  if (!a.isAdmin && ann.createdById !== a.id) throw forbidden();
  // Staff can only remove their own notices before they are sent. Admins can remove any announcement.
  if (!a.isAdmin && ann.status === "SENT") throw conflict("A sent notice can't be deleted.");
  await db().announcement.delete({ where: { id: ann.id } });
  if (ann.attachmentFileId) await removeFile(ann.attachmentFileId);
  await audit(req, {
    area: "ANNOUNCEMENTS",
    action: "announcement.delete",
    summary: `deleted "${ann.title}"${ann.status === "SENT" ? " (already sent; removed from the list and the app)" : ""}`,
    entityType: "Announcement",
    entityId: ann.id,
    fromLabel: ann.status === "SENT" ? "Sent" : ann.status === "SCHEDULED" ? "Scheduled" : "Draft",
    toLabel: "Deleted",
  });
  res.json({ ok: true });
});

announcementsRouter.get("/", async (req, res) => {
  const a = actor(req);
  const q = parseQuery(z.object({ from: zDate.optional(), to: zDate.optional() }), req.query);
  const where: Prisma.AnnouncementWhereInput = a.isAdmin ? {} : { createdById: a.id };
  if (q.from || q.to) where.createdAt = { ...(q.from ? { gte: new Date(`${q.from}T00:00:00+05:30`) } : {}), ...(q.to ? { lte: new Date(`${q.to}T23:59:59+05:30`) } : {}) };
  const rows = await db().announcement.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { createdBy: { select: { name: true } } } });
  res.json({
    rows: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      message: r.message,
      audienceLabel: r.audienceLabel,
      recipients: r.recipientCount,
      status: r.status,
      scheduledFor: r.scheduledFor,
      sentAt: r.sentAt,
      createdAt: r.createdAt,
      sender: r.kind === "CLASS_NOTICE" ? r.createdBy?.name ?? r.senderLabel : r.senderLabel,
      attachmentFileId: r.attachmentFileId,
    })),
  });
});

// ───────────────────────────── Inbox ─────────────────────────────
export const notificationsRouter = Router();
notificationsRouter.use(portalUser);

const ADMIN_GROUPS: Record<string, NotificationCategory[]> = {
  approvals: ["APPROVALS"],
  payments: ["PAYMENTS", "FEES"],
  system: ["SYSTEM", "ATTENDANCE", "HOMEWORK", "MARKS", "CLASSES", "ADMIN", "ANNOUNCEMENT"],
};
const STAFF_GROUPS: Record<string, NotificationCategory[]> = {
  admin: ["ADMIN", "ANNOUNCEMENT", "APPROVALS", "SYSTEM", "PAYMENTS", "FEES"],
  classes: ["CLASSES", "HOMEWORK", "MARKS", "ATTENDANCE"],
};
const groupOf = (a: Actor, c: NotificationCategory) => Object.entries(a.isAdmin ? ADMIN_GROUPS : STAFF_GROUPS).find(([, cats]) => cats.includes(c))?.[0] ?? "system";

notificationsRouter.get("/", async (req, res) => {
  const a = actor(req);
  const q = parseQuery(z.object({ filter: z.string().max(20).default("all"), date: zDate.optional() }), req.query);
  const groups = a.isAdmin ? ADMIN_GROUPS : STAFF_GROUPS;
  const base: Prisma.NotificationWhereInput = { userId: a.id };
  const where: Prisma.NotificationWhereInput = { ...base };
  if (q.filter === "unread") where.readAt = null;
  else if (groups[q.filter]) where.category = { in: groups[q.filter] };
  if (q.date) where.createdAt = { gte: new Date(`${q.date}T00:00:00+05:30`), lte: new Date(`${q.date}T23:59:59.999+05:30`) };
  const [rows, all] = await Promise.all([
    db().notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
    db().notification.findMany({ where: base, select: { category: true, readAt: true, urgent: true }, take: 2000, orderBy: { createdAt: "desc" } }),
  ]);
  const counts: Record<string, number> = { all: all.length, unread: all.filter((n) => !n.readAt).length };
  for (const g of Object.keys(groups)) counts[g] = all.filter((n) => groups[g]!.includes(n.category)).length;
  const today = todayIst();
  const yesterday = addDays(today, -1);
  const byDay = new Map<string, unknown[]>();
  for (const n of rows) {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(n.createdAt);
    const label = day === today ? "Today" : day === yesterday ? "Yesterday" : shortDate(n.createdAt);
    if (!byDay.has(label)) byDay.set(label, []);
    byDay.get(label)!.push({
      id: n.id,
      time: istTime(n.createdAt),
      category: n.category,
      group: groupOf(a, n.category),
      title: n.title,
      body: n.body,
      actionLabel: n.actionLabel,
      href: n.href,
      read: !!n.readAt,
      urgent: n.urgent,
    });
  }
  const me = req.auth!.user;
  res.json({
    greeting: `${greeting()}, ${me.name.split(" ")[0]}`,
    unread: counts.unread,
    urgent: all.filter((n) => n.urgent && !n.readAt).length,
    counts,
    days: [...byDay.entries()].map(([label, items]) => ({ label, items })),
  });
});

notificationsRouter.post("/:id/read", async (req, res) => {
  const a = actor(req);
  await db().notification.updateMany({ where: { id: idParam(req.params.id, "That notification"), userId: a.id, readAt: null }, data: { readAt: new Date() } });
  res.json({ ok: true });
});

notificationsRouter.post("/read-all", async (req, res) => {
  const a = actor(req);
  const r = await db().notification.updateMany({ where: { userId: a.id, readAt: null }, data: { readAt: new Date() } });
  res.json({ updated: r.count });
});

export const logAnnouncementError = (err: unknown) => logger.error({ err }, "announcement delivery failed");
