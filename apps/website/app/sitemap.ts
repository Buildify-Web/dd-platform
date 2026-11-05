import type { MetadataRoute } from "next";

const routes = ["", "/courses", "/about-tutors", "/achievements", "/gallery", "/alumni", "/contact", "/enquiry"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return routes.map((r) => ({ url: `${base}${r}`, changeFrequency: "monthly", priority: r === "" ? 1 : 0.7 }));
}
