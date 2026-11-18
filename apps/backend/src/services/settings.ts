import * as z from "zod";
import { db } from "../lib/db";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/**
 * Institute settings (System → Settings). Stored as one JSON row per key; missing keys use
 * these defaults, so a fresh database works without seeding.
 */
export const settingsSchema = z.object({
  instituteName: z.string().trim().min(1).max(100).default("Dynamic Donalds"),
  /** Teachers must mark attendance by this time; then a reminder goes to teacher + admin. */
  attendanceDeadline: time.default("10:30"),
  /** RFID: taps before this time belong to the morning session (Grade 9+). */
  sessionSplit: time.default("13:00"),
  morningStart: time.default("07:00"),
  morningEnd: time.default("09:30"),
  eveningStart: time.default("16:00"),
  eveningEnd: time.default("19:30"),
  /** Taps after these times are marked "Late" (still Present). */
  lateAfterMorning: time.default("08:15"),
  lateAfterEvening: time.default("16:45"),
  lateAfterDay: time.default("16:45"),
  /** Repeat taps of the same card within this many minutes are ignored. */
  rfidDedupeMinutes: z.coerce.number().int().min(1).max(240).default(10),
  /** A reader with no heartbeat for this long shows as offline. */
  rfidOfflineMinutes: z.coerce.number().int().min(2).max(240).default(5),
  /** Attendance below this % is flagged in reports. */
  attendanceThreshold: z.coerce.number().int().min(1).max(100).default(75),
  /** End-of-day homework report time. */
  homeworkReportTime: time.default("20:00"),
  /** Shown on the parent payment page. */
  upiId: z.string().trim().max(60).default(""),
  gpayNumber: z.string().trim().max(15).default(""),
  bankDetails: z.string().trim().max(300).default(""),
  feeReminders: z.boolean().default(true),
});
export type Settings = z.infer<typeof settingsSchema>;

let cache: { at: number; value: Settings } | undefined;

export async function getSettings(): Promise<Settings> {
  if (cache && Date.now() - cache.at < 30_000) return cache.value;
  const rows = await db().setting.findMany();
  const raw: Record<string, unknown> = {};
  for (const r of rows) raw[r.key] = r.value;
  const parsed = settingsSchema.safeParse(raw);
  const value = parsed.success ? parsed.data : settingsSchema.parse({});
  cache = { at: Date.now(), value };
  return value;
}

export async function saveSettings(patch: Partial<Settings>, userId: string) {
  await db().$transaction(
    Object.entries(patch).map(([key, value]) =>
      db().setting.upsert({ where: { key }, create: { key, value: value as never, updatedById: userId }, update: { value: value as never, updatedById: userId } }),
    ),
  );
  cache = undefined;
  return getSettings();
}
