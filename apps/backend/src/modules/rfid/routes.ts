import type { AttendanceSession, RfidScanResult } from "@dd/db";
import { gradeLabel, hasTwoSessions, sessionsForGrade } from "@dd/shared/domain";
import express, { Router, type Request } from "express";
import { randomBytes } from "node:crypto";
import * as z from "zod";
import { addDays, dbDate, hhmmToMinutes, istDayStart, istMinutes, istTime, todayIst, ymd } from "../../lib/dates";
import { db } from "../../lib/db";
import { API_ERRORS, conflict, HttpError, notFound } from "../../lib/errors";
import { sha256 } from "../../lib/crypto";
import { parseFormat, sendTable } from "../../lib/export";
import { actor, adminOnly } from "../../middleware/auth";
import { idParam, parseBody, parseQuery, zDate, zId } from "../../middleware/validate";
import { audit } from "../../services/audit";
import { notifyAdmins } from "../../services/notify";
import { getSettings, type Settings } from "../../services/settings";
import { zOptionalId } from "../common";

/**
 * Availo RFID (scope §6). Devices post taps to /v1/rfid/device/* with X-Device-Key.
 * Each tap: card → cardholder (our own mapping), date + time + card + device recorded;
 * repeat taps inside the dedupe window are ignored; unknown / disabled cards go to the review
 * list; a valid student tap marks Present (Late after the cut-off) for the right session.
 * NOTE: the device model, firmware and protocol must be verified before this is final.
 */

/** "04a37f12" / "04:A3:7F:12" / "04-a3-7f-12" → "04:A3:7F:12". */
export function normaliseUid(raw: string): string | null {
  const hex = raw.replace(/[^0-9a-f]/gi, "").toUpperCase();
  if (hex.length < 4 || hex.length > 20 || hex.length % 2) return null;
  return hex.match(/../g)!.join(":");
}

