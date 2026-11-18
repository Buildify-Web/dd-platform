import * as z from "zod";

/**
 * Domain rules shared by the backend and the webapp (scope §4–5). Change a rule here only,
 * so both sides validate identically. Labels are what the UI shows.
 */

// ───────────────────────────── Grades ─────────────────────────────

export const GRADES = [
  "PRE_KG",
  "LKG",
  "UKG",
  "GRADE_1",
  "GRADE_2",
  "GRADE_3",
  "GRADE_4",
  "GRADE_5",
  "GRADE_6",
  "GRADE_7",
  "GRADE_8",
  "GRADE_9",
  "GRADE_10",
  "GRADE_11",
  "GRADE_12",
] as const;
export type Grade = (typeof GRADES)[number];

/** Pre-KG = -2, LKG = -1, UKG = 0, Grade n = n. */
export const gradeNumber = (g: Grade): number => (g === "PRE_KG" ? -2 : g === "LKG" ? -1 : g === "UKG" ? 0 : Number(g.slice(6)));

export const gradeLabel = (g: Grade): string =>
  g === "PRE_KG" ? "Pre-KG" : g === "LKG" ? "LKG" : g === "UKG" ? "UKG" : `Grade ${g.slice(6)}`;

/** "Gr 9", "UKG": compact labels for charts and chips. */
export const gradeShort = (g: Grade): string => (g.startsWith("GRADE_") ? `Gr ${g.slice(6)}` : gradeLabel(g));

export const isGrade = (v: unknown): v is Grade => typeof v === "string" && (GRADES as readonly string[]).includes(v);

/**
 * Attendance sessions. Up to Grade 8 there is one entry per day; Grade 9+ has morning and
 * evening sessions (scope §5; Grade 8 is grouped with "below Grade 8": confirm with client).
 */
export const ATTENDANCE_SESSIONS = ["DAY", "MORNING", "EVENING"] as const;
export type AttendanceSession = (typeof ATTENDANCE_SESSIONS)[number];
export const hasTwoSessions = (g: Grade) => gradeNumber(g) >= 9;
export const sessionsForGrade = (g: Grade): AttendanceSession[] => (hasTwoSessions(g) ? ["MORNING", "EVENING"] : ["DAY"]);
export const sessionLabel = (s: AttendanceSession) => (s === "DAY" ? "Day" : s === "MORNING" ? "Morning" : "Evening");

/** Assignments exist only for Grades 9–12. */
export const assignmentsAllowed = (g: Grade) => gradeNumber(g) >= 9;

// ───────────────────────────── Course rules ─────────────────────────────

/**
 * Course categories, used to apply the grade rules in the scope:
 *  - PHONICS only for Pre-KG–Grade 2
 *  - TUITION / OLYMPIAD / SPELL_BEE for Pre-KG–Grade 8
 *  - SUBJECT (Maths & Science, Tamil, English, Social; 11–12 streams) for Grade 9–12
 */
export const COURSE_CATEGORIES = ["TUITION", "PHONICS", "OLYMPIAD", "SPELL_BEE", "SUBJECT", "OTHER"] as const;
export type CourseCategory = (typeof COURSE_CATEGORIES)[number];
export const courseCategoryLabel: Record<CourseCategory, string> = {
  TUITION: "Regular tuition",
  PHONICS: "Phonics",
  OLYMPIAD: "Olympiad",
  SPELL_BEE: "Spell Bee",
  SUBJECT: "Subject",
  OTHER: "Other",
};

/** Grades a course of this category may be offered to. */
export function gradesAllowedFor(category: CourseCategory): Grade[] {
  switch (category) {
    case "PHONICS":
      return GRADES.filter((g) => gradeNumber(g) <= 2);
    case "TUITION":
    case "OLYMPIAD":
    case "SPELL_BEE":
      return GRADES.filter((g) => gradeNumber(g) <= 8);
    case "SUBJECT":
      return GRADES.filter((g) => gradeNumber(g) >= 9);
    default:
      return [...GRADES];
  }
}

