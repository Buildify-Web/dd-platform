import type { Registration } from "@dd/db";
import { effectiveSessionType, gradeLabel, gradeNumber, isGrade, learningModeLabel, sessionTypeLabel } from "@dd/shared/domain";
import type { Request } from "express";
import { env } from "../../config/env";
import { nextStaffCode, nextStudentCode } from "../../lib/codes";
import { db } from "../../lib/db";
import { badRequest, conflict, notFound } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { actor } from "../../middleware/auth";
import { audit } from "../../services/audit";
import { sendEmail } from "../../services/email";
import { noticeEmail } from "../../services/email/templates";
import { ensureRecord, monthlyTotalFor } from "../../services/fees";
import { monthKey } from "@dd/shared/domain";
import { issueTemporaryPassword } from "../auth/service";
import { staffRegistrationData, studentRegistrationData, type StaffRegistrationData, type StudentRegistrationData } from "./schemas";

const issuesOf = (r: Registration, data: unknown) => {
  const schema = r.type === "STUDENT" ? studentRegistrationData : staffRegistrationData;
  const parsed = schema.safeParse(data);
  const issues: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) issues[String(i.path[0] ?? "_")] ??= i.message;
  return issues;
};

/** Full review payload for "Review registration". */
export async function getRegistration(id: string) {
  const r = await db().registration.findUnique({ where: { id } });
  if (!r) throw notFound("That registration");
  const data = (r.data ?? {}) as Record<string, unknown>;
  const issues = issuesOf(r, data);

  // Previous / next pending item for the ‹ Previous / Next › buttons.
  const pending = { status: { in: ["PENDING", "INFO_REQUESTED"] as ("PENDING" | "INFO_REQUESTED")[] } };
  const [prev, next] = await Promise.all([
    db().registration.findFirst({ where: { ...pending, submittedAt: { lt: r.submittedAt } }, orderBy: { submittedAt: "desc" }, select: { id: true } }),
    db().registration.findFirst({ where: { ...pending, submittedAt: { gt: r.submittedAt } }, orderBy: { submittedAt: "asc" }, select: { id: true } }),
  ]);

  let duplicate: { match: boolean; label: string | null; studentId?: string } = { match: false, label: null };
  let summary: Record<string, unknown> = {};
  let courseOptions: { id: string; name: string; monthlyFee: number; isMandatory: boolean }[] = [];

  if (r.type === "STUDENT") {
    const name = typeof data.studentName === "string" ? data.studentName.trim() : "";
    const mobile = typeof data.mobile === "string" ? data.mobile.trim() : "";
    const dup = name
      ? await db().student.findFirst({
          where: { name: { equals: name, mode: "insensitive" }, ...(mobile ? { mobile } : {}) },
          select: { id: true, code: true, name: true },
        })
      : null;
    duplicate = dup ? { match: true, label: `${dup.name} · ${dup.code}`, studentId: dup.id } : { match: false, label: null };
    const grade = isGrade(data.grade) ? data.grade : null;
    if (grade) {
      courseOptions = await db().course.findMany({
        where: { archivedAt: null, published: true, grades: { has: grade } },
        orderBy: [{ isMandatory: "desc" }, { name: "asc" }],
        select: { id: true, name: true, monthlyFee: true, isMandatory: true },
      });
    }
    const courseIds = Array.isArray(data.courseIds) ? (data.courseIds.filter((x) => typeof x === "string") as string[]) : [];
    const mode = data.learningMode === "ONE_ON_ONE" ? "ONE_ON_ONE" : "GROUP";
    const type = effectiveSessionType(mode, data.sessionType === "ONLINE" ? "ONLINE" : "OFFLINE");
    summary = {
      monthlyFee: await monthlyTotalFor(courseIds.filter((c) => courseOptions.some((o) => o.id === c))),
      courses: courseIds.length,
      mode: `${sessionTypeLabel(type)} · ${learningModeLabel(mode)}`,
    };
  } else {
    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    const dup = email ? await db().user.findUnique({ where: { email }, select: { id: true, name: true } }) : null;
    duplicate = dup ? { match: true, label: `Account exists: ${dup.name}` } : { match: false, label: null };
    summary = { subject: data.subject ?? "" };
  }

  return {
    id: r.id,
    code: r.code,
    type: r.type,
    status: r.status,
    submittedAt: r.submittedAt,
    decisionNote: r.decisionNote,
    photoFileId: r.photoFileId,
    data,
    issues,
    duplicate,
    summary,
    courseOptions,
    prevId: prev?.id ?? null,
    nextId: next?.id ?? null,
  };
}