const istYmd = (at: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(at);

function sessionFor(grade: Parameters<typeof hasTwoSessions>[0], at: Date, s: Settings): AttendanceSession {
  if (!hasTwoSessions(grade)) return "DAY";
  return istMinutes(at) < hhmmToMinutes(s.sessionSplit) ? "MORNING" : "EVENING";
}

function isLate(session: AttendanceSession, at: Date, s: Settings) {
  const cutoff = session === "MORNING" ? s.lateAfterMorning : session === "EVENING" ? s.lateAfterEvening : s.lateAfterDay;
  return istMinutes(at) > hhmmToMinutes(cutoff);
}

/** Records one tap and applies it to attendance. Returns the result shown on the live feed. */
export async function processTap(deviceId: string | null, uidRaw: string, at: Date) {
  const s = await getSettings();
  const cardUid = normaliseUid(uidRaw);
  if (!cardUid) throw new HttpError(400, "VALIDATION_ERROR", "Invalid card id.");
  const card = await db().rfidCard.findFirst({ where: { uid: cardUid, status: "ACTIVE" }, include: { student: true } });
  const save = (result: RfidScanResult, extra: { studentId?: string; staffId?: string; session?: AttendanceSession } = {}) =>
    db().rfidScan.create({ data: { deviceId, cardUid, scannedAt: at, result, ...extra } });

  if (deviceId) await db().rfidDevice.update({ where: { id: deviceId }, data: { lastTapAt: at, lastHeartbeatAt: new Date() } });

  if (!card) {
    const old = await db().rfidCard.findFirst({ where: { uid: cardUid } });
    const scan = await save(old ? "DISABLED_CARD" : "UNKNOWN");
    return { result: scan.result };
  }
  if (card.staffId) {
    await save("STAFF", { staffId: card.staffId });
    return { result: "STAFF" as const };
  }
  const st = card.student!;
  const session = sessionFor(st.grade, at, s);
  const windowStart = new Date(at.getTime() - s.rfidDedupeMinutes * 60_000);
  const recent = await db().rfidScan.findFirst({ where: { cardUid, scannedAt: { gte: windowStart, lte: at }, result: { in: ["PRESENT", "LATE", "REPEAT"] } } });
  const date = dbDate(istYmd(at));
  const existing = await db().attendanceRecord.findUnique({ where: { studentId_date_session: { studentId: st.id, date, session } } });
  if (recent || existing?.status === "PRESENT") {
    await save("REPEAT", { studentId: st.id, session });
    return { result: "REPEAT" as const, student: st.name };
  }
  const late = isLate(session, at, s);
  await db().attendanceRecord.upsert({
    where: { studentId_date_session: { studentId: st.id, date, session } },
    create: { studentId: st.id, date, session, status: "PRESENT", source: "RFID", rfidAt: at, late },
    update: { status: "PRESENT", source: "RFID", rfidAt: at, late },
  });
  await save(late ? "LATE" : "PRESENT", { studentId: st.id, session });
  return { result: late ? ("LATE" as const) : ("PRESENT" as const), student: st.name };
}

// ── Device endpoints ──
export const rfidDeviceRouter = Router();

async function deviceFromKey(req: Request) {
  const key = req.get("x-device-key");
  if (!key || key.length < 20) throw new HttpError(401, API_ERRORS.DEVICE_UNAUTHORIZED, "Unknown device.");
  const device = await db().rfidDevice.findUnique({ where: { keyHash: sha256(key) } });
  if (!device || device.disabledAt) throw new HttpError(401, API_ERRORS.DEVICE_UNAUTHORIZED, "Unknown device.");
  return device;
}

const scanBody = z
  .object({
    scans: z
      .array(z.object({ cardUid: z.string().min(4).max(40), scannedAt: z.iso.datetime({ offset: true }).optional() }).strict())
      .min(1)
      .max(200),
  })
  .strict();

/** Taps (batched so a reader can flush its buffer after being offline). */
rfidDeviceRouter.post("/scans", express.json({ limit: "64kb" }), async (req, res) => {
  const device = await deviceFromKey(req);
  const { scans } = parseBody(scanBody, req.body);
  const out = [];
  for (const sc of scans) {
    const at = sc.scannedAt ? new Date(sc.scannedAt) : new Date();
    // Ignore clock-skewed taps from the future or older than 7 days.
    if (at.getTime() > Date.now() + 5 * 60_000 || at.getTime() < Date.now() - 7 * 86_400_000) {
      out.push({ cardUid: sc.cardUid, result: "REJECTED_TIME" });
      continue;
    }
    out.push({ cardUid: sc.cardUid, ...(await processTap(device.id, sc.cardUid, at)) });
  }
  res.json({ results: out });
});

rfidDeviceRouter.post("/heartbeat", async (req, res) => {
  const device = await deviceFromKey(req);
  const wasOffline = !device.lastHeartbeatAt || Date.now() - device.lastHeartbeatAt.getTime() > (await getSettings()).rfidOfflineMinutes * 60_000;
  await db().rfidDevice.update({ where: { id: device.id }, data: { lastHeartbeatAt: new Date() } });
  res.json({ ok: true, serverTime: new Date().toISOString(), back: wasOffline });
});

// ── Admin ──
export const rfidRouter = Router();
rfidRouter.use(adminOnly);

const cardSuffix = (uid: string) => `…${uid.replace(/:/g, "").slice(-4)}`;

rfidRouter.get("/overview", async (req, res) => {
  const { session } = parseQuery(z.object({ session: z.enum(["MORNING", "EVENING"]).optional() }), req.query);
  const s = await getSettings();
  const today = todayIst();
  const start = istDayStart(today);
  const end = istDayStart(addDays(today, 1));
  const split = hhmmToMinutes(s.sessionSplit);
  const nowMin = istMinutes();
  const liveSession = session ?? (nowMin < split ? "MORNING" : "EVENING");

  const [scans, devices, students, unknown, staffCount] = await Promise.all([
    db().rfidScan.findMany({ where: { scannedAt: { gte: start, lt: end } }, orderBy: { scannedAt: "desc" }, include: { student: { select: { name: true, grade: true } }, device: { select: { name: true } } } }),
    db().rfidDevice.findMany({ where: { disabledAt: null }, orderBy: { createdAt: "asc" } }),
    db().student.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, grade: true, rfidCards: { where: { status: "ACTIVE" }, select: { id: true } } }, orderBy: { name: "asc" } }),
    db().rfidScan.findMany({ where: { result: "UNKNOWN", resolvedAt: null }, orderBy: { scannedAt: "desc" }, include: { device: { select: { name: true } } }, take: 200 }),
    db().user.count({ where: { role: "STAFF", rfidCards: { some: { status: "ACTIVE" } } } }),
  ]);
  const checkins = scans.filter((x) => x.result === "PRESENT" || x.result === "LATE");
  const inMorning = (x: { scannedAt: Date }) => istMinutes(x.scannedAt) < split;
  const withCard = students.filter((x) => x.rfidCards.length);
  const expected = withCard.reduce((t, x) => t + sessionsForGrade(x.grade).length, 0);

  const buckets = (from: string, to: string) => {
    const out = [];
    for (let m = hhmmToMinutes(from); m < hhmmToMinutes(to); m += 30) {
      const label = `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")}`;
      out.push({ label, count: checkins.filter((x) => istMinutes(x.scannedAt) >= m && istMinutes(x.scannedAt) < m + 30).length });
    }
    return out;
  };
  const morningBuckets = buckets(s.morningStart, s.morningEnd);
  const eveningBuckets = buckets(s.eveningStart, s.eveningEnd);
  const peak = (b: { label: string; count: number }[], ampm: string) => {
    const top = [...b].sort((x, y) => y.count - x.count)[0];
    return top && top.count ? `${top.label} ${ampm}` : null;
  };

  const offlineMs = s.rfidOfflineMinutes * 60_000;
  const unknownByCard = new Map<string, (typeof unknown)[number]>();
  for (const u of unknown) if (!unknownByCard.has(u.cardUid)) unknownByCard.set(u.cardUid, u);

  res.json({
    checkIns: {
      total: checkins.length,
      expected,
      morning: checkins.filter(inMorning).length,
      evening: checkins.filter((x) => !inMorning(x)).length,
      repeats: scans.filter((x) => x.result === "REPEAT").length,
    },
    histogram: { morning: morningBuckets, evening: eveningBuckets, peak: [peak(morningBuckets, "AM"), peak(eveningBuckets, "PM")].filter(Boolean).join(" and ") || null },
    devices: devices.map((d) => {
      const online = !!d.lastHeartbeatAt && Date.now() - d.lastHeartbeatAt.getTime() <= offlineMs;
      const lastTapMin = d.lastTapAt ? Math.round((Date.now() - d.lastTapAt.getTime()) / 60_000) : null;
      return {
        id: d.id,
        name: d.name,
        location: d.location,
        online,
        tapsToday: scans.filter((x) => x.deviceId === d.id).length,
        lastTap: d.lastTapAt ? (ymd(d.lastTapAt) === today && lastTapMin !== null && lastTapMin < 60 ? `${Math.max(1, lastTapMin)} min ago` : `${istTime(d.lastTapAt)}${istYmd(d.lastTapAt) === today ? "" : " " + (istYmd(d.lastTapAt) === addDays(today, -1) ? "yesterday" : istYmd(d.lastTapAt))}`) : "never",
        lastHeartbeat: d.lastHeartbeatAt ? `${istTime(d.lastHeartbeatAt)}${istYmd(d.lastHeartbeatAt) === today ? "" : istYmd(d.lastHeartbeatAt) === addDays(today, -1) ? " yesterday" : ` ${istYmd(d.lastHeartbeatAt)}`}` : null,
        offlineSince: !online && d.lastHeartbeatAt ? istTime(d.lastHeartbeatAt) : null,
      };
    }),
    live: {
      session: liveSession,
      taps: scans
        .filter((x) => (liveSession === "MORNING" ? inMorning(x) : !inMorning(x)))
        .slice(0, 12)
        .map((x) => ({
          id: x.id,
          time: istTime(x.scannedAt),
          name: x.student?.name ?? (x.result === "STAFF" ? "Staff" : x.result === "DISABLED_CARD" ? "Disabled card" : "Unknown card"),
          detail: x.student ? `${gradeLabel(x.student.grade)} · card ${cardSuffix(x.cardUid)}` : `Not linked · card ${cardSuffix(x.cardUid)}`,
          device: x.device?.name.replace(/ reader$/i, "").replace(/ desk$/i, "") ?? "—",
          result: x.result,
        })),
    },
    unknownCards: [...unknownByCard.values()].map((u) => ({ uid: u.cardUid, at: istTime(u.scannedAt), device: u.device?.name.replace(/ reader$/i, "") ?? "—" })),
    coverage: {
      withCard: withCard.length,
      total: students.length,
      staffWithCard: staffCount,
      missing: students.filter((x) => !x.rfidCards.length).slice(0, 12).map((x) => ({ id: x.id, name: x.name, grade: gradeLabel(x.grade).replace("Grade ", "Gr ") })),
      missingCount: students.length - withCard.length,
    },
  });
});

