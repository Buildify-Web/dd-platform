"use client";

import { GALLERY_ALBUMS, galleryAlbumLabel } from "@dd/shared/domain";
import { useState } from "react";
import { IDrag, IImage, IPlus, ITrash } from "@/components/portal/icons";
import { ActionButton, Dialog, Field, SelectBox, useAction, useToast } from "@/components/ui/client";
import { btn, cx, inputCls, textareaCls } from "@/components/ui/kit";
import { addGalleryPhotos, deleteAchievement, deleteEnquiry, deleteGalleryItem, deleteTestimonial, reorderGallery, saveAchievement, saveTestimonial, setEnquiryStatus, updateGalleryItem, uploadFile } from "@/lib/actions";

export type AchievementItem = { id: string; title: string; studentName: string | null; detail: string | null; year: number | null; published: boolean };
export type TestimonialItem = { id: string; author: string; role: string | null; quote: string; rating: number; published: boolean };
export type EnquiryItem = { id: string; status: string };

export type GalleryItem = { id: string; title: string; album: string; albumLabel: string; dateLabel: string | null; takenOn: string | null; fileId: string; onHomepage: boolean };

type Mode = "upload" | "gallery" | "achievement-new" | "achievement-edit" | "testimonial-new" | "testimonial-edit" | "enquiry";

/** One client island for the website-content screens. `mode` picks which control to render. */
export function WebsiteClient({ mode, items, slots = 8, item }: { mode: Mode; items?: GalleryItem[]; slots?: number; item?: AchievementItem | TestimonialItem | EnquiryItem }) {
  if (mode === "upload") return <UploadGallery />;
  if (mode === "gallery") return <GalleryManager items={items ?? []} slots={slots} />;
  if (mode === "achievement-new") return <AchievementDialog trigger="+ Add achievement" />;
  if (mode === "achievement-edit") return <AchievementDialog trigger="Edit" item={item as AchievementItem} />;
  if (mode === "testimonial-new") return <TestimonialDialog trigger="+ Add testimonial" />;
  if (mode === "testimonial-edit") return <TestimonialDialog trigger="Edit" item={item as TestimonialItem} />;
  const enq = item as EnquiryItem;
  return <EnquiryStatus id={enq.id} status={enq.status} />;
}