/** Checks each course is offered for the grade and adds the mandatory course for Grades 9–10. */
export async function validateStudentCourses(d: StudentRegistrationData) {
  const courses = await db().course.findMany({ where: { id: { in: d.courseIds }, archivedAt: null } });
  for (const id of d.courseIds) {
    const c = courses.find((x) => x.id === id);
    if (!c) throw badRequest("One of the courses no longer exists.", { courseIds: "Choose the courses again." });
    if (!c.grades.includes(d.grade)) throw badRequest(`${c.name} isn't offered for ${gradeLabel(d.grade)}.`, { courseIds: `${c.name} isn't offered for this grade.` });
  }
  // Grades 9–10: the mandatory course is always included.
  const n = gradeNumber(d.grade);
  if (n === 9 || n === 10) {
    const mandatory = await db().course.findMany({ where: { isMandatory: true, archivedAt: null, grades: { has: d.grade } }, select: { id: true } });
    for (const m of mandatory) if (!d.courseIds.includes(m.id)) d.courseIds.push(m.id);
  }
  return d;
}

/** Approve: create the student (Active) or the staff account (invited + emailed). */
export async function approveRegistration(req: Request, id: string, edits: Record<string, unknown> | undefined, photoFileId?: string) {
  const a = actor(req);
  const r = await db().registration.findUnique({ where: { id } });
  if (!r) throw notFound("That registration");
  if (r.status === "APPROVED" || r.status === "REJECTED") throw conflict("This registration has already been decided.");
  const merged = { ...((r.data ?? {}) as Record<string, unknown>), ...(edits ?? {}) };
  if (photoFileId) {
    const f = await db().storedFile.findUnique({ where: { id: photoFileId } });
    if (!f || f.purpose !== "STUDENT_PHOTO") throw badRequest("Upload the photo again.");
  }

  if (r.type === "STUDENT") {
    const parsed = studentRegistrationData.safeParse(merged);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const i of parsed.error.issues) fields[String(i.path[0] ?? "_")] ??= i.message;
      throw badRequest(Object.values(fields)[0] ?? "Fix the highlighted fields.", fields);
    }
    const d = await validateStudentCourses(parsed.data);
    const sessionType = effectiveSessionType(d.learningMode, d.sessionType);
    const student = await db().$transaction(async (tx) => {
      const maxRoll = await tx.student.aggregate({ where: { grade: d.grade }, _max: { rollNo: true } });
      const s = await tx.student.create({
        data: {
          code: await nextStudentCode(tx),
          name: d.studentName,
          grade: d.grade,
          rollNo: (maxRoll._max.rollNo ?? 0) + 1,
          parentName: d.fatherName || d.motherName,
          fatherName: d.fatherName,
          motherName: d.motherName,
          mobile: d.mobile,
          email: d.email,
          address: d.address,
          learningMode: d.learningMode,
          sessionType,
          photoFileId: photoFileId ?? r.photoFileId,
          dateOfBirth: d.dateOfBirth ? new Date(`${d.dateOfBirth}T00:00:00Z`) : null,
          gender: d.gender ?? null,
          schoolName: d.schoolName || null,
          schoolIdCardFileId: d.schoolIdCardFileId ?? null,
          registrationId: r.id,
          enrolments: { create: d.courseIds.map((courseId) => ({ courseId })) },
        },
      });
      await tx.registration.update({
        where: { id },
        data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: a.id, data: { ...d, sessionType }, decisionNote: null },
      });
      await ensureRecord(s.id, monthKey(), tx);
      return s;
    });
    await audit(req, {
      area: "APPROVALS",
      action: "registration.approve",
      summary: `approved the registration for ${student.name} (${gradeLabel(student.grade)})`,
      entityType: "Registration",
      entityId: r.id,
      fromLabel: "Pending",
      toLabel: "Active",
      before: r.data,
      after: { ...d, sessionType, code: student.code },
    });
    // Parent login for the mobile app is issued when parent sign-in ships (see CLAUDE.md §10).
    void sendEmail(
      noticeEmail({
        to: d.email,
        name: d.fatherName || d.motherName,
        subject: `${student.name}'s registration is approved`,
        heading: "Registration approved",
        paragraphs: [
          `Welcome to Dynamic Donalds! ${student.name}'s registration for ${gradeLabel(student.grade)} has been approved.`,
          "Your login details for the Dynamic Donalds parent app will be sent to this email address.",
        ],
        rows: [
          ["Admission no.", student.code],
          ["Grade", gradeLabel(student.grade)],
          ["Mode", `${sessionTypeLabel(sessionType)} · ${learningModeLabel(d.learningMode)}`],
        ],
        tag: "registration-approved",
      }),
    );
    return { status: "APPROVED", studentId: student.id };
  }

  // Staff
  const parsed = staffRegistrationData.safeParse(merged);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0] ?? "_")] ??= i.message;
    throw badRequest(Object.values(fields)[0] ?? "Fix the highlighted fields.", fields);
  }
  const d: StaffRegistrationData = parsed.data;
  if (await db().user.findUnique({ where: { email: d.email } })) throw conflict("An account with this email already exists.", { fields: { email: "Already registered." } });
  const user = await db().$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: d.email,
        name: d.name,
        mobile: d.mobile,
        role: "STAFF",
        status: "PENDING_APPROVAL",
        address: d.address || null,
        subject: d.subject || null,
        designation: "Teacher",
        staffCode: await nextStaffCode(tx),
        approvedAt: new Date(),
        approvedById: a.id,
      },
    });
    await tx.registration.update({ where: { id }, data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: a.id, staffUserId: u.id, data: d } });
    return u;
  });
  await issueTemporaryPassword(user, req.ctx);
  await audit(req, {
    area: "STAFF",
    action: "registration.approve",
    summary: `approved the staff registration for ${user.name}`,
    entityType: "User",
    entityId: user.id,
    fromLabel: "Pending",
    toLabel: "Invited",
  });
  return { status: "APPROVED", staffId: user.id };
}