rfidRouter.get("/cards", async (req, res) => {
  const { q } = parseQuery(z.object({ q: z.string().trim().max(60).optional() }), req.query);
  const cards = await db().rfidCard.findMany({
    where: q ? { OR: [{ uid: { contains: q.toUpperCase() } }, { student: { name: { contains: q, mode: "insensitive" } } }, { staff: { name: { contains: q, mode: "insensitive" } } }] } : {},
    orderBy: { assignedAt: "desc" },
    take: 100,
    include: { student: { select: { name: true, grade: true } }, staff: { select: { name: true } } },
  });
  res.json({
    rows: cards.map((c) => ({ id: c.id, uid: c.uid, status: c.status, holder: c.student?.name ?? c.staff?.name ?? "—", detail: c.student ? gradeLabel(c.student.grade) : "Staff", assignedAt: c.assignedAt })),
  });
});

const assignBody = z.object({ uid: z.string().min(4).max(40), studentId: zOptionalId, staffId: zOptionalId }).strict();

/** Assign (or replace) a card. Today's unmatched taps of this card are applied to attendance. */
rfidRouter.post("/cards", async (req, res) => {
  const a = actor(req);
  const body = parseBody(assignBody, req.body);
  const uid = normaliseUid(body.uid);
  if (!uid) throw new HttpError(400, "VALIDATION_ERROR", "Enter the card id as hex, e.g. 04:A3:7F:12.", { fields: { uid: "Invalid card id." } });
  if (!!body.studentId === !!body.staffId) throw new HttpError(400, "VALIDATION_ERROR", "Choose one student or one staff member.");
  const taken = await db().rfidCard.findFirst({ where: { uid, status: "ACTIVE" }, include: { student: true, staff: true } });
  if (taken) throw conflict(`This card is already assigned to ${taken.student?.name ?? taken.staff?.name}. Disable it first.`);
  const holder = body.studentId
    ? await db().student.findUnique({ where: { id: body.studentId }, select: { name: true } })
    : await db().user.findFirst({ where: { id: body.staffId!, role: { in: ["STAFF", "ADMIN"] } }, select: { name: true } });
  if (!holder) throw notFound(body.studentId ? "That student" : "That staff member");
  const replaced = await db().rfidCard.updateMany({
    where: { status: "ACTIVE", ...(body.studentId ? { studentId: body.studentId } : { staffId: body.staffId }) },
    data: { status: "REPLACED", disabledAt: new Date() },
  });
  const card = await db().rfidCard.create({ data: { uid, studentId: body.studentId ?? null, staffId: body.staffId ?? null } });
  // Apply today's unmatched taps for this card, then clear them from the review list.
  const pending = await db().rfidScan.findMany({ where: { cardUid: uid, result: "UNKNOWN", resolvedAt: null }, orderBy: { scannedAt: "asc" } });
  let applied = 0;
  for (const p of pending) {
    if (istYmd(p.scannedAt) === todayIst()) {
      await processTap(p.deviceId, uid, p.scannedAt);
      applied++;
    }
  }
  await db().rfidScan.updateMany({ where: { cardUid: uid, result: "UNKNOWN", resolvedAt: null }, data: { resolvedAt: new Date(), resolvedById: a.id } });
  await audit(req, {
    area: "RFID",
    action: replaced.count ? "rfid.replace" : "rfid.assign",
    summary: `${replaced.count ? "replaced the card of" : "assigned card " + uid + " to"} ${holder.name}${replaced.count ? ` with ${uid}` : ""}`,
    entityType: "RfidCard",
    entityId: card.id,
    fromLabel: replaced.count ? "Old card" : null,
    toLabel: uid,
  });
  res.status(201).json({ id: card.id, uid, applied });
});

