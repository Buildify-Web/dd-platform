import type { Metadata } from "next";
import Link from "next/link";
import { btn } from "@/components/ui/kit";
import { api } from "@/lib/api";
import { getMeta, requireAdmin } from "@/lib/portal";
import { RegistrationReview, type Registration } from "./RegistrationReview";

export const metadata: Metadata = { title: "Review registration" };

/** Design: "Review registration" (Approvals / REG-0922). */
export default async function ReviewRegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/admin/approvals/registrations/${id}`);
  const [r, meta] = await Promise.all([api<Registration>(`/v1/approvals/registrations/${id}`), getMeta("admin")]);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="flex flex-wrap items-baseline gap-x-3 text-[clamp(1.4rem,2.2vw,1.65rem)] font-normal">
          {r.type === "STUDENT" ? "Review registration" : "Review staff registration"}
          <span className="text-[12.5px] text-muted">Approvals / {r.code}</span>
        </h1>
        <div className="flex gap-2">
          {r.prevId ? (
            <Link href={`/admin/approvals/registrations/${r.prevId}`} className={btn.white}>
              ‹ Previous
            </Link>
          ) : (
            <span className={`${btn.white} opacity-40`}>‹ Previous</span>
          )}
          {r.nextId ? (
            <Link href={`/admin/approvals/registrations/${r.nextId}`} className={btn.white}>
              Next ›
            </Link>
          ) : (
            <span className={`${btn.white} opacity-40`}>Next ›</span>
          )}
        </div>
      </div>
      <RegistrationReview key={r.id} r={r} courses={meta.courses.filter((c) => c.published)} />
    </>
  );
}
