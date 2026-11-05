import { z } from "zod";
import { GRADES, ENQUIRY_INTERESTS } from "@/lib/constants";

/**
 * Enquiry form schema — shared by the client form and the /api/enquiry route.
 * Mirrors the scope rules: name ≤100 chars (letters, "." and spaces), 10-digit mobile,
 * standard email, message ≤500 chars.
 * NOTE: moves to packages/shared/validation when the monorepo packages are created.
 */
export const NAME_MAX = 100;
export const MESSAGE_MAX = 500;

export const enquirySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Please enter your name")
      .max(NAME_MAX, `Name must be at most ${NAME_MAX} characters`)
      .regex(/^[A-Za-z.\s]+$/, "Use letters, “.” and spaces only"),
    mobile: z
      .string()
      .trim()
      .regex(/^[0-9]{10}$/, "Enter a 10-digit mobile number"),
    email: z.string().trim().max(254).pipe(z.email("Enter a valid email address")),
    grade: z.enum(GRADES, { error: "Select the student's grade" }),
    interests: z.array(z.enum(ENQUIRY_INTERESTS)).max(ENQUIRY_INTERESTS.length).default([]),
    message: z
      .string()
      .trim()
      .min(1, "Please type your question")
      .max(MESSAGE_MAX, `Message must be at most ${MESSAGE_MAX} characters`),
    // Honeypot — real users never see or fill this field.
    company: z.string().max(200).optional().default(""),
  })
  .strict();

export type EnquiryInput = z.input<typeof enquirySchema>;
export type Enquiry = z.output<typeof enquirySchema>;