function UploadGallery() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [album, setAlbum] = useState("EVENTS");
  const [takenOn, setTakenOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, run] = useAction();
  const toast = useToast();
  const submit = async () => {
    setBusy(true);
    const ids: string[] = [];
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) return (setBusy(false), toast("error", `${f.name} is over 10 MB.`));
      const fd = new FormData();
      fd.set("file", f);
      fd.set("purpose", "GALLERY");
      const r = await uploadFile(fd);
      if (!r.ok) return (setBusy(false), toast("error", r.error.message));
      ids.push(r.data.id);
    }
    setBusy(false);
    void run(() => addGalleryPhotos({ title: title.trim() || "Photo", album, takenOn: takenOn || undefined, fileIds: ids }), {
      success: `${ids.length} photo${ids.length === 1 ? "" : "s"} added.`,
      onOk: () => (setOpen(false), setFiles([]), setTitle("")),
    });
  };
  return (
    <>
      <button type="button" className={btn.dark} onClick={() => setOpen(true)}>
        <IPlus className="size-4 text-sun" /> Upload photos
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Upload photos">
        <div className="grid gap-4">
          <label className="grid cursor-pointer place-items-center gap-2 rounded-2xl border border-dashed border-[#cfe0bf] bg-[#f4f8ef] px-4 py-8 text-center">
            <IImage className="size-6 text-brand" />
            <span className="text-[14px] font-semibold">{files.length ? `${files.length} photo${files.length > 1 ? "s" : ""} selected` : "Choose photos"}</span>
            <span className="text-[12px] text-muted">JPG / PNG / WebP · up to 10 at once · max 10 MB each</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 10))} />
          </label>
          <Field label="Caption (for a group, numbered automatically)">
            {(id) => <input id={id} maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Album">
              {(id) => <SelectBox id={id} value={album} onChange={setAlbum} options={GALLERY_ALBUMS.map((a) => ({ value: a, label: galleryAlbumLabel[a] }))} />}
            </Field>
            <Field label="Date taken (optional)">
              {(id) => <input id={id} type="date" value={takenOn} onChange={(e) => setTakenOn(e.target.value)} className={inputCls} />}
            </Field>
          </div>
          <div className="flex justify-end">
            <button type="button" className={btn.dark} disabled={!files.length || busy || pending} onClick={() => void submit()}>
              {(busy || pending) && <span className="spinner" />}
              Upload {files.length || ""}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

/** Photos in display order: drag (or ↑ ↓) to reorder; the first N show on the homepage. */
function GalleryManager({ items, slots }: { items: GalleryItem[]; slots: number }) {
  const [order, setOrder] = useState(items);
  const [drag, setDrag] = useState<string | null>(null);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [pending, run] = useAction();
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x!);
    setOrder(next);
    void run(() => reorderGallery(next.map((i) => i.id)), { success: undefined });
  };
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {order.map((g, i) => (
          <li
            key={g.id}
            draggable
            onDragStart={() => setDrag(g.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (!drag) return;
              const from = order.findIndex((x) => x.id === drag);
              move(from, i);
              setDrag(null);
            }}
            className={cx("group relative overflow-hidden rounded-[18px] border bg-white", drag === g.id ? "opacity-50" : "", i < slots ? "border-sun" : "border-line")}
          >
            <button type="button" className="block w-full text-left" onClick={() => setEditing(g)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/files/${g.fileId}`} alt={g.title} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              <span className="block px-3 py-2.5">
                <span className="block truncate text-[13.5px]">{g.title}</span>
                <span className="block text-[11.5px] text-muted">{g.albumLabel}{g.dateLabel ? ` · ${g.dateLabel}` : ""}</span>
              </span>
            </button>
            {i < slots && <span className="absolute top-2 left-2 rounded-full bg-sun px-2 py-0.5 text-[10.5px] font-semibold text-ink">Homepage</span>}
            <span className="absolute top-2 right-2 flex gap-1">
              <button type="button" aria-label="Move up" disabled={i === 0 || pending} onClick={() => move(i, i - 1)} className="grid size-7 place-items-center rounded-full bg-white/90 text-ink shadow disabled:opacity-40">↑</button>
              <button type="button" aria-label="Move down" disabled={i === order.length - 1 || pending} onClick={() => move(i, i + 1)} className="grid size-7 place-items-center rounded-full bg-white/90 text-ink shadow disabled:opacity-40">↓</button>
              <span className="grid size-7 cursor-grab place-items-center rounded-full bg-white/90 text-muted shadow" aria-hidden>
                <IDrag className="size-4" />
              </span>
            </span>
          </li>
        ))}
      </ul>
      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Photo">
        {editing && <PhotoEditor item={editing} onDone={() => setEditing(null)} />}
      </Dialog>
    </>
  );
}

function PhotoEditor({ item, onDone }: { item: GalleryItem; onDone: () => void }) {
  const [f, setF] = useState({ title: item.title, album: item.album, takenOn: item.takenOn ?? "" });
  const [pending, run] = useAction();
  return (
    <div className="grid gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/files/${item.fileId}`} alt="" className="max-h-64 w-full rounded-xl object-contain bg-frame" />
      <Field label="Caption">{(id) => <input id={id} maxLength={100} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputCls} />}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Album">{(id) => <SelectBox id={id} value={f.album} onChange={(v) => setF({ ...f, album: v })} options={GALLERY_ALBUMS.map((a) => ({ value: a, label: galleryAlbumLabel[a] }))} />}</Field>
        <Field label="Date taken">{(id) => <input id={id} type="date" value={f.takenOn} onChange={(e) => setF({ ...f, takenOn: e.target.value })} className={inputCls} />}</Field>
      </div>
      <div className="flex items-center justify-between gap-2">
        <ActionButton className={btn.dangerSm} action={() => deleteGalleryItem(item.id)} success="Photo removed." confirm={{ title: "Remove this photo?", body: "It disappears from the website.", confirmLabel: "Remove", danger: true }} onDone={onDone}>
          <ITrash className="size-4" /> Remove
        </ActionButton>
        <button
          type="button"
          className={btn.dark}
          disabled={pending}
          onClick={() => void run(() => updateGalleryItem(item.id, { title: f.title.trim(), album: f.album, takenOn: f.takenOn || null }), { success: "Photo saved.", onOk: onDone })}
        >
          {pending && <span className="spinner" />}
          Save
        </button>
      </div>
    </div>
  );
}

