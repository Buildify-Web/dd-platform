import { TileField } from "./TileField";

export type AsideItem = { title: string; detail: string; status: "syncing" | "done" };
export type AsideContent = {
  title: React.ReactNode;
  body: React.ReactNode;
  /** Optional photos from the school's website, shown under the text. */
  photos?: { src: string; alt: string }[];
  /** The two activity cards. A third, skeleton card is always drawn under them. */
  items: [AsideItem, AsideItem];
};

/**
 * Right-hand panel of the auth screens: white-to-green gradient, headline, the isometric
 * tile field with the yellow logo tile, and stacked glass "activity" cards.
 * The cards illustrate what the portal does. They are sample content, not live data:
 * nothing about the institute is shown before sign-in.
 */
export function AuthAside({ title, body, items, photos }: AsideContent) {
  return (
    <aside
      aria-label="About the portal"
      className="relative hidden min-h-[640px] overflow-hidden rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#f8faf5_22%,#e3ecda_48%,#b9d4a3_70%,#86b665_86%,#5f9a37_100%)] lg:flex lg:flex-col"
    >
      <TileField />

      <div className="relative z-10 max-w-[27rem] px-8 pt-[27px]">
        <h2 className="text-[clamp(1.9rem,2.55vw,2.15rem)] font-normal leading-[1.13] tracking-[-0.015em] text-ink">{title}</h2>
        <p className="mt-3 text-[15px] leading-[1.55] text-ink-soft">{body}</p>
      </div>

      {photos && photos.length > 0 && (
        <div className={`relative z-10 mt-6 grid gap-3 px-8 ${photos.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}>
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.src}
              src={p.src}
              alt={p.alt}
              loading="lazy"
              className="aspect-[4/3] w-full rounded-[14px] border border-white/60 object-cover shadow-[0_12px_28px_-18px_rgba(23,38,15,0.45)]"
            />
          ))}
        </div>
      )}

      <ul aria-hidden className="relative z-10 mt-auto flex flex-col gap-2 px-[29px] pb-[33px] pr-[30px]">
        <ActivityCard item={items[0]} className="anim-rise [animation-delay:120ms]" />
        <ActivityCard item={items[1]} className="mr-[17px] anim-rise [animation-delay:220ms]" />
        <li className="anim-rise mr-[54px] flex h-[50px] items-center gap-3 rounded-[13px] border border-white/40 bg-white/[0.14] px-4 shadow-[0_8px_24px_-16px_rgba(23,38,15,0.35)] backdrop-blur-md [animation-delay:320ms]">
          <Radio />
          <span className="flex flex-1 flex-col gap-1.5">
            <span className="h-[6px] w-[62px] rounded-full bg-white/55" />
            <span className="h-[5px] w-[107px] rounded-full bg-white/40" />
          </span>
          <Status status="done" />
        </li>
      </ul>
    </aside>
  );
}

function ActivityCard({ item, className = "" }: { item: AsideItem; className?: string }) {
  return (
    <li
      className={`flex h-[64px] items-center gap-3 rounded-[14px] border border-white/45 bg-white/[0.18] px-4 shadow-[0_10px_30px_-18px_rgba(23,38,15,0.4)] backdrop-blur-md ${className}`}
    >
      <Radio />
      <span className="min-w-0 flex-1 leading-tight [text-shadow:0_1px_2px_rgba(23,38,15,0.12)]">
        <span className="block truncate text-[13px] text-white">{item.title}</span>
        <span className="mt-1 block truncate text-[11px] text-white/90">{item.detail}</span>
      </span>
      <Status status={item.status} />
    </li>
  );
}

function Radio() {
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full border border-white/60 bg-white/30">
      <span className="size-2.5 rounded-full bg-white" />
    </span>
  );
}

function Status({ status }: { status: AsideItem["status"] }) {
  const syncing = status === "syncing";
  return (
    <span className="flex shrink-0 items-center gap-2 text-[11px] text-white/95">
      {syncing ? "Syncing…" : "Done"}
      <span
        data-pulse={syncing}
        className={`status-dot ring-[1.5px] ring-offset-0 ${syncing ? "bg-sun text-sun ring-sun/50" : "bg-brand-bright text-brand-bright ring-brand-bright/40"}`}
      />
    </span>
  );
}
