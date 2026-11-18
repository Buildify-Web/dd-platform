import type { Grade } from "@dd/db";
import { gradeLabel, isGrade } from "@dd/shared/domain";
import { db } from "../lib/db";
import { badRequest } from "../lib/errors";

/**
 * What a teacher teaches: one row per grade × course × subject. subject "" = the whole course.
 * Used by the admin's assignment editor, by teachers' change requests and by their approval, so
 * every path validates and stores the same way.
 */
export type TeachingRow = { grade: Grade; courseId: string; subject: string };
/** Grouped for the UI: one entry per grade × course; subjects [] = the whole course. */
export type TeachingSelection = { grade: Grade; courseId: string; subjects: string[] };
export type CatalogCourse = { id: string; name: string; grades: Grade[]; subjects: string[] };

export const rowKey = (r: TeachingRow) => `${r.grade}|${r.courseId}|${r.subject}`;

/** Courses that can be taught: everything not archived (a hidden course can still be kept). */
export async function teachingCatalog(): Promise<CatalogCourse[]> {
  const courses = await db().course.findMany({
    where: { archivedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, grades: true, subjects: true },
  });
  return courses;
}

/** Checks every row against the catalog: the course is offered for the grade, and subjects belong to the course. */
export function validateRows(rows: TeachingRow[], catalog: CatalogCourse[]): TeachingRow[] {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const out = new Map<string, TeachingRow>();
  for (const r of rows) {
    const c = byId.get(r.courseId);
    if (!c) throw badRequest("One of the courses no longer exists. Choose the courses again.", { rows: "Choose the courses again." });
    if (!isGrade(r.grade) || !c.grades.includes(r.grade)) {
      throw badRequest(`${c.name} isn't offered for ${isGrade(r.grade) ? gradeLabel(r.grade) : "that grade"}.`, { rows: `${c.name} isn't offered for this grade.` });
    }
    if (r.subject && !c.subjects.includes(r.subject)) {
      throw badRequest(`${r.subject} isn't a subject of ${c.name}.`, { rows: `${r.subject} isn't a subject of ${c.name}.` });
    }
    out.set(rowKey(r), { grade: r.grade, courseId: c.id, subject: r.subject });
  }
  return [...out.values()];
}

/** Grouped selections → flat rows. A course with no subjects picked is the whole course. */
export function flattenSelections(selections: TeachingSelection[]): TeachingRow[] {
  return selections.flatMap((s) => (s.subjects.length ? s.subjects : [""]).map((subject) => ({ grade: s.grade, courseId: s.courseId, subject })));
}

/** Flat rows → grouped selections, for showing what a teacher teaches. */
export function toSelections(rows: TeachingRow[]): TeachingSelection[] {
  const groups = new Map<string, TeachingSelection>();
  for (const r of rows) {
    const key = `${r.grade}|${r.courseId}`;
    const g = groups.get(key) ?? { grade: r.grade, courseId: r.courseId, subjects: [] };
    if (r.subject && !g.subjects.includes(r.subject)) g.subjects.push(r.subject);
    groups.set(key, g);
  }
  return [...groups.values()];
}

/** What the teacher teaches now (courses that are not archived). */
export async function currentRows(staffId: string): Promise<TeachingRow[]> {
  const rows = await db().teachingAssignment.findMany({
    where: { staffId, course: { archivedAt: null } },
    select: { grade: true, courseId: true, subject: true },
  });
  return rows.map((r) => ({ grade: r.grade, courseId: r.courseId, subject: r.subject }));
}

export function diffRows(current: TeachingRow[], wanted: TeachingRow[]) {
  const have = new Set(current.map(rowKey));
  const want = new Set(wanted.map(rowKey));
  return { added: wanted.filter((r) => !have.has(rowKey(r))), removed: current.filter((r) => !want.has(rowKey(r))) };
}

/**
 * Makes the stored assignment equal to `wanted`. Rows that stay keep their timetable. Used
 * by the admin's editor and by an approved change request.
 */
export async function applyRows(staffId: string, wanted: TeachingRow[]) {
  const existing = await db().teachingAssignment.findMany({ where: { staffId }, select: { id: true, grade: true, courseId: true, subject: true } });
  const keep = new Set(wanted.map(rowKey));
  const have = new Set(existing.map(rowKey));
  await db().$transaction([
    db().teachingAssignment.deleteMany({ where: { staffId, id: { in: existing.filter((t) => !keep.has(rowKey(t))).map((t) => t.id) } } }),
    db().teachingAssignment.createMany({ data: wanted.filter((w) => !have.has(rowKey(w))).map((w) => ({ ...w, staffId, days: [] })) }),
  ]);
}

/** Stored JSON rows of a change request. They were validated when they were saved. */
export const storedRows = (json: unknown): TeachingRow[] => (Array.isArray(json) ? (json as TeachingRow[]) : []);

export const sameRows = (a: TeachingRow[], b: TeachingRow[]) => {
  const x = new Set(a.map(rowKey));
  const y = new Set(b.map(rowKey));
  return x.size === y.size && [...x].every((k) => y.has(k));
};
