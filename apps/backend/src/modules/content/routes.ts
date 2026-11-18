import { GALLERY_ALBUMS, galleryAlbumLabel, mobileSchema } from "@dd/shared/domain";
import { Router } from "express";
import * as z from "zod";
import { dbDate, shortDate, ymd } from "../../lib/dates";
import { db } from "../../lib/db";
import { forbidden, notFound } from "../../lib/errors";
import { adminOnly } from "../../middleware/auth";
import { idParam, parseBody, parseQuery, zDate, zId } from "../../middleware/validate";
import { audit } from "../../services/audit";
import { removeFile, signFileToken } from "../../services/files";
import { notifyAdmins } from "../../services/notify";

/**
 * /v1/content (admin): what the public website shows: gallery photos (first 8 in order are
 * on the homepage), achievements, testimonials, and enquiries from the contact form.
 * /v1/public/content: read-only feeds for the website (signed image links).
 * /enquiries + /v1/enquiries: website enquiry intake (X-Internal-Key required).
 */
export const contentRouter = Router();
contentRouter.use(adminOnly);

const HOMEPAGE_SLOTS = 8;

contentRouter.get("/overview", async (_req, res) => {
  const [gallery, achievements, testimonials, enquiries] = await Promise.all([
    db().galleryItem.count(),
    db().achievement.count(),
    db().testimonial.count(),
    db().enquiry.count({ where: { status: "NEW" } }),
  ]);
  res.json({ gallery, achievements, testimonials, enquiries });
});

// ── Gallery ──
contentRouter.get("/gallery", async (req, res) => {
  const { album } = parseQuery(z.object({ album: z.union([z.enum(GALLERY_ALBUMS), z.literal("")]).optional() }), req.query);
  const rows = await db().galleryItem.findMany({ where: album ? { album } : {}, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  res.json({
    homepageSlots: HOMEPAGE_SLOTS,
    rows: rows.map((g) => ({ id: g.id, title: g.title, album: g.album, albumLabel: galleryAlbumLabel[g.album], takenOn: g.takenOn ? ymd(g.takenOn) : null, dateLabel: g.takenOn ? shortDate(g.takenOn) : null, fileId: g.fileId, onHomepage: g.onHomepage })),
  });
});

const galleryBody = z.object({ title: z.string().trim().min(1).max(100), album: z.enum(GALLERY_ALBUMS), takenOn: zDate.optional(), fileIds: z.array(zId).min(1).max(10) }).strict();

contentRouter.post("/gallery", async (req, res) => {
  const body = parseBody(galleryBody, req.body);
  const files = await db().storedFile.findMany({ where: { id: { in: body.fileIds }, purpose: "GALLERY" } });
  if (files.length !== body.fileIds.length) throw notFound("One of the photos");
  const first = await db().galleryItem.aggregate({ _min: { sortOrder: true } });
  let order = (first._min.sortOrder ?? 0) - body.fileIds.length;
  await db().galleryItem.createMany({
    data: body.fileIds.map((fileId, i) => ({ title: body.fileIds.length > 1 ? `${body.title} ${i + 1}` : body.title, album: body.album, takenOn: body.takenOn ? dbDate(body.takenOn) : null, fileId, sortOrder: order++ })),
  });
  await syncHomepage();
  await audit(req, { area: "CONTENT", action: "gallery.upload", summary: `uploaded ${body.fileIds.length} photo${body.fileIds.length > 1 ? "s" : ""} to ${galleryAlbumLabel[body.album]}`, entityType: "GalleryItem" });
  res.status(201).json({ ok: true });
});

contentRouter.patch("/gallery/:id", async (req, res) => {
  const id = idParam(req.params.id, "That photo");
  const body = parseBody(z.object({ title: z.string().trim().min(1).max(100), album: z.enum(GALLERY_ALBUMS), takenOn: zDate.nullable() }).partial().strict(), req.body);
  const g = await db().galleryItem.update({ where: { id }, data: { ...body, takenOn: body.takenOn === undefined ? undefined : body.takenOn ? dbDate(body.takenOn) : null } }).catch(() => null);
  if (!g) throw notFound("That photo");
  await audit(req, { area: "CONTENT", action: "gallery.update", summary: `updated the photo "${g.title}"`, entityType: "GalleryItem", entityId: id });
  res.json({ ok: true });
});

/** Drag to reorder: ids in display order. The first 8 show on the homepage. */
contentRouter.post("/gallery/reorder", async (req, res) => {
  const { ids } = parseBody(z.object({ ids: z.array(zId).min(1).max(1000) }).strict(), req.body);
  await db().$transaction(ids.map((id, i) => db().galleryItem.update({ where: { id }, data: { sortOrder: i } })));
  await syncHomepage();
  await audit(req, { area: "CONTENT", action: "gallery.reorder", summary: "reordered the gallery", entityType: "GalleryItem" });
  res.json({ ok: true });
});

contentRouter.delete("/gallery/:id", async (req, res) => {
  const g = await db().galleryItem.findUnique({ where: { id: idParam(req.params.id, "That photo") } });
  if (!g) throw notFound("That photo");
  await db().galleryItem.delete({ where: { id: g.id } });
  await removeFile(g.fileId);
  await syncHomepage();
  await audit(req, { area: "CONTENT", action: "gallery.delete", summary: `removed the photo "${g.title}"`, entityType: "GalleryItem", entityId: g.id });
  res.json({ ok: true });
});

async function syncHomepage() {
  const rows = await db().galleryItem.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], select: { id: true } });
  const top = rows.slice(0, HOMEPAGE_SLOTS).map((r) => r.id);
  await db().$transaction([
    db().galleryItem.updateMany({ where: { id: { in: top } }, data: { onHomepage: true } }),
    db().galleryItem.updateMany({ where: { id: { notIn: top } }, data: { onHomepage: false } }),
  ]);
}