const parentContact = (r: Registration) => {
  const d = (r.data ?? {}) as Record<string, unknown>;
  const email = typeof d.email === "string" ? d.email : null;
  const name = (r.type === "STUDENT" ? (d.fatherName ?? d.motherName) : d.name) as string | undefined;
  return { email, name: name || "there", student: (d.studentName as string | undefined) ?? "" };
};

export async function requestMoreInfo(req: Request, id: string, note: string) {
  const a = actor(req);
  const r = await db().registration.findUnique({ where: { id } });
  if (!r) throw notFound("That registration");
  if (r.status === "APPROVED" || r.status === "REJECTED") throw conflict("This registration has already been decided.");
  await db().registration.update({ where: { id }, data: { status: "INFO_REQUESTED", decisionNote: note, reviewedById: a.id, reviewedAt: new Date() } });
  const c = parentContact(r);
  if (c.email)
    void sendEmail(
      noticeEmail({
        to: c.email,
        name: c.name,
        subject: "More information needed for your registration",
        heading: "We need a little more information",
        paragraphs: ["Thank you for registering with Dynamic Donalds. Before we can approve it, we need the following:", note, "Please update your registration in the app, or reply to this email."],
        tag: "registration-info",
      }),
    );
  await audit(req, { area: "APPROVALS", action: "registration.request_info", summary: `asked for more information on ${r.code}`, entityType: "Registration", entityId: r.id, fromLabel: "Pending", toLabel: "Info requested", after: { note } });
  return { status: "INFO_REQUESTED" };
}

export async function rejectRegistration(req: Request, id: string, note: string | undefined) {
  const a = actor(req);
  const r = await db().registration.findUnique({ where: { id } });
  if (!r) throw notFound("That registration");
  if (r.status === "APPROVED" || r.status === "REJECTED") throw conflict("This registration has already been decided.");
  await db().registration.update({ where: { id }, data: { status: "REJECTED", decisionNote: note ?? null, reviewedById: a.id, reviewedAt: new Date() } });
  const c = parentContact(r);
  if (c.email)
    void sendEmail(
      noticeEmail({
        to: c.email,
        name: c.name,
        subject: "About your Dynamic Donalds registration",
        heading: "Registration not approved",
        paragraphs: ["We're sorry, we couldn't approve this registration.", ...(note ? [note] : []), `Please contact the centre if you have questions.`],
        tag: "registration-rejected",
      }),
    ).catch((err) => logger.error({ err }, "reject email failed"));
  await audit(req, { area: "APPROVALS", action: "registration.reject", summary: `rejected registration ${r.code}`, entityType: "Registration", entityId: r.id, fromLabel: "Pending", toLabel: "Rejected", after: { note } });
  return { status: "REJECTED" };
}

export const portalUrl = () => env().PORTAL_URL;
