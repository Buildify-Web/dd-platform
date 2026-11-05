"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { albums, type Album, type GalleryItem } from "@/content/gallery";
import { Close, Expand, Plus } from "@/components/icons";
import { cx } from "@/components/ui";

const PAGE = 12;
const toneBg = { sun: "bg-sun", ink: "bg-ink", sage: "bg-sage", brand: "bg-brand" } as const;
const toneTag = { sun: "text-ink", ink: "text-white/90", sage: "text-brand", brand: "text-white/90" } as const;

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [filter, setFilter] = useState<Album | "All">("All");
  const [visible, setVisible] = useState(PAGE);
  const [open, setOpen] = useState<GalleryItem | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const filtered = filter === "All" ? items : items.filter((i) => i.album === filter);
  const shown = filtered.slice(0, visible);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <h2 className="section-title text-4xl text-ink md:text-[2.75rem]">Browse the albums</h2>
        <div role="tablist" aria-label="Albums" className="no-scrollbar flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-mist p-1">
          {(["All", ...albums] as const).map((a) => (
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
                "whitespace-nowrap rounded-full px-5 py-2.5 text-[0.8rem] text-ink transition-colors md:px-6",
                filter === a ? "bg-sun font-medium" : "hover:bg-white",
              )}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-12 columns-1 gap-3 sm:columns-2 lg:columns-4">
        {shown.map((it) => (
          <li key={it.id} className="mb-3 break-inside-avoid">
            <figure className="group rounded-[1.25rem] bg-frame p-1.5">
              <div
                className={cx(
                  "relative overflow-hidden rounded-[1rem]",
                  it.tall ? "aspect-[4/3.5]" : "aspect-[4/1.15]",
                  !it.photo && toneBg[it.tone],
                )}
              >
                {it.photo ? (
                  <Image
                    src={it.photo}
                    alt={it.caption}
                    fill
                    sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : null}
                <span
                  className={cx(
                    "tag-pill absolute bottom-3 left-3",
                    it.photo ? "text-white backdrop-blur-[2px]" : toneTag[it.tone],
                  )}
                >
                  {it.album}
                </span>
              </div>
              <figcaption className="flex items-center justify-between gap-3 px-3 pb-3 pt-4">
                <div className="min-w-0">
                  <p className="truncate text-[0.9rem] text-ink">{it.caption}</p>
                  <p className="mt-0.5 text-xs text-muted">{it.date}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(it)}
                  aria-label={`View ${it.caption}`}
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-ink transition-colors hover:bg-sun"
                >
                  <Expand className="size-3.5" />
                </button>
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
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === e.currentTarget && setOpen(null)}
        className="m-auto w-[min(92vw,960px)] rounded-[1.25rem] bg-white p-0 backdrop:bg-ink/70"
        aria-label={open?.caption ?? "Photo"}
      >
        {open ? (
          <div className="p-2">
            <div className={cx("relative aspect-[4/3] overflow-hidden rounded-[1rem]", !open.photo && toneBg[open.tone])}>
              {open.photo ? <Image src={open.photo} alt={open.caption} fill sizes="92vw" className="object-cover" /> : null}
            </div>
            <div className="flex items-center justify-between gap-4 px-3 py-4">
              <div>
                <p className="text-base text-ink">{open.caption}</p>
                <p className="text-xs text-muted">
                  {open.album} · {open.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label="Close"
                className="grid size-10 place-items-center rounded-full bg-mist text-ink hover:bg-sun"
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