// ── Achievements ──
const achievementBody = z
  .object({ title: z.string().trim().min(1).max(120), studentName: z.string().trim().max(100).default(""), detail: z.string().trim().max(300).default(""), year: z.coerce.number().int().min(2000).max(2100).optional(), fileId: zId.optional(), published: z.boolean().default(true) })
  .strict();

contentRouter.get("/achievements", async (_req, res) => {
  const rows = await db().achievement.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  res.json({ rows });
});
contentRouter.post("/achievements", async (req, res) => {
  const body = parseBody(achievementBody, req.body);
  const a = await db().achievement.create({ data: { ...body, studentName: body.studentName || null, detail: body.detail || null } });
  await audit(req, { area: "CONTENT", action: "achievement.create", summary: `added the achievement "${a.title}"`, entityType: "Achievement", entityId: a.id });
  res.status(201).json({ id: a.id });
});
contentRouter.patch("/achievements/:id", async (req, res) => {
  const id = idParam(req.params.id, "That achievement");
  const body = parseBody(achievementBody.partial().strict(), req.body);
  const a = await db().achievement.update({ where: { id }, data: body }).catch(() => null);
  if (!a) throw notFound("That achievement");
  await audit(req, { area: "CONTENT", action: "achievement.update", summary: `updated the achievement "${a.title}"`, entityType: "Achievement", entityId: id });
  res.json({ ok: true });
});
contentRouter.delete("/achievements/:id", async (req, res) => {
  const a = await db().achievement.findUnique({ where: { id: idParam(req.params.id, "That achievement") } });
  if (!a) throw notFound("That achievement");
  await db().achievement.delete({ where: { id: a.id } });
  if (a.fileId) await removeFile(a.fileId);
  await audit(req, { area: "CONTENT", action: "achievement.delete", summary: `removed the achievement "${a.title}"`, entityType: "Achievement", entityId: a.id });
  res.json({ ok: true });
});

// ── Testimonials ──
const testimonialBody = z
  .object({ author: z.string().trim().min(1).max(100), role: z.string().trim().max(60).default(""), quote: z.string().trim().min(1).max(1000), rating: z.coerce.number().int().min(1).max(5).default(5), published: z.boolean().default(true) })
  .strict();

contentRouter.get("/testimonials", async (_req, res) => {
  res.json({ rows: await db().testimonial.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }) });
});
contentRouter.post("/testimonials", async (req, res) => {
  const body = parseBody(testimonialBody, req.body);
  const t = await db().testimonial.create({ data: { ...body, role: body.role || null } });
  await audit(req, { area: "CONTENT", action: "testimonial.create", summary: `added a testimonial from ${t.author}`, entityType: "Testimonial", entityId: t.id });
  res.status(201).json({ id: t.id });
});
contentRouter.patch("/testimonials/:id", async (req, res) => {
  const id = idParam(req.params.id, "That testimonial");
  const body = parseBody(testimonialBody.partial().strict(), req.body);
  const t = await db().testimonial.update({ where: { id }, data: body }).catch(() => null);
  if (!t) throw notFound("That testimonial");
  res.json({ ok: true });
});
contentRouter.delete("/testimonials/:id", async (req, res) => {
  const t = await db().testimonial.findUnique({ where: { id: idParam(req.params.id, "That testimonial") } });
  if (!t) throw notFound("That testimonial");
  await db().testimonial.delete({ where: { id: t.id } });
  await audit(req, { area: "CONTENT", action: "testimonial.delete", summary: `removed the testimonial from ${t.author}`, entityType: "Testimonial", entityId: t.id });
  res.json({ ok: true });
});

