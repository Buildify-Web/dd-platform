import "server-only";
import type { Grade } from "@dd/shared/domain";
import { cache } from "react";
import { api } from "./api";
import { requireRole } from "./session";

/** Page guards (every portal page calls one: server-side session + role check). */
export const requireAdmin = (path: string) => requireRole("ADMIN", "admin", path);
export const requireStaff = (path: string) => requireRole("STAFF", "staff", path);

export type ClassInfo = {
  grade: Grade;
  courseId: string;
  subject: string;
  key: string;
  label: string;
  courseName: string;
  studentCount: number;
  days: number[];
  startTime: string | null;
  endTime: string | null;
  room: string | null;
};
export type CourseLite = { id: string; name: string; category: string; grades: Grade[]; subjects: string[]; monthlyFee: number; isMandatory: boolean; published: boolean };
export type Meta = {
  courses: CourseLite[];
  competitions: { id: string; name: string; grades: Grade[]; date: string }[];
  classes: ClassInfo[];
  settings: { instituteName: string; attendanceDeadline: string; attendanceThreshold: number };
};

/** Courses, the actor's classes and display settings (once per request). */
export const getMeta = cache((portal: "admin" | "staff") => api<Meta>("/v1/meta", portal));

/** Finds a class from a "GRADE_9.<courseId>.<subject>" key (falls back to the first class). */
export function pickClass(classes: ClassInfo[], key: string | undefined) {
  return classes.find((c) => c.key === key) ?? classes[0] ?? null;
}

export const classQuery = (c: Pick<ClassInfo, "grade" | "courseId" | "subject">) =>
  `grade=${c.grade}&courseId=${c.courseId}&subject=${encodeURIComponent(c.subject)}`;

export type ClassOpt = { key: string; grade: Grade; courseId: string; subject: string; label: string; short: string; studentCount: number };

/**
 * Classes the actor can pick. Staff: their assigned classes. Admin: every course × grade,
 * split into subjects (Maths & Science → Maths, Science), optionally from a minimum grade.
 */
export function classOptions(meta: Meta, portal: "admin" | "staff", minGrade = -99): ClassOpt[] {
  const num = (g: Grade) => (g === "PRE_KG" ? -2 : g === "LKG" ? -1 : g === "UKG" ? 0 : Number(g.slice(6)));
  const label = (g: Grade) => (g === "PRE_KG" ? "Pre-KG" : g.startsWith("GRADE_") ? `Grade ${g.slice(6)}` : g);
  const out: ClassOpt[] =
    portal === "staff"
      ? meta.classes.map((c) => ({ key: c.key, grade: c.grade, courseId: c.courseId, subject: c.subject, label: c.label, short: c.subject || c.courseName, studentCount: c.studentCount }))
      : meta.courses.flatMap((c) =>
          c.grades.flatMap((g) =>
            (c.subjects.length ? c.subjects : [""]).map((s) => ({ key: `${g}.${c.id}.${s}`, grade: g, courseId: c.id, subject: s, label: `${label(g)} · ${s || c.name}`, short: s || c.name, studentCount: 0 })),
          ),
        );
  return out.filter((c) => num(c.grade) >= minGrade).sort((a, b) => num(b.grade) - num(a.grade) || a.short.localeCompare(b.short));
}

/** Resolves ?grade= / ?class= against the options (grade wins over a stale class). */
export function pickFromParams(opts: ClassOpt[], gradeParam: string, classParam: string) {
  const grades = [...new Set(opts.map((c) => c.grade))];
  const fromKey = opts.find((c) => c.key === classParam);
  const grade = (grades.includes(gradeParam as Grade) ? gradeParam : (fromKey?.grade ?? (grades.includes("GRADE_9") ? "GRADE_9" : grades[0]))) as Grade | undefined;
  const inGrade = opts.filter((c) => c.grade === grade);
  const cls = fromKey && fromKey.grade === grade ? fromKey : inGrade[0];
  return { grades, grade, inGrade, cls };
}