/** Grades 9–10: "Maths & Science" is mandatory and on by default. Matched by course name. */
export const MANDATORY_COURSE_NAME = "Maths & Science";
export const isMandatoryFor = (course: { name: string; isMandatory?: boolean }, g: Grade) =>
  (course.isMandatory ?? false) && (gradeNumber(g) === 9 || gradeNumber(g) === 10);

/** Parents may deregister from a course only on days 1–10 of the month. */
export const DEREGISTRATION_LAST_DAY = 10;

// ───────────────────────────── Enumerations ─────────────────────────────

export const SESSION_TYPES = ["OFFLINE", "ONLINE"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];
export const LEARNING_MODES = ["GROUP", "ONE_ON_ONE"] as const;
export type LearningMode = (typeof LEARNING_MODES)[number];
export const sessionTypeLabel = (s: SessionType) => (s === "ONLINE" ? "Online" : "Offline");
export const learningModeLabel = (m: LearningMode) => (m === "ONE_ON_ONE" ? "One-on-one" : "Group");
/** One-on-one forces Online and locks it. */
export const effectiveSessionType = (mode: LearningMode, type: SessionType): SessionType => (mode === "ONE_ON_ONE" ? "ONLINE" : type);

export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LEAVE", "NA"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export const attendanceStatusLabel: Record<AttendanceStatus, string> = { PRESENT: "Present", ABSENT: "Absent", LEAVE: "Leave", NA: "NA" };

export const FEE_STATUSES = ["PAID", "PARTIAL", "UNPAID"] as const;
export type FeeStatus = (typeof FEE_STATUSES)[number];
export const feeStatusLabel: Record<FeeStatus, string> = { PAID: "Paid completely", PARTIAL: "Paid partially", UNPAID: "Unpaid" };
export const feeStatusShort: Record<FeeStatus, string> = { PAID: "Paid", PARTIAL: "Partial", UNPAID: "Unpaid" };

export const PAYMENT_METHODS = ["CASH", "GPAY", "BANK_TRANSFER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const paymentMethodLabel: Record<PaymentMethod, string> = { CASH: "Cash at office", GPAY: "GPay", BANK_TRANSFER: "Bank transfer" };

export const AUDIT_AREAS = [
  "FEES",
  "APPROVALS",
  "ATTENDANCE",
  "MARKS",
  "COURSES",
  "PAPERS",
  "STAFF",
  "STUDENTS",
  "HOMEWORK",
  "ANNOUNCEMENTS",
  "RFID",
  "CONTENT",
  "SETTINGS",
  "ACCOUNT",
] as const;
export type AuditArea = (typeof AUDIT_AREAS)[number];
export const auditAreaLabel: Record<AuditArea, string> = {
  FEES: "Fees",
  APPROVALS: "Approvals",
  ATTENDANCE: "Attendance",
  MARKS: "Marks",
  COURSES: "Courses",
  PAPERS: "Papers",
  STAFF: "Staff",
  STUDENTS: "Students",
  HOMEWORK: "Homework",
  ANNOUNCEMENTS: "Announcements",
  RFID: "RFID",
  CONTENT: "Website",
  SETTINGS: "Settings",
  ACCOUNT: "Account",
};

export const GALLERY_ALBUMS = ["EVENTS", "COMPETITIONS", "CLASSROOM", "CAMPUS", "ACHIEVEMENTS", "CELEBRATIONS", "TEAM"] as const;
export type GalleryAlbum = (typeof GALLERY_ALBUMS)[number];
export const galleryAlbumLabel: Record<GalleryAlbum, string> = {
  EVENTS: "Events",
  COMPETITIONS: "Competitions",
  CLASSROOM: "Classroom",
  CAMPUS: "Campus",
  ACHIEVEMENTS: "Achievements",
  CELEBRATIONS: "Celebrations",
  TEAM: "Our team",
};

// ───────────────────────────── Field validation (scope §4) ─────────────────────────────

export const NAME_MAX = 100;
export const ADDRESS_MAX = 200;
export const TEXT_MAX = 500;
export const TITLE_MAX = 80;
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

/** Person names: ≤100, letters, "." and spaces only (no numerals). */
export const personNameSchema = z
  .string({ error: "Enter a name." })
  .trim()
  .min(1, { error: "Enter a name." })
  .max(NAME_MAX, { error: `Use at most ${NAME_MAX} characters.` })
  .regex(/^[\p{L}. ]+$/u, { error: "Letters, . and spaces only." });

/** Mobile: exactly 10 digits. */
export const mobileSchema = z
  .string({ error: "Enter a mobile number." })
  .trim()
  .regex(/^\d+$/, { error: "Digits only." })
  .refine((v) => v.length === 10, { error: "Must be 10 digits." });

export const addressSchema = z.string().trim().max(ADDRESS_MAX, { error: `Max ${ADDRESS_MAX} characters.` });
export const courseNameSchema = z.string().trim().min(1, { error: "Enter a name." }).max(NAME_MAX, { error: `Max ${NAME_MAX} characters.` });
export const longTextSchema = z.string().trim().max(TEXT_MAX, { error: `Max ${TEXT_MAX} characters.` });
export const rupeesSchema = z.coerce.number({ error: "Enter an amount." }).int({ error: "Whole rupees only." }).min(0).max(10_000_000);

/** Live helper for forms: the message for a mobile field, or null when valid. */
export function mobileIssue(v: string): string | null {
  const d = v.trim();
  if (!d) return "Enter a mobile number.";
  if (!/^\d+$/.test(d)) return "Digits only.";
  if (d.length !== 10) return `Must be 10 digits — ${d.length} entered.`;
  return null;
}

// ───────────────────────────── Student registration (form) ─────────────────────────────

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];
export const genderLabel: Record<Gender, string> = { MALE: "Male", FEMALE: "Female", OTHER: "Other" };
export const isGender = (v: unknown): v is Gender => typeof v === "string" && (GENDERS as readonly string[]).includes(v);