rfidRouter.post("/cards/:id/disable", async (req, res) => {
  const c = await db().rfidCard.findUnique({ where: { id: idParam(req.params.id, "That card") }, include: { student: true, staff: true } });
  if (!c || c.status !== "ACTIVE") throw notFound("That active card");
  await db().rfidCard.update({ where: { id: c.id }, data: { status: "DISABLED", disabledAt: new Date() } });
  await audit(req, { area: "RFID", action: "rfid.disable", summary: `disabled card ${c.uid} (${c.student?.name ?? c.staff?.name ?? "—"})`, entityType: "RfidCard", entityId: c.id, fromLabel: "Active", toLabel: "Disabled" });
  res.json({ ok: true });
});

rfidRouter.post("/unknown/dismiss", async (req, res) => {
  const a = actor(req);
  const { uid } = parseBody(z.object({ uid: z.string().min(4).max(40) }).strict(), req.body);
  const norm = normaliseUid(uid);
  if (!norm) throw notFound("That card");
  const r = await db().rfidScan.updateMany({ where: { cardUid: norm, result: "UNKNOWN", resolvedAt: null }, data: { resolvedAt: new Date(), resolvedById: a.id } });
  await audit(req, { area: "RFID", action: "rfid.dismiss", summary: `dismissed unknown card ${norm}`, entityType: "RfidCard", entityId: norm });
  res.json({ dismissed: r.count });
});

