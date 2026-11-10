"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { albums, type Album, type GalleryItem } from "@/content/gallery";
import { ArrowLeft, ArrowRight, Close, Expand, Plus } from "@/components/icons";
import { cx } from "@/components/ui";

const PAGE = 12;

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [filter, setFilter] = useState<Album | "All">("All");
  const [visible, setVisible] = useState(PAGE);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const filtered = filter === "All" ? items : items.filter((i) => i.album === filter);
  const shown = filtered.slice(0, visible);
  const counts = (a: Album | "All") => (a === "All" ? items.length : items.filter((i) => i.album === a).length);
  const tabs = (["All", ...albums] as const).filter((a) => counts(a) > 0);
  const open = openIndex === null ? null : (filtered[openIndex] ?? null);

  const step = useCallback(
    (dir: 1 | -1) => setOpenIndex((i) => (i === null ? i : (i + dir + filtered.length) % filtered.length)),
    [filtered.length],
  );

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="section-title text-4xl text-ink md:text-[2.75rem]">Browse the albums</h2>
          <p className="mt-3 text-sm text-muted">
            {filtered.length} {filtered.length === 1 ? "photo" : "photos"}
            {filter === "All" ? "" : ` in ${filter}`}
          </p>
        </div>
        <div role="tablist" aria-label="Albums" className="no-scrollbar flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-mist p-1">
          {tabs.map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={filter === a}
              onClick={() => {
                setFilter(a);
                setVisible(PAGE);
              }}
              className={cx(
                "inline-flex items-center gap-2 whitespace-nowrap rounded-full py-2.5 pl-5 pr-4 text-[0.8rem] text-ink transition-colors",
                filter === a ? "bg-sun font-medium" : "hover:bg-white",
              )}
            >
              {a}
              <span
                className={cx(
                  "grid min-w-5 place-items-center rounded-full px-1.5 text-[0.65rem] leading-5",
                  filter === a ? "bg-ink text-white" : "bg-white text-muted",
                )}
              >
                {counts(a)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {shown.map((it, i) => (
          <li key={it.id} className="mb-4 break-inside-avoid">
            <figure className="lift rounded-[1.25rem] bg-frame p-1.5">
              <button
                type="button"
                onClick={() => setOpenIndex(i)}
                aria-label={`View photo: ${it.caption}`}
                className="group relative block w-full overflow-hidden rounded-[1rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <Image
                  src={it.photo}
                  alt={it.caption}
                  width={it.width}
                  height={it.height}
                  sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                  className="h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="pointer-events-none absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/95 text-ink opacity-0 shadow-sm transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Expand className="size-3.5" />
                </span>
              </button>
              <figcaption className="flex items-center justify-between gap-3 px-3 pb-2.5 pt-3">
                <p className="min-w-0 truncate text-[0.9rem] text-ink">{it.caption}</p>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[0.7rem] text-muted">{it.album}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      {shown.length === 0 ? <p className="py-10 text-center text-sm text-muted">No photos in this album yet.</p> : null}

      {visible < filtered.length ? (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE)}
            className="btn-gloss group inline-flex items-center gap-6 rounded-full bg-ink py-1.5 pl-6 pr-1.5 text-sm text-white hover:bg-brand"
          >
            Load more photos
            <span className="grid size-8 place-items-center rounded-full bg-white text-ink transition-transform duration-300 group-hover:rotate-90">
              <Plus className="size-4" />
            </span>
          </button>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        onClose={() => setOpenIndex(null)}
        onClick={(e) => e.target === e.currentTarget && setOpenIndex(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        className="m-auto w-[min(94vw,1100px)] max-w-none rounded-[1.25rem] bg-white p-0 backdrop:bg-ink/80 backdrop:backdrop-blur-sm"
        aria-label={open?.caption ?? "Photo"}
      >
        {open && openIndex !== null ? (
          <div className="p-2">
            <div className="relative grid place-items-center overflow-hidden rounded-[1rem] bg-ink">
              <Image
                key={open.id}
                src={open.photo}
                alt={open.caption}
                width={open.width}
                height={open.height}
                sizes="94vw"
                className="h-auto max-h-[75vh] w-auto max-w-full object-contain"
              />
              {filtered.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow transition-colors hover:bg-sun"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow transition-colors hover:bg-sun"
                  >
                    <ArrowRight className="size-4" />
                  </button>
                </>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-4 px-3 py-4">
              <div className="min-w-0">
                <p className="truncate text-base text-ink">{open.caption}</p>
                <p className="text-xs text-muted">
                  {open.album}
                  {open.date ? ` · ${open.date}` : ""} · {openIndex + 1} of {filtered.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenIndex(null)}
                aria-label="Close"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-mist text-ink hover:bg-sun"
              >
                <Close className="size-4" />
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
