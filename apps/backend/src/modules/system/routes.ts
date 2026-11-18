import type { Prisma } from "@dd/db";
import { AUDIT_AREAS, auditAreaLabel, longTextSchema, mobileSchema, personNameSchema } from "@dd/shared/domain";
import { newPasswordSchema } from "@dd/shared/auth";
import { Router } from "express";
import * as z from "zod";
import { env } from "../../config/env";
import { addDays, dbDate, istDayStart, istTime, istWeekday, shortDate, todayIst, ymd } from "../../lib/dates";
import { db } from "../../lib/db";
import { badRequest, conflict, notFound } from "../../lib/errors";
import { hashPassword, verifyPassword } from "../../lib/crypto";
import { parseFormat, sendTable } from "../../lib/export";
import { actor, adminOnly, portalUser } from "../../middleware/auth";
import { parseBody, parseQuery, zDate, zId } from "../../middleware/validate";
import { audit } from "../../services/audit";
import { sendEmail } from "../../services/email";
import { passwordChangedEmail } from "../../services/email/templates";
import { saveSettings, settingsSchema, getSettings } from "../../services/settings";
import { staffClasses } from "../../services/scope";
import { revokeAllSessions } from "../auth/sessions";
import { leaveDays } from "../approvals/enrolment";

// ───────────────────────────── Audit log (admin, read-only) ─────────────────────────────
export const auditRouter = Router();
auditRouter.use(adminOnly);

const auditQuery = z.object({
  area: z.union([z.enum(AUDIT_AREAS), z.literal("")]).optional(),
  q: z.string().trim().max(100).optional(),
  from: zDate.default(() => addDays(todayIst(), -6)),
  to: zDate.default(() => todayIst()),
  before: z.iso.datetime().optional(),
  format: z.string().optional(),
});

function auditWhere(q: z.infer<typeof auditQuery>): Prisma.AuditLogWhereInput {
  return {
    createdAt: { gte: istDayStart(q.from), lt: istDayStart(addDays(q.to, 1)), ...(q.before ? { lt: new Date(q.before) } : {}) },
    ...(q.area ? { area: q.area } : {}),
    ...(q.q ? { OR: [{ summary: { contains: q.q, mode: "insensitive" } }, { actorName: { contains: q.q, mode: "insensitive" } }] } : {}),
  };
}

const browser = (ua: string | null) => {
  if (!ua) return null;
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  if (/Dart|okhttp|Flutter/i.test(ua)) return "App";
  return "Browser";
};
/** 49.37.12.8 → 49.37.x.x */
const maskIp = (ip: string | null) => (ip ? (ip.includes(".") ? ip.split(".").slice(0, 2).join(".") + ".x.x" : ip.split(":").slice(0, 3).join(":") + ":…") : null);

auditRouter.get("/", async (req, res) => {
  const q = parseQuery(auditQuery, req.query);
  const rows = await db().auditLog.findMany({ where: auditWhere(q), orderBy: { createdAt: "desc" }, take: 41 });
  const more = rows.length > 40;
  const today = todayIst();
  const yesterday = addDays(today, -1);
  const days = new Map<string, unknown[]>();
  for (const r of rows.slice(0, 40)) {
    const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(r.createdAt);
    const label = `${d === today ? "Today" : d === yesterday ? "Yesterday" : new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" }).format(r.createdAt)} · ${shortDate(r.createdAt)}`;
    if (!days.has(label)) days.set(label, []);
    days.get(label)!.push({
      id: r.id,
      actorName: r.actorName,
      actorRole: r.actorRole,
      summary: r.summary,
      area: r.area,
      areaLabel: auditAreaLabel[r.area],
      fromLabel: r.fromLabel,
      toLabel: r.toLabel,
      time: istTime(r.createdAt),
      client: [browser(r.userAgent), maskIp(r.ipAddress)].filter(Boolean).join(" · ") || null,
      before: r.before,
      after: r.after,
    });
  }

  // Week panel (Mon–Sun of the current week), by area and most active (in the selected range).
  const weekStart = addDays(today, -((istWeekday() + 6) % 7));
  const week = await db().auditLog.findMany({ where: { createdAt: { gte: istDayStart(weekStart), lt: istDayStart(addDays(weekStart, 7)) } }, select: { createdAt: true } });
  const perDay = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { label: "MTWTFSS"[i]!, count: week.filter((w) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(w.createdAt) === d).length, weekend: i >= 5 };
  });
  const rangeWhere = auditWhere({ ...q, before: undefined, area: "", q: undefined });
  const [byArea, byActor] = await Promise.all([
    db().auditLog.groupBy({ by: ["area"], where: rangeWhere, _count: { _all: true }, orderBy: { _count: { area: "desc" } } }),
    db().auditLog.groupBy({ by: ["actorName", "actorRole"], where: rangeWhere, _count: { _all: true }, orderBy: { _count: { actorName: "desc" } }, take: 4 }),
  ]);
  res.json({
    days: [...days.entries()].map(([label, items]) => ({ label, items })),
    next: more ? rows[39]!.createdAt.toISOString() : null,
    week: { total: week.length, perDay },
    byArea: byArea.map((a) => ({ area: a.area, label: auditAreaLabel[a.area], count: a._count._all })),
    mostActive: byActor.map((a) => ({ name: a.actorName, role: a.actorRole, count: a._count._all })),
  });
});