/** Manual tap (office desk fallback / testing): same rules as a device tap. */
rfidRouter.post("/manual-tap", async (req, res) => {
  const { uid } = parseBody(z.object({ uid: z.string().min(4).max(40) }).strict(), req.body);
  const r = await processTap(null, uid, new Date());
  await audit(req, { area: "RFID", action: "rfid.manual_tap", summary: `recorded a manual tap for card ${normaliseUid(uid)}`, entityType: "RfidScan", toLabel: r.result });
  res.json(r);
});

// Devices
rfidRouter.get("/devices", async (_req, res) => {
  const rows = await db().rfidDevice.findMany({ orderBy: { createdAt: "asc" } });
  res.json({ rows: rows.map((d) => ({ id: d.id, name: d.name, location: d.location, lastHeartbeatAt: d.lastHeartbeatAt, lastTapAt: d.lastTapAt, disabled: !!d.disabledAt })) });
});

rfidRouter.post("/devices", async (req, res) => {
  const body = parseBody(z.object({ name: z.string().trim().min(1).max(60), location: z.string().trim().max(100).default("") }).strict(), req.body);
  const key = `rfid_${randomBytes(24).toString("base64url")}`;
  const d = await db().rfidDevice.create({ data: { name: body.name, location: body.location || null, keyHash: sha256(key) } });
  await audit(req, { area: "RFID", action: "rfid.device_create", summary: `added the reader "${d.name}"`, entityType: "RfidDevice", entityId: d.id });
  res.status(201).json({ id: d.id, key }); // shown once
});

