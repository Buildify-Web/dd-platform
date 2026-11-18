import type { FilePurpose, StoredFile } from "@dd/db";
import { ATTACHMENT_MAX_BYTES, DOCUMENT_MAX_BYTES, PHOTO_MAX_BYTES } from "@dd/shared/domain";
import { createHmac, randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";
import { safeEqual } from "../lib/crypto";
import { db } from "../lib/db";
import { API_ERRORS, HttpError } from "../lib/errors";

/**
 * File storage on local disk (UPLOAD_DIR; a Docker volume in production). Uploads arrive as
 * a raw request body. The real type is sniffed from the first bytes (the client's
 * Content-Type is not trusted) and checked against what each purpose allows.
 */
type Kind = "image" | "pdf" | "doc";
const RULES: Record<FilePurpose, { kinds: Kind[]; max: number }> = {
  AVATAR: { kinds: ["image"], max: PHOTO_MAX_BYTES },
  SCHOOL_ID_CARD: { kinds: ["image", "pdf"], max: ATTACHMENT_MAX_BYTES },
  STUDENT_PHOTO: { kinds: ["image"], max: PHOTO_MAX_BYTES },
  HOMEWORK: { kinds: ["image"], max: PHOTO_MAX_BYTES },
  PAYMENT_PROOF: { kinds: ["image", "pdf"], max: ATTACHMENT_MAX_BYTES },
  ANNOUNCEMENT: { kinds: ["image", "pdf"], max: ATTACHMENT_MAX_BYTES },
  ASSIGNMENT: { kinds: ["image", "pdf", "doc"], max: DOCUMENT_MAX_BYTES },
  QUESTION_PAPER: { kinds: ["pdf", "image", "doc"], max: DOCUMENT_MAX_BYTES },
  GALLERY: { kinds: ["image"], max: DOCUMENT_MAX_BYTES },
  ACHIEVEMENT: { kinds: ["image"], max: ATTACHMENT_MAX_BYTES },
};

export const MAX_UPLOAD_BYTES = DOCUMENT_MAX_BYTES;

/** Detects the type from magic bytes. */
function sniff(buf: Buffer): { kind: Kind; mime: string; ext: string } | null {
  const hex = buf.subarray(0, 12).toString("hex");
  if (hex.startsWith("ffd8ff")) return { kind: "image", mime: "image/jpeg", ext: "jpg" };
  if (hex.startsWith("89504e470d0a1a0a")) return { kind: "image", mime: "image/png", ext: "png" };
  if (hex.startsWith("52494646") && buf.subarray(8, 12).toString("ascii") === "WEBP") return { kind: "image", mime: "image/webp", ext: "webp" };
  if (hex.startsWith("25504446")) return { kind: "pdf", mime: "application/pdf", ext: "pdf" };
  // .docx (ZIP) or legacy .doc (OLE)
  if (hex.startsWith("504b0304")) return { kind: "doc", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx" };
  if (hex.startsWith("d0cf11e0a1b11ae1")) return { kind: "doc", mime: "application/msword", ext: "doc" };
  return null;
}

const root = () => path.resolve(env().UPLOAD_DIR);

const kindLabel = (k: Kind[]) =>
  k.map((x) => (x === "image" ? "JPG/PNG/WebP" : x === "pdf" ? "PDF" : "Word")).join(", ");

export async function saveUpload(buf: Buffer, purpose: FilePurpose, originalName: string, uploadedById: string | null): Promise<StoredFile> {
  const rule = RULES[purpose];
  if (!buf.length) throw new HttpError(400, API_ERRORS.UNSUPPORTED_FILE, "The file is empty.");
  if (buf.length > rule.max)
    throw new HttpError(413, API_ERRORS.FILE_TOO_LARGE, `File is too large. Max ${Math.round(rule.max / 1024 / 1024)} MB.`);
  const type = sniff(buf);
  if (!type || !rule.kinds.includes(type.kind))
    throw new HttpError(415, API_ERRORS.UNSUPPORTED_FILE, `This file type isn't allowed here. Use ${kindLabel(rule.kinds)}.`);

  const now = new Date();
  const dir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const storageKey = `${dir}/${randomBytes(16).toString("hex")}.${type.ext}`;
  await mkdir(path.join(root(), dir), { recursive: true });
  await writeFile(path.join(root(), storageKey), buf, { flag: "wx" });

  const cleanName = (originalName || `file.${type.ext}`).replace(/[^\w.\- ()]+/g, "_").slice(0, 200);
  return db().storedFile.create({
    data: { purpose, originalName: cleanName, mimeType: type.mime, size: buf.length, storageKey, uploadedById },
  });
}

/** Opens a stored file for streaming. */
export async function openFile(file: StoredFile) {
  const full = path.join(root(), file.storageKey);
  if (!full.startsWith(root())) throw new HttpError(404, API_ERRORS.NOT_FOUND, "File not found.");
  await stat(full);
  return createReadStream(full);
}

export async function removeFile(id: string) {
  const file = await db().storedFile.update({ where: { id }, data: { deletedAt: new Date() } }).catch(() => null);
  if (file) await unlink(path.join(root(), file.storageKey)).catch(() => undefined);
}

// ── Signed, expiring links (for parents in the app, and "Copy link") ──
const secret = () => env().FILE_URL_SECRET || `dev-only-${env().DATABASE_URL}`;

export function signFileToken(fileId: string, minutes = env().FILE_URL_MINUTES) {
  const exp = Math.floor(Date.now() / 1000) + minutes * 60;
  const payload = `${fileId}.${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyFileToken(token: string): string | null {
  const [id, exp, sig] = token.split(".");
  if (!id || !exp || !sig) return null;
  const expected = createHmac("sha256", secret()).update(`${id}.${exp}`).digest("base64url");
  if (!safeEqual(expected, sig)) return null;
  if (Number(exp) * 1000 < Date.now()) return null;
  return id;
}
