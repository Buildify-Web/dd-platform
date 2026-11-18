import { istDate } from "@dd/shared/domain";

/**
 * Calendar helpers. The institute runs on India time (UTC+5:30, no DST). Calendar days are
 * stored as Postgres DATE, which Prisma maps to a UTC-midnight Date: always convert through
 * these helpers, never with local-time arithmetic.
 */
const IST_OFFSET_MIN = 330;
const DAY = 86_400_000;

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "2026-11-06" → Date at 00:00 UTC (what a @db.Date column stores). */
export const dbDate = (ymdStr: string) => new Date(`${ymdStr}T00:00:00.000Z`);

/** @db.Date value → "2026-11-06". */
export const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Today in India as "YYYY-MM-DD". */
export const todayIst = () => istDate();

export const addDays = (ymdStr: string, n: number) => ymd(new Date(dbDate(ymdStr).getTime() + n * DAY));

/** Minutes since midnight, India time, for an instant. */
export function istMinutes(at = new Date()) {
  const m = Math.floor((at.getTime() / 60_000 + IST_OFFSET_MIN) % 1440);
  return m < 0 ? m + 1440 : m;
}

/** "08:15" → 495. */
export const hhmmToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** IST weekday (0 = Sunday). */
export const istWeekday = (at = new Date()) => new Date(at.getTime() + IST_OFFSET_MIN * 60_000).getUTCDay();

/** The instant of IST midnight that starts the given day. */
export const istDayStart = (ymdStr: string) => new Date(dbDate(ymdStr).getTime() - IST_OFFSET_MIN * 60_000);

/** The instant at IST "HH:MM" on the given day. */
export const istInstant = (ymdStr: string, hhmm: string) => new Date(istDayStart(ymdStr).getTime() + hhmmToMinutes(hhmm) * 60_000);

/** First and last day ("YYYY-MM-DD") of a "YYYY-MM" month. */
export function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y!, m! - 1, 1));
  const last = new Date(Date.UTC(y!, m!, 0));
  return { from: ymd(first), to: ymd(last), days: last.getUTCDate() };
}

export const prevMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 2, 1)).toISOString().slice(0, 7);
};

/** Inclusive list of days between two "YYYY-MM-DD" values (max 400). */
export function daysBetween(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 400; d = addDays(d, 1)) out.push(d);
  return out;
}

/** "9:12 AM" in India time. */
export const istTime = (at: Date) =>
  new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })
    .format(at)
    .toUpperCase();

/** "6 Nov" for a @db.Date or instant (India time). */
export const shortDate = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d);

/** Greeting by IST hour. */
export const greeting = (at = new Date()) => {
  const h = Math.floor(istMinutes(at) / 60);
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};
