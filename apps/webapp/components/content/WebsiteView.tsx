import { galleryAlbumLabel, GALLERY_ALBUMS } from "@dd/shared/domain";
import Link from "next/link";
import { IGlobe, IImage, ITrophy } from "@/components/portal/icons";

import { btn, Card, cx, Empty, PageHeader, Pill, PillTabs } from "@/components/ui/kit";
import { api, param, qs, type SearchParams } from "@/lib/api";
import { WebsiteClient, type GalleryItem } from "./WebsiteClient";

type Overview = { gallery: number; achievements: number; testimonials: number; enquiries: number };
type Gallery = { homepageSlots: number; rows: GalleryItem[] };
type Achievement = { id: string; title: string; studentName: string | null; detail: string | null; year: number | null; fileId: string | null; published: boolean };
type Testimonial = { id: string; author: string; role: string | null; quote: string; rating: number; published: boolean };
type Enquiry = { id: string; name: string; mobile: string; email: string | null; grade: string | null; interests: string[]; message: string; createdAt: string; status: string };

const TABS = [
  { key: "gallery", label: "Gallery", sub: "Photos on the site" },
  { key: "achievements", label: "Achievements", sub: "Student wins" },
  { key: "testimonials", label: "Testimonials", sub: "Parent & alumni quotes" },
  { key: "enquiries", label: "Enquiries", sub: "From the contact form" },
] as const;