export const STUDENT_AGE_MIN = 2;
export const STUDENT_AGE_MAX = 30;

/** Whole years between a YYYY-MM-DD date of birth and a day (default: now, in IST). Null if invalid. */
export function ageOn(dob: string, on = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const ist = new Date(on.getTime() + 5.5 * 3600_000);
  const nowMonth = ist.getUTCMonth() + 1;
  let age = ist.getUTCFullYear() - y;
  if (nowMonth < mo || (nowMonth === mo && ist.getUTCDate() < d)) age -= 1;
  return age;
}

/** Date of birth from the form: a real YYYY-MM-DD date, not in the future, with an age in range. */
export const dobSchema = z
  .string({ error: "Enter the date of birth." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Enter a valid date." })
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, { error: "Enter a valid date." })
  .refine((v) => {
    const age = ageOn(v);
    return age !== null && age >= STUDENT_AGE_MIN && age <= STUDENT_AGE_MAX;
  }, { error: `The student must be between ${STUDENT_AGE_MIN} and ${STUDENT_AGE_MAX} years old.` });

export const schoolSchema = z.string().trim().min(2, { error: "Enter the school name." }).max(120, { error: "Max 120 characters." });

/** Live helper for forms: the message for a date of birth field, or null when valid. */
export function dobIssue(v: string): string | null {
  const r = dobSchema.safeParse(v);
  return r.success ? null : (r.error.issues[0]?.message ?? "Enter a valid date.");
}

// ───────────────────────────── Formatting ─────────────────────────────

/** ₹1,73,600 (Indian grouping). */
export const formatINR = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** "YYYY-MM" for the current month in India. */
export const monthKey = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(d);

/** "YYYY-MM-DD" today in India. */
export const istDate = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

export const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y!, (m ?? 1) - 1, 1)));
};

/** Initials for avatar circles: "Madhuri Ishani" → "MI". */
export const initials = (name: string, max = 2) =>
  name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, max)
    .map((w) => w[0]!.toUpperCase())
    .join("");
