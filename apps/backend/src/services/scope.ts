import type { Grade, Prisma } from "@dd/db";
import { gradeLabel, gradeNumber } from "@dd/shared/domain";
import { db } from "../lib/db";
import { forbidden, notFound } from "../lib/errors";
import type { Actor } from "../middleware/auth";

/**
 * Teacher scoping (scope §6.2: "Teachers see only students that match their assignments").
 * A "class" is grade + course (+ an optional subject inside the course, "" = whole course).
 * Admin can act on any class; staff only on classes in their TeachingAssignment rows.
 */
export type ClassRef = { grade: Grade; courseId: string; subject: string };
export type ClassInfo = ClassRef & {
  key: string;
  label: string;
  courseName: string;
  studentCount: number;
  days: number[];
  startTime: string | null;
  endTime: string | null;
  room: string | null;
};

export const classKey = (c: ClassRef) => `${c.grade}.${c.courseId}.${c.subject}`;
export const classLabel = (grade: Grade, courseName: string, subject: string) => `${gradeLabel(grade)} · ${subject || courseName}`;

/** Prisma filter: active students of a class (grade + active enrolment in the course). */
export const classStudentsWhere = (c: Pick<ClassRef, "grade" | "courseId">): Prisma.StudentWhereInput => ({
  status: "ACTIVE",
  grade: c.grade,
  enrolments: { some: { courseId: c.courseId, endedAt: null } },
});

/** The staff member's classes with student counts and timetable. */
export async function staffClasses(staffId: string): Promise<ClassInfo[]> {
  const rows = await db().teachingAssignment.findMany({
    where: { staffId, course: { archivedAt: null } },
    include: { course: { select: { name: true } } },
  });
  const out: ClassInfo[] = [];
  for (const r of rows) {
    const studentCount = await db().student.count({ where: classStudentsWhere(r) });
    out.push({
      grade: r.grade,
      courseId: r.courseId,
      subject: r.subject,
      key: classKey(r),
      label: classLabel(r.grade, r.course.name, r.subject),
      courseName: r.course.name,
      studentCount,
      days: r.days,
      startTime: r.startTime,
      endTime: r.endTime,
      room: r.room,
    });
  }
  // Highest grade first (matches the designs: Grade 10 · Maths, Grade 9 · Maths, Grade 9 · Science).
  return out.sort((a, b) => gradeNumber(b.grade) - gradeNumber(a.grade) || a.label.localeCompare(b.label));
}

/** Every class for admin (every published course × its grades), with counts. */
export async function allClasses(): Promise<ClassInfo[]> {
  const courses = await db().course.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } });
  const out: ClassInfo[] = [];
  for (const c of courses) {
    for (const grade of c.grades) {
      const studentCount = await db().student.count({ where: classStudentsWhere({ grade, courseId: c.id }) });
      out.push({ grade, courseId: c.id, subject: "", key: classKey({ grade, courseId: c.id, subject: "" }), label: classLabel(grade, c.name, ""), courseName: c.name, studentCount, days: [], startTime: null, endTime: null, room: null });
    }
  }
  return out.sort((a, b) => gradeNumber(b.grade) - gradeNumber(a.grade) || a.label.localeCompare(b.label));
}

/** Throws 403 unless the actor may act on this class. */
export async function assertClassAccess(a: Actor, c: Pick<ClassRef, "grade" | "courseId">) {
  const course = await db().course.findUnique({ where: { id: c.courseId }, select: { grades: true, archivedAt: true } });
  if (!course) throw notFound("That course");
  if (!course.grades.includes(c.grade)) throw forbidden("That course isn't offered for this grade.");
  if (a.isAdmin) return;
  const ok = await db().teachingAssignment.findFirst({ where: { staffId: a.id, grade: c.grade, courseId: c.courseId }, select: { id: true } });
  if (!ok) throw forbidden("You're not assigned to this class.");
}

/** Prisma filter for every student the actor may see (admin: all). */
export async function visibleStudentsWhere(a: Actor): Promise<Prisma.StudentWhereInput> {
  if (a.isAdmin) return {};
  const rows = await db().teachingAssignment.findMany({ where: { staffId: a.id }, select: { grade: true, courseId: true } });
  if (!rows.length) return { id: { in: [] } };
  return { OR: rows.map((r) => ({ grade: r.grade, enrolments: { some: { courseId: r.courseId, endedAt: null } } })) };
}

export async function assertStudentAccess(a: Actor, studentId: string) {
  if (a.isAdmin) return;
  const where = await visibleStudentsWhere(a);
  const found = await db().student.findFirst({ where: { AND: [{ id: studentId }, where] }, select: { id: true } });
  if (!found) throw forbidden("This student isn't in your classes.");
}

/** Student ids of a class (active only). */
export async function classStudentIds(c: Pick<ClassRef, "grade" | "courseId">) {
  return (await db().student.findMany({ where: classStudentsWhere(c), select: { id: true } })).map((s) => s.id);
}
