import { z } from "zod";

/**
 * Student registration form: options and rules, shared by the form and /api/registration.
 * Values match the backend (packages/shared) so the API accepts exactly what the form sends.
 * NOTE: moves to packages/shared when the website reads shared rules directly.
 */

const gradeName = (n: number) => `GRADE_${n}`;
export const REG_GRADES = [
  { value: "PRE_KG", label: "Pre-KG" },
  { value: "LKG", label: "LKG" },
  { value: "UKG", label: "UKG" },
  ...Array.from({ length: 12 }, (_, i) => ({ value: gradeName(i + 1), label: `Grade ${i + 1}` })),
] as const;
export type RegGrade = (typeof REG_GRADES)[number]["value"];
const GRADE_VALUES = REG_GRADES.map((g) => g.value) as [RegGrade, ...RegGrade[]];

export const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
] as const;

export const LEARNING_OPTIONS = [
  { value: "GROUP", label: "Group" },
  { value: "ONE_ON_ONE", label: "One-on-one" },
] as const;

export const SESSION_OPTIONS = [
  { value: "OFFLINE", label: "Offline" },
  { value: "ONLINE", label: "Online" },
] as const;

export const NAME_MAX = 100;
export const ADDRESS_MAX = 200;
export const SCHOOL_MAX = 120;
export const ID_CARD_MAX_BYTES = 5 * 1024 * 1024;
export const ID_CARD_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export const STUDENT_AGE_MIN = 2;
export const STUDENT_AGE_MAX = 30;

/** Whole years between a YYYY-MM-DD date of birth and a day (default: now, IST). Null if invalid. */
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

const nameField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${label}.`)
    .max(NAME_MAX, `Use at most ${NAME_MAX} characters.`)
    .regex(/^[\p{L}. ]+$/u, "Letters, . and spaces only.");

export const registrationSchema = z
  .object({
    studentName: nameField("student's name"),
    grade: z.enum(GRADE_VALUES, { error: "Choose the grade." }),
    fatherName: nameField("father's name"),
    motherName: nameField("mother's name"),
    mobile: z.string().trim().regex(/^\d{10}$/, "Enter a 10-digit mobile number."),
    email: z.string().trim().max(254).pipe(z.email("Enter a valid email address.")),
    schoolName: z.string().trim().min(2, "Enter the school name.").max(SCHOOL_MAX, `Use at most ${SCHOOL_MAX} characters.`),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
      .refine((v) => {
        const d = new Date(`${v}T00:00:00Z`);
        return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
      }, "Enter a valid date.")
      .refine((v) => {
        const age = ageOn(v);
        return age !== null && age >= STUDENT_AGE_MIN && age <= STUDENT_AGE_MAX;
      }, `The student must be between ${STUDENT_AGE_MIN} and ${STUDENT_AGE_MAX} years old.`),
    gender: z.enum(["MALE", "FEMALE", "OTHER"], { error: "Choose the student's gender." }),
    address: z.string().trim().min(1, "Enter the residential address.").max(ADDRESS_MAX, `Use at most ${ADDRESS_MAX} characters.`),
    courseIds: z.array(z.string()).min(1, "Choose at least one course.").max(12),
    learningMode: z.enum(["GROUP", "ONE_ON_ONE"], { error: "Choose a learning mode." }),
    sessionType: z.enum(["OFFLINE", "ONLINE"], { error: "Choose a session type." }),
  })
  .strict();

export type RegistrationInput = z.input<typeof registrationSchema>;
export type RegistrationData = z.output<typeof registrationSchema>;

/** Field name → first message, for showing errors under each input. */
export function fieldErrorsOf(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