/** Design: "Website content" (System / Website content). */
export async function WebsiteView({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const tab = (TABS.find((t) => t.key === param(sp.tab))?.key ?? "gallery") as (typeof TABS)[number]["key"];
  const album = param(sp.album);
  const view = param(sp.view) === "archived" ? "archived" : "open";
  const [o] = await Promise.all([api<Overview>("/v1/content/overview")]);
  const base = "/admin/website";
  return (
    <>
      <PageHeader
        title="Website content"
        crumb="System / Website content"
        actions={
          <>
            <a href={process.env.WEBSITE_URL || "http://localhost:3000"} target="_blank" rel="noopener noreferrer" className={btn.white}>
              <IGlobe className="size-4" />
              View website ↗
            </a>
          </>
        }
      />
      <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {TABS.map((t) => (
          <Link key={t.key} href={`${base}${t.key === "gallery" ? "" : `?tab=${t.key}`}`} aria-current={tab === t.key ? "page" : undefined} className={cx("lift flex items-center justify-between rounded-[18px] px-4 py-3.5", tab === t.key ? "bg-ink text-white" : "border border-line bg-white")}>
            <span>
              <span className="block text-[14.5px]">{t.label}</span>
              <span className={cx("block text-[12px]", tab === t.key ? "text-white/70" : "text-muted")}>{t.sub}</span>
            </span>
            <span className={cx("text-[20px] font-semibold tabular-nums", tab === t.key ? "text-sun" : "")}>
              {t.key === "gallery" ? o.gallery : t.key === "achievements" ? o.achievements : t.key === "testimonials" ? o.testimonials : o.enquiries}
            </span>
          </Link>
        ))}
      </div>

      {tab === "gallery" && (
        <>
          {/* Toolbar sits on the same edges as the photo grid below it: tabs left, upload right. */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 max-w-full">
              <PillTabs active={album || "all"} tabs={[{ key: "all", label: "All", href: base }, ...GALLERY_ALBUMS.map((a) => ({ key: a, label: galleryAlbumLabel[a], href: `${base}?album=${a}` }))]} />
            </div>
            <div className="shrink-0">
              <WebsiteClient mode="upload" />
            </div>
          </div>
          <GalleryGrid album={album} />
        </>
      )}
      {tab === "achievements" && <Achievements />}
      {tab === "testimonials" && <Testimonials />}
      {tab === "enquiries" && <Enquiries view={view} />}
    </>
  );
}

async function GalleryGrid({ album }: { album: string }) {
  const g = await api<Gallery>(`/v1/content/gallery${qs({ album })}`);
  if (!g.rows.length)
    return (
      <Card>
        <Empty title="No photos yet" icon={<IImage className="size-5" />}>
          Upload photos. The first {g.homepageSlots} show on the homepage in this order.
        </Empty>
      </Card>
    );
  return (
    <>
      <p className="mb-3 text-[12.5px] text-muted">Drag to reorder · first {g.homepageSlots} show on the homepage</p>
      <WebsiteClient mode="gallery" items={g.rows} slots={g.homepageSlots} />
    </>
  );
}

async function Achievements() {
  const { rows } = await api<{ rows: Achievement[] }>("/v1/content/achievements");
  return (
    <>
      <div className="mb-3 flex justify-end">
        <WebsiteClient mode="achievement-new" />
      </div>
      {rows.length === 0 ? (
        <Card>
          <Empty title="No achievements yet" icon={<ITrophy className="size-5" />}>
            Add student wins to show on the Achievements page.
          </Empty>
        </Card>
      ) : (
        <ul className="grid gap-2.5">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-[18px] border border-line bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">{a.title}</p>
                <p className="text-[12.5px] text-muted">
                  {[a.studentName, a.year, a.detail].filter(Boolean).join(" · ")}
                </p>
              </div>
              {a.published ? <Pill tone="green">On site</Pill> : <Pill>Hidden</Pill>}
              <WebsiteClient mode="achievement-edit" item={a} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function Testimonials() {
  const { rows } = await api<{ rows: Testimonial[] }>("/v1/content/testimonials");
  return (
    <>
      <div className="mb-3 flex justify-end">
        <WebsiteClient mode="testimonial-new" />
      </div>
      {rows.length === 0 ? (
        <Card>
          <Empty title="No testimonials yet" />
        </Card>
      ) : (
        <ul className="grid gap-2.5 md:grid-cols-2">
          {rows.map((t) => (
            <li key={t.id} className="rounded-[18px] border border-line bg-white p-4">
              <p className="text-[13.5px] text-ink-soft">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-[13px]">
                  <span className="font-semibold">{t.author}</span>
                  {t.role ? <span className="text-muted"> · {t.role}</span> : null}
                </p>
                <div className="flex items-center gap-2">
                  {t.published ? <Pill tone="green">On site</Pill> : <Pill>Hidden</Pill>}
                  <WebsiteClient mode="testimonial-edit" item={t} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Open enquiries (new and read) or the archived ones. Archived enquiries are kept until restored or deleted. */
async function Enquiries({ view }: { view: "open" | "archived" }) {
  const { rows } = await api<{ rows: Enquiry[] }>(`/v1/content/enquiries?status=${view === "archived" ? "ARCHIVED" : "ALL"}`);
  const switcher = (
    <div className="mb-3">
      <PillTabs
        active={view}
        tabs={[
          { key: "open", label: "Open", href: "/admin/website?tab=enquiries" },
          { key: "archived", label: "Archived", href: "/admin/website?tab=enquiries&view=archived" },
        ]}
      />
    </div>
  );
  if (!rows.length)
    return (
      <>
        {switcher}
        <Card>
          <Empty title={view === "archived" ? "No archived enquiries" : "No enquiries"}>
            {view === "archived" ? "Archived enquiries wait here until you restore or delete them." : "Messages from the website contact form appear here."}
          </Empty>
        </Card>
      </>
    );
  return (
    <>
      {switcher}
    <ul className="grid gap-2.5">
      {rows.map((e) => (
        <li key={e.id} className={cx("rounded-[18px] border bg-white p-4", e.status === "NEW" ? "border-sun" : "border-line")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-[15px] font-semibold">
              {e.name} <span className="font-normal text-muted">· {e.mobile}{e.email ? ` · ${e.email}` : ""}</span>
            </p>
            <span className="text-[12px] text-muted">{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(e.createdAt))}</span>
          </div>
          <p className="mt-1 text-[12.5px] text-muted">
            {[e.grade, ...e.interests].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-2 text-[14px]">{e.message}</p>
          <div className="mt-3 flex justify-end">
            <WebsiteClient mode="enquiry" item={{ id: e.id, status: e.status }} />
          </div>
        </li>
      ))}
    </ul>
    </>
  );
}

