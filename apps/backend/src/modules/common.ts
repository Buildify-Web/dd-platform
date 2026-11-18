import { GRADES, gradeLabel, type Grade } from "@dd/shared/domain";
import * as z from "zod";
import { zId } from "../middleware/validate";

/** Shared request schemas and presenters for the portal modules. */
export const zGrade = z.enum(GRADES, { error: "Choose a grade." });
export const zSubject = z.string().trim().max(60).default("");

/** A class reference in a body or query: grade + course (+ subject). */
export const zClass = z.object({ grade: zGrade, courseId: zId, subject: zSubject });

export const zOptionalId = z
  .union([zId, z.literal("")])
  .optional()
  .transform((v) => (v ? v : undefined));

export const person = (u: { id: string; name: string } | null | undefined) => (u ? { id: u.id, name: u.name } : null);

export const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);

export const gradeL = (g: Grade) => gradeLabel(g);

/** "4021 7733 8831" → "4021…8831" for compact displays. */
export const shortRef = (ref: string | null | undefined) => {
  if (!ref) return null;
  const clean = ref.replace(/\s+/g, "");
  return clean.length > 10 ? `${clean.slice(0, 4)}…${clean.slice(-4)}` : ref;
};

/** Masks a 10-digit mobile like the designs: 94XXXXXX08. */
export const maskMobile = (m: string | null | undefined) => (m && m.length === 10 ? `${m.slice(0, 2)}XXXXXX${m.slice(-2)}` : (m ?? null));
