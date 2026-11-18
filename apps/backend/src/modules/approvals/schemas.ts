import { emailSchema } from "@dd/shared/auth";
import { addressSchema, dobSchema, GENDERS, LEARNING_MODES, longTextSchema, mobileSchema, personNameSchema, schoolSchema, SESSION_TYPES } from "@dd/shared/domain";
import * as z from "zod";
import { zId } from "../../middleware/validate";
import { zGrade } from "../common";

/** What a parent submits from the app (and what admin may edit before approving). */
export const studentRegistrationData = z
  .object({
    studentName: personNameSchema,
    grade: zGrade,
    fatherName: personNameSchema,
    motherName: personNameSchema,
    mobile: mobileSchema,
    email: emailSchema,
    address: addressSchema.min(1, { error: "Enter the residential address." }),
    courseIds: z.array(zId).min(1, { error: "Choose at least one course." }).max(12),
    learningMode: z.enum(LEARNING_MODES),
    sessionType: z.enum(SESSION_TYPES),
    // Added with the website registration form. Optional so older app submissions still validate.
    schoolName: schoolSchema.optional(),
    dateOfBirth: dobSchema.optional(),
    gender: z.enum(GENDERS).optional(),
    schoolIdCardFileId: zId.optional(),
  })
  .strict();
export type StudentRegistrationData = z.infer<typeof studentRegistrationData>;

/** The website registration form: the same fields, with the new ones required. */
export const websiteStudentRegistrationData = studentRegistrationData.extend({
  schoolName: schoolSchema,
  dateOfBirth: dobSchema,
  gender: z.enum(GENDERS, { error: "Choose the student's gender." }),
  schoolIdCardFileId: z.uuid({ error: "Upload a photo of the school ID card." }),
});

/** What a teacher submits from the app. */
export const staffRegistrationData = z
  .object({
    name: personNameSchema,
    mobile: mobileSchema,
    email: emailSchema,
    address: addressSchema.optional().default(""),
    subject: z.string().trim().max(60).optional().default(""),
  })
  .strict();
export type StaffRegistrationData = z.infer<typeof staffRegistrationData>;

export const approveBody = z.object({ data: z.record(z.string(), z.unknown()).optional(), note: longTextSchema.optional(), photoFileId: zId.optional() }).strict();
export const decisionBody = z.object({ note: longTextSchema.optional() }).strict();
export const requestInfoBody = z.object({ note: longTextSchema.min(1, { error: "Tell the parent what is missing." }) }).strict();

export const publicRegistrationBody = z.discriminatedUnion("type", [
  z.object({ type: z.literal("STUDENT"), data: studentRegistrationData }).strict(),
  z.object({ type: z.literal("STAFF"), data: staffRegistrationData }).strict(),
]);

export const staffLeaveBody = z
  .object({
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: longTextSchema.min(1, { error: "Add a reason." }),
  })
  .strict()
  .refine((v) => v.toDate >= v.fromDate, { error: "The end date is before the start date.", path: ["toDate"] });
