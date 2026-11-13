import { existsSync } from "node:fs";
import { join } from "node:path";
import { reviewPhotoSlug, type Testimonial } from "@/content/people";

/**
 * Attach a reviewer photo when public/images/reviews/<slug>.(webp|jpg|jpeg|png) exists, so photos
 * can be added just by dropping files in (no code change). Missing → the UI shows initials.
 * Import only from server components (reads the filesystem) (works in standalone Docker when public/ sits next to server.js).
 */
const REVIEW_DIR = join(process.cwd(), "public", "images", "reviews");

export function withReviewPhotos(items: Testimonial[]): Testimonial[] {
  return items.map((t) => {
    const slug = reviewPhotoSlug(t.name);
    const ext = ["webp", "jpg", "jpeg", "png"].find((e) => existsSync(join(REVIEW_DIR, `${slug}.${e}`)));
    return ext ? { ...t, photo: `/images/reviews/${slug}.${ext}` } : t;
  });
}

/** Initials from a reviewer's name, e.g. "Christy Sandra Fernando B" → "CS". */
export function reviewerInitials(name: string) {
  const parts = name.replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}
