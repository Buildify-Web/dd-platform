import { gradeLabel } from "@dd/shared/domain";
import express, { Router } from "express";
import * as z from "zod";
import { nextRegistrationCode } from "../../lib/codes";
import { db } from "../../lib/db";
import { badRequest, forbidden, rateLimited } from "../../lib/errors";
import { RateLimiter } from "../../lib/rate-limit";
import { parseBody, parseQuery } from "../../middleware/validate";
import { notifyAdmins } from "../../services/notify";
import { MAX_UPLOAD_BYTES, saveUpload } from "../../services/files";
import { zGrade } from "../common";
import { validateStudentCourses } from "./registrations";
import { websiteStudentRegistrationData } from "./schemas";

/**
 * /v1/public/intake: the registration form on the website. Only the website's server can call
 * it (X-Internal-Key), so the browser never talks to the API directly. The client IP comes from
 * X-Client-IP, which is trusted only with that key, so rate limits apply to real visitors.
 */
export const websiteIntakeRouter = Router();

websiteIntakeRouter.use((req, _res, next) => {
  if (!req.ctx.internal) return next(forbidden());
  next();
});

const uploadLimit = new RateLimiter(30, 60 * 60_000);
const submitLimit = new RateLimiter(10, 60 * 60_000);

/** Courses a parent can pick for a grade: published, not archived, offered for that grade. */
websiteIntakeRouter.get("/courses", async (req, res) => {
  const { grade } = parseQuery(z.object({ grade: zGrade }), req.query);
  const courses = await db().course.findMany({
    where: { archivedAt: null, published: true, grades: { has: grade } },
    orderBy: [{ isMandatory: "desc" }, { name: "asc" }],
    select: { id: true, name: true, monthlyFee: true, isMandatory: true, subjects: true },
  });
  res.json({ grade: gradeLabel(grade), courses });
});

/** Stores the school ID card. It is attached to a registration only when the form is submitted. */
websiteIntakeRouter.post(
  "/id-card",
  express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES + 1024 }),
  async (req, res) => {
    const hit = uploadLimit.hit(req.ctx.ip);
    if (!hit.ok) throw rateLimited(hit.retryAfter);
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const name = decodeURIComponent(req.get("x-file-name") ?? "").slice(0, 200);
    const file = await saveUpload(body, "SCHOOL_ID_CARD", name, null);
    res.status(201).json({ id: file.id });
  },
);

/** Submits a registration. The admin reviews it and approves it from the Students page. */
websiteIntakeRouter.post("/registrations", async (req, res) => {
  const hit = submitLimit.hit(req.ctx.ip);
  if (!hit.ok) throw rateLimited(hit.retryAfter);

  const data = parseBody(websiteStudentRegistrationData, req.body);

  const card = await db().storedFile.findUnique({ where: { id: data.schoolIdCardFileId } });
  if (!card || card.purpose !== "SCHOOL_ID_CARD" || card.deletedAt) {
    throw badRequest("Upload the school ID card again.", { schoolIdCardFileId: "Upload a photo of the school ID card." });
  }
  // One upload belongs to one registration: a repeated submit with the same card is refused.
  const alreadyUsed = await db().registration.findFirst({
    where: { data: { path: ["schoolIdCardFileId"], equals: card.id } },
    select: { id: true },
  });
  if (alreadyUsed) throw badRequest("Upload the school ID card again.", { schoolIdCardFileId: "Upload a photo of the school ID card." });

  const checked = await validateStudentCourses(data);
  const r = await db().registration.create({ data: { code: await nextRegistrationCode(), type: "STUDENT", data: checked } });

  await notifyAdmins({
    category: "APPROVALS",
    title: "New registration",
    body: `${checked.fatherName || checked.motherName} registered ${checked.studentName} for ${gradeLabel(checked.grade)} from the website.`,
    actionLabel: "Review",
    href: `/admin/approvals/registrations/${r.id}`,
    urgent: true,
  });
  res.status(201).json({ code: r.code, status: "PENDING" });
});