function AchievementDialog({ trigger, item }: { trigger: string; item?: AchievementItem }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: item?.title ?? "", studentName: item?.studentName ?? "", detail: item?.detail ?? "", year: item?.year ? String(item.year) : "", published: item?.published ?? true });
  const [pending, run] = useAction();
  return (
    <>
      <button type="button" className={item ? btn.whiteSm : btn.dark} onClick={() => setOpen(true)}>
        {trigger}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={item ? "Edit achievement" : "New achievement"}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => saveAchievement(item?.id ?? null, { title: f.title.trim(), studentName: f.studentName.trim(), detail: f.detail.trim(), year: f.year ? Number(f.year) : undefined, published: f.published }), { success: "Achievement saved.", onOk: () => setOpen(false) });
          }}
        >
          <Field label="Title" required>{(id) => <input id={id} required maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputCls} />}</Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Student">{(id) => <input id={id} maxLength={100} value={f.studentName} onChange={(e) => setF({ ...f, studentName: e.target.value })} className={inputCls} />}</Field>
            <Field label="Year">{(id) => <input id={id} inputMode="numeric" maxLength={4} value={f.year} onChange={(e) => setF({ ...f, year: e.target.value.replace(/\D/g, "") })} className={inputCls} />}</Field>
          </div>
          <Field label="Detail">{(id) => <textarea id={id} rows={2} maxLength={300} value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} className={textareaCls} />}</Field>
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} className="size-4 accent-brand" /> Show on the Achievements page
          </label>
          <div className="flex justify-between gap-2">
            {item ? <ActionButton className={btn.dangerSm} action={() => deleteAchievement(item.id)} success="Removed." confirm={{ title: "Remove this achievement?", confirmLabel: "Remove", danger: true }} onDone={() => setOpen(false)}>Remove</ActionButton> : <span />}
            <button type="submit" className={btn.dark} disabled={pending || !f.title.trim()}>
              {pending && <span className="spinner" />}
              Save
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

function TestimonialDialog({ trigger, item }: { trigger: string; item?: TestimonialItem }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ author: item?.author ?? "", role: item?.role ?? "Parent", quote: item?.quote ?? "", rating: String(item?.rating ?? 5), published: item?.published ?? true });
  const [pending, run] = useAction();
  return (
    <>
      <button type="button" className={item ? btn.whiteSm : btn.dark} onClick={() => setOpen(true)}>
        {trigger}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={item ? "Edit testimonial" : "New testimonial"}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => saveTestimonial(item?.id ?? null, { author: f.author.trim(), role: f.role.trim(), quote: f.quote.trim(), rating: Number(f.rating), published: f.published }), { success: "Testimonial saved.", onOk: () => setOpen(false) });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required>{(id) => <input id={id} required maxLength={100} value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} className={inputCls} />}</Field>
            <Field label="Role">{(id) => <input id={id} maxLength={60} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} className={inputCls} />}</Field>
          </div>
          <Field label="Quote (copy the client's words exactly)" required>{(id) => <textarea id={id} required rows={4} maxLength={1000} value={f.quote} onChange={(e) => setF({ ...f, quote: e.target.value })} className={textareaCls} />}</Field>
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} className="size-4 accent-brand" /> Show on the website
          </label>
          <div className="flex justify-between gap-2">
            {item ? <ActionButton className={btn.dangerSm} action={() => deleteTestimonial(item.id)} success="Removed." confirm={{ title: "Remove this testimonial?", confirmLabel: "Remove", danger: true }} onDone={() => setOpen(false)}>Remove</ActionButton> : <span />}
            <button type="submit" className={btn.dark} disabled={pending || !f.author.trim() || !f.quote.trim()}>
              {pending && <span className="spinner" />}
              Save
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

/** Open enquiries: mark read, archive. Archived ones: restore to the open list. Any: delete for good. */
function EnquiryStatus({ id, status }: { id: string; status: string }) {
  const [pending, run] = useAction();
  const archived = status === "ARCHIVED";
  return (
    <span className="flex flex-wrap gap-2">
      {!archived && status === "NEW" && (
        <button type="button" className={btn.whiteSm} disabled={pending} onClick={() => void run(() => setEnquiryStatus(id, "READ"), { success: "Marked as read." })}>
          Mark read
        </button>
      )}
      {archived ? (
        <button type="button" className={btn.whiteSm} disabled={pending} onClick={() => void run(() => setEnquiryStatus(id, "READ"), { success: "Moved back to open enquiries." })}>
          Restore
        </button>
      ) : (
        <button type="button" className={btn.whiteSm} disabled={pending} onClick={() => void run(() => setEnquiryStatus(id, "ARCHIVED"), { success: "Archived. See the Archived view." })}>
          Archive
        </button>
      )}
      <ActionButton
        className={btn.dangerSm}
        action={() => deleteEnquiry(id)}
        success="Enquiry deleted."
        confirm={{ title: "Delete this enquiry?", body: "It's removed for good. To keep it out of the way, archive it instead.", confirmLabel: "Delete", danger: true }}
      >
        Delete
      </ActionButton>
    </span>
  );
}