auditRouter.get("/export", async (req, res) => {
  const q = parseQuery(auditQuery, req.query);
  const rows = await db().auditLog.findMany({ where: auditWhere(q), orderBy: { createdAt: "desc" }, take: 50_000 });
  sendTable(res, parseFormat(q.format), `audit-log-${q.from}-to-${q.to}`, [
    { header: "Time (UTC)", value: (r) => r.createdAt.toISOString() },
    { header: "Who", value: (r) => r.actorName },
    { header: "Role", value: (r) => r.actorRole },
    { header: "Area", value: (r) => auditAreaLabel[r.area] },
    { header: "What", value: (r) => r.summary },
    { header: "From", value: (r) => r.fromLabel },
    { header: "To", value: (r) => r.toLabel },
    { header: "Before", value: (r) => (r.before ? JSON.stringify(r.before) : "") },
    { header: "After", value: (r) => (r.after ? JSON.stringify(r.after) : "") },
    { header: "IP", value: (r) => maskIp(r.ipAddress) },
  ], rows);
});

// ───────────────────────────── Settings (admin) ─────────────────────────────
export const settingsRouter = Router();
settingsRouter.use(adminOnly);

settingsRouter.get("/", async (_req, res) => res.json({ settings: await getSettings() }));
settingsRouter.put("/", async (req, res) => {
  const patch = parseBody(settingsSchema.partial().strict(), req.body);
  const before = await getSettings();
  const after = await saveSettings(patch, actor(req).id);
  const changed = Object.keys(patch).filter((k) => JSON.stringify((before as Record<string, unknown>)[k]) !== JSON.stringify((after as Record<string, unknown>)[k]));
  if (changed.length)
    await audit(req, {
      area: "SETTINGS",
      action: "settings.update",
      summary: `changed settings (${changed.join(", ")})`,
      before: Object.fromEntries(changed.map((k) => [k, (before as Record<string, unknown>)[k]])),
      after: Object.fromEntries(changed.map((k) => [k, (after as Record<string, unknown>)[k]])),
    });
  res.json({ settings: after });
});

// ───────────────────────────── My profile (admin + staff) ─────────────────────────────
export const profileRouter = Router();
profileRouter.use(portalUser);

profileRouter.get("/", async (req, res) => {
  const a = actor(req);
  const u = await db().user.findUniqueOrThrow({ where: { id: a.id } });
  const monthStart = new Date(`${todayIst().slice(0, 7)}-01T00:00:00+05:30`);
  const todayStart = istDayStart(todayIst());
  const signIn = await db().authEvent.findFirst({ where: { userId: a.id, type: "LOGIN_SUCCEEDED", createdAt: { gte: todayStart } }, orderBy: { createdAt: "asc" } });
  let stats: { label: string; value: string }[];
  if (a.isAdmin) {
    const [approvals, payments] = await Promise.all([
      db().auditLog.count({ where: { actorId: a.id, area: "APPROVALS", createdAt: { gte: monthStart } } }),
      db().payment.count({ where: { reviewedById: a.id, status: "VERIFIED" } }),
    ]);
    stats = [
      { label: "approvals this month", value: String(approvals) },
      { label: "payments verified", value: String(payments) },
      { label: "signed in today", value: signIn ? istTime(signIn.createdAt) : "—" },
    ];
  } else {
    const classes = await staffClasses(a.id);
    const leave = await db().leaveRequest.findMany({ where: { staffId: a.id, status: "APPROVED" }, select: { fromDate: true, toDate: true } });
    stats = [
      { label: "Classes", value: String(classes.length) },
      { label: "Students", value: String(classes.reduce((t, c) => t + c.studentCount, 0)) },
      { label: "Leave Days", value: String(leave.reduce((t, l) => t + leaveDays(l.fromDate, l.toDate), 0)) },
    ];
  }
  const classes = a.isAdmin ? [] : await staffClasses(a.id);
  const grades = [...new Set(classes.map((c) => c.grade))];
  res.json({
    profile: {
      id: u.id,
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      designation: u.designation ?? (a.isAdmin ? (u.isMainAdmin ? "Founder & Director" : "Admin") : "Teacher"),
      subject: u.subject,
      staffCode: u.staffCode,
      role: u.role,
      isMainAdmin: u.isMainAdmin,
      avatarFileId: u.avatarFileId,
      joinedAt: u.createdAt,
      preferences: (u.preferences ?? {}) as Record<string, boolean>,
      appearsAs: a.isAdmin ? `Sent by ${u.name.split(" ")[0]}${u.name.split(" ")[1] ? ` ${u.name.split(" ")[1]![0]}.` : ""} (Admin)` : null,
      // No honorific is added: titles (Ms./Mr.) aren't stored, so they're never guessed from a name.
      parentLabel: a.isAdmin ? null : `${u.name.split(" ")[0]} · ${u.subject ?? "Teacher"}`,
      grades,
      classesLabel: a.isAdmin ? null : classes.length ? `Grade ${[...new Set(classes.map((c) => c.grade.replace("GRADE_", "")))].join(", ")} · ${[...new Set(classes.map((c) => c.subject || c.courseName))].join(", ")}` : "No classes assigned yet",
    },
    stats,
  });
});