rfidRouter.post("/devices/:id/rotate-key", async (req, res) => {
  const id = idParam(req.params.id, "That reader");
  const key = `rfid_${randomBytes(24).toString("base64url")}`;
  const d = await db().rfidDevice.update({ where: { id }, data: { keyHash: sha256(key) } }).catch(() => null);
  if (!d) throw notFound("That reader");
  await audit(req, { area: "RFID", action: "rfid.device_key", summary: `issued a new key for "${d.name}"`, entityType: "RfidDevice", entityId: d.id });
  res.json({ key });
});

rfidRouter.post("/devices/:id/disable", async (req, res) => {
  const id = idParam(req.params.id, "That reader");
  const { disabled } = parseBody(z.object({ disabled: z.boolean() }).strict(), req.body);
  const d = await db().rfidDevice.update({ where: { id }, data: { disabledAt: disabled ? new Date() : null } }).catch(() => null);
  if (!d) throw notFound("That reader");
  await audit(req, { area: "RFID", action: disabled ? "rfid.device_disable" : "rfid.device_enable", summary: `${disabled ? "disabled" : "enabled"} the reader "${d.name}"`, entityType: "RfidDevice", entityId: d.id });
  res.json({ ok: true });
});

rfidRouter.get("/scans/export", async (req, res) => {
  const q = parseQuery(z.object({ from: zDate.default(() => todayIst()), to: zDate.default(() => todayIst()), format: z.string().optional() }), req.query);
  const rows = await db().rfidScan.findMany({
    where: { scannedAt: { gte: istDayStart(q.from), lt: istDayStart(addDays(q.to, 1)) } },
    orderBy: { scannedAt: "asc" },
    take: 50_000,
    include: { student: { select: { name: true, code: true, grade: true } }, device: { select: { name: true } } },
  });
  sendTable(res, parseFormat(q.format), `rfid-scans-${q.from}-to-${q.to}`, [
    { header: "Date", value: (x) => istYmd(x.scannedAt) },
    { header: "Time", value: (x) => istTime(x.scannedAt) },
    { header: "Card", value: (x) => x.cardUid },
    { header: "Device", value: (x) => x.device?.name ?? "Manual" },
    { header: "Student", value: (x) => x.student?.name ?? "" },
    { header: "Admission no.", value: (x) => x.student?.code ?? "" },
    { header: "Grade", value: (x) => (x.student ? gradeLabel(x.student.grade) : "") },
    { header: "Session", value: (x) => x.session ?? "" },
    { header: "Result", value: (x) => x.result },
  ], rows);
});

/** Alerts admins when a reader goes quiet (called by the scheduler). */
export async function checkDevices() {
  const s = await getSettings();
  const cutoff = new Date(Date.now() - s.rfidOfflineMinutes * 60_000);
  const offline = await db().rfidDevice.findMany({ where: { disabledAt: null, lastHeartbeatAt: { lt: cutoff } } });
  for (const d of offline) {
    const key = `rfid-offline:${d.id}:${d.lastHeartbeatAt!.toISOString()}`;
    const done = await db().jobRun.findUnique({ where: { key } });
    if (done) continue;
    await db().jobRun.create({ data: { key } });
    await notifyAdmins({
      category: "SYSTEM",
      title: "RFID device offline",
      body: `${d.name} stopped sending scans at ${istTime(d.lastHeartbeatAt!)}.`,
      actionLabel: "Check",
      href: "/admin/rfid",
    });
  }
}

export { zId };
