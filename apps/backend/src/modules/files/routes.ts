import type { FilePurpose, StoredFile } from "@dd/db";
import express, { Router } from "express";
import * as z from "zod";
import { db } from "../../lib/db";
import { forbidden, notFound } from "../../lib/errors";
import { actor, portalUser, type Actor } from "../../middleware/auth";
import { idParam, parseQuery } from "../../middleware/validate";
import { MAX_UPLOAD_BYTES, openFile, saveUpload, signFileToken, verifyFileToken } from "../../services/files";
import { assertClassAccess, assertStudentAccess } from "../../services/scope";

/**
 * /v1/files: uploads (raw body + X-File-Name) and access-controlled downloads.
 * Downloads re-check the owning record every time: a deleted assignment or question paper
 * returns 404, so its links stop working (scope §6.2).
 */
export const filesRouter = Router();

const STAFF_UPLOADS: FilePurpose[] = ["AVATAR", "HOMEWORK", "ASSIGNMENT", "QUESTION_PAPER", "ANNOUNCEMENT"];

filesRouter.post(
  "/",
  ...portalUser,
  express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES + 1024 }),
  async (req, res) => {
    const a = actor(req);
    const { purpose } = parseQuery(
      z.object({ purpose: z.enum(["AVATAR", "STUDENT_PHOTO", "HOMEWORK", "ASSIGNMENT", "QUESTION_PAPER", "PAYMENT_PROOF", "ANNOUNCEMENT", "GALLERY", "ACHIEVEMENT"]) }),
      req.query,
    );
    if (!a.isAdmin && !STAFF_UPLOADS.includes(purpose)) throw forbidden();
    const name = decodeURIComponent(req.get("x-file-name") ?? "").slice(0, 200);
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const file = await saveUpload(body, purpose, name, a.id);
    res.status(201).json({ id: file.id, name: file.originalName, size: file.size, mimeType: file.mimeType });
  },
);

/** Is the file still live (owner not deleted) and may this actor read it? */
async function checkAccess(file: StoredFile, a: Actor | null) {
  if (file.deletedAt) throw notFound("File");
  if (file.purpose === "ASSIGNMENT") {
    const owner = await db().assignment.findFirst({ where: { fileId: file.id } });
    if (!owner || owner.deletedAt) throw notFound("File");
    if (a && !a.isAdmin) await assertClassAccess(a, owner);
    return;
  }
  if (file.purpose === "QUESTION_PAPER") {
    const owner = await db().questionPaper.findFirst({ where: { fileId: file.id } });
    if (!owner || owner.status === "DELETED") throw notFound("File");
    // Signed links (parents) only work once the paper is active.
    if (!a && owner.status !== "ACTIVE") throw notFound("File");
    if (a && !a.isAdmin && owner.uploadedById !== a.id && owner.courseId) await assertClassAccess(a, { grade: owner.grade, courseId: owner.courseId });
    return;
  }
  if (!a) return; // signed link: token already proves access
  if (a.isAdmin || file.uploadedById === a.id) return;
  if (file.purpose === "HOMEWORK") {
    const sub = await db().homeworkSubmission.findFirst({ where: { imageFileId: file.id }, select: { studentId: true } });
    if (!sub) throw notFound("File");
    await assertStudentAccess(a, sub.studentId);
    return;
  }
  if (file.purpose === "STUDENT_PHOTO") {
    const s = await db().student.findFirst({ where: { photoFileId: file.id }, select: { id: true } });
    if (!s) throw notFound("File");
    await assertStudentAccess(a, s.id);
    return;
  }
  if (file.purpose === "AVATAR" || file.purpose === "ANNOUNCEMENT" || file.purpose === "GALLERY" || file.purpose === "ACHIEVEMENT") return;
  throw forbidden();
}

async function stream(file: StoredFile, res: express.Response, download: boolean) {
  const body = await openFile(file).catch(() => {
    throw notFound("File");
  });
  res.set("Content-Type", file.mimeType);
  res.set("Content-Length", String(file.size));
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Content-Security-Policy", "default-src 'none'; sandbox");
  res.set("Cache-Control", "private, no-store");
  const disp = download || !/^(image\/|application\/pdf)/.test(file.mimeType) ? "attachment" : "inline";
  res.set("Content-Disposition", `${disp}; filename="${file.originalName.replace(/"/g, "")}"`);
  body.pipe(res);
}

filesRouter.get("/:id", ...portalUser, async (req, res) => {
  const file = await db().storedFile.findUnique({ where: { id: idParam(req.params.id, "File") } });
  if (!file) throw notFound("File");
  await checkAccess(file, actor(req));
  await stream(file, res, req.query.download === "1");
});

/** A signed, expiring link to share ("Copy link"). */
filesRouter.get("/:id/link", ...portalUser, async (req, res) => {
  const file = await db().storedFile.findUnique({ where: { id: idParam(req.params.id, "File") } });
  if (!file) throw notFound("File");
  await checkAccess(file, actor(req));
  res.json({ token: signFileToken(file.id), path: `/v1/public/files/${signFileToken(file.id)}` });
});

/** Public, signed download (used by the parent app). The token expires; the owner is re-checked. */
export const publicFilesRouter = Router();
publicFilesRouter.get("/:token", async (req, res) => {
  const id = verifyFileToken(String(req.params.token));
  if (!id) throw notFound("File");
  const file = await db().storedFile.findUnique({ where: { id } });
  if (!file) throw notFound("File");
  await checkAccess(file, null);
  await stream(file, res, false);
});