// ── Enquiries ──
contentRouter.get("/enquiries", async (req, res) => {
  const { status } = parseQuery(z.object({ status: z.enum(["NEW", "READ", "ARCHIVED", "ALL"]).default("ALL") }), req.query);
  const rows = await db().enquiry.findMany({ where: status === "ALL" ? { status: { not: "ARCHIVED" } } : { status }, orderBy: { createdAt: "desc" }, take: 200 });
  res.json({ rows });
});
/** Permanently deletes an enquiry. To hide it but keep it, archive it instead. */
contentRouter.delete("/enquiries/:id", async (req, res) => {
  const id = idParam(req.params.id, "That enquiry");
  const e = await db().enquiry.findUnique({ where: { id }, select: { name: true, status: true } });
  if (!e) throw notFound("That enquiry");
  await db().enquiry.delete({ where: { id } });
  await audit(req, { area: "CONTENT", action: "enquiry.delete", summary: `deleted an enquiry from ${e.name} (${e.status.toLowerCase()})`, entityType: "Enquiry", entityId: id });
  res.json({ ok: true });
});
contentRouter.post("/enquiries/:id/status", async (req, res) => {
  const { status } = parseBody(z.object({ status: z.enum(["NEW", "READ", "ARCHIVED"]) }).strict(), req.body);
  const e = await db().enquiry.update({ where: { id: idParam(req.params.id, "That enquiry") }, data: { status } }).catch(() => null);
  if (!e) throw notFound("That enquiry");
  res.json({ ok: true });
});

// ───────────────────────────── Public (website) ─────────────────────────────
export const publicContentRouter = Router();
publicContentRouter.get("/", async (_req, res) => {
  const [gallery, achievements, testimonials] = await Promise.all([
    db().galleryItem.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], take: 200 }),
    db().achievement.findMany({ where: { published: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    db().testimonial.findMany({ where: { published: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
  ]);
  const link = (fileId: string | null) => (fileId ? `/v1/public/files/${signFileToken(fileId, 24 * 60)}` : null);
  res.set("Cache-Control", "public, max-age=300");
  res.json({
    gallery: gallery.map((g) => ({ id: g.id, title: g.title, album: g.album, takenOn: g.takenOn ? ymd(g.takenOn) : null, onHomepage: g.onHomepage, image: link(g.fileId) })),
    achievements: achievements.map((a) => ({ id: a.id, title: a.title, studentName: a.studentName, detail: a.detail, year: a.year, image: link(a.fileId) })),
    testimonials: testimonials.map((t) => ({ id: t.id, author: t.author, role: t.role, quote: t.quote, rating: t.rating })),
  });
});

export const enquiryIntakeRouter = Router();
const enquiryBody = z
  .object({
    name: z.string().trim().min(1).max(100),
    mobile: mobileSchema,
    email: z.string().trim().max(254).optional().default(""),
    grade: z.string().trim().max(20).optional().default(""),
    interests: z.array(z.string().trim().max(40)).max(20).default([]),
    message: z.string().trim().min(1).max(500),
    source: z.string().trim().max(30).default("website"),
    company: z.string().max(200).optional(),
  })
  .strict();

enquiryIntakeRouter.post("/", async (req, res) => {
  if (!req.ctx.internal) throw forbidden();
  const body = parseBody(enquiryBody, req.body);
  if (body.company) {
    res.status(202).json({ ok: true }); // honeypot
    return;
  }
  const e = await db().enquiry.create({
    data: { name: body.name, mobile: body.mobile, email: body.email || null, grade: body.grade || null, interests: body.interests, message: body.message, source: body.source },
  });
  await notifyAdmins({ category: "SYSTEM", title: "New website enquiry", body: `${e.name}${e.grade ? ` · ${e.grade}` : ""}: ${e.message.slice(0, 120)}`, actionLabel: "Open", href: "/admin/website?tab=enquiries" });
  res.status(201).json({ ok: true });
});