const profileBody = z
  .object({ name: personNameSchema, mobile: mobileSchema.or(z.literal("")), designation: z.string().trim().max(100), avatarFileId: zId.nullable() })
  .partial()
  .strict();

profileRouter.patch("/", async (req, res) => {
  const a = actor(req);
  const body = parseBody(profileBody, req.body);
  if (body.designation !== undefined && !a.isAdmin) throw badRequest("Your designation is set by admin.");
  if (body.avatarFileId) {
    const f = await db().storedFile.findUnique({ where: { id: body.avatarFileId } });
    if (!f || f.purpose !== "AVATAR" || f.uploadedById !== a.id) throw notFound("That photo");
  }
  await db().user.update({ where: { id: a.id }, data: { ...body, mobile: body.mobile === "" ? null : body.mobile } });
  await audit(req, { area: "ACCOUNT", action: "profile.update", summary: "updated their profile", entityType: "User", entityId: a.id, after: { ...body } });
  res.json({ ok: true });
});

profileRouter.put("/preferences", async (req, res) => {
  const a = actor(req);
  const prefs = parseBody(z.record(z.string().max(40), z.boolean()).refine((o) => Object.keys(o).length <= 20), req.body);
  await db().user.update({ where: { id: a.id }, data: { preferences: prefs } });
  res.json({ ok: true });
});

const passwordBody = z.object({ currentPassword: z.string().min(1).max(128), newPassword: newPasswordSchema }).strict();

profileRouter.post("/password", async (req, res) => {
  const a = actor(req);
  const body = parseBody(passwordBody, req.body);
  const u = await db().user.findUniqueOrThrow({ where: { id: a.id }, include: { passwordHistory: { orderBy: { createdAt: "desc" }, take: env().PASSWORD_HISTORY_COUNT } } });
  if (!u.passwordHash || !(await verifyPassword(u.passwordHash, body.currentPassword))) throw badRequest("Your current password is incorrect.", { currentPassword: "Incorrect password." });
  for (const old of [u.passwordHash, ...u.passwordHistory.map((h) => h.passwordHash)])
    if (await verifyPassword(old, body.newPassword)) throw conflict("Choose a password you haven't used recently.", { fields: { newPassword: "Used recently." } });
  const hash = await hashPassword(body.newPassword);
  await db().$transaction([
    db().passwordHistory.create({ data: { userId: a.id, passwordHash: u.passwordHash } }),
    db().user.update({ where: { id: a.id }, data: { passwordHash: hash, passwordChangedAt: new Date() } }),
  ]);
  await revokeAllSessions(a.id, "PASSWORD_CHANGED", req.auth!.session.id);
  void sendEmail(passwordChangedEmail({ to: u.email, name: u.name, at: new Date(), activated: false, signInUrl: `${env().PORTAL_URL}/login/${a.isAdmin ? "admin" : "staff"}` }));
  await audit(req, { area: "ACCOUNT", action: "profile.password", summary: "changed their password", entityType: "User", entityId: a.id });
  res.json({ ok: true });
});

/** Sessions on other devices (Security tab). */
profileRouter.get("/sessions", async (req, res) => {
  const a = actor(req);
  const rows = await db().session.findMany({ where: { userId: a.id, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" }, take: 10 });
  res.json({
    rows: rows.map((s) => ({ id: s.id, current: s.id === req.auth!.session.id, browser: browser(s.userAgent), ip: maskIp(s.ipAddress), lastSeen: `${shortDate(s.lastSeenAt)}, ${istTime(s.lastSeenAt)}` })),
  });
});
profileRouter.post("/sessions/revoke-others", async (req, res) => {
  const a = actor(req);
  await revokeAllSessions(a.id, "REVOKED_BY_ADMIN", req.auth!.session.id);
  res.json({ ok: true });
});

export { dbDate, longTextSchema, ymd };
