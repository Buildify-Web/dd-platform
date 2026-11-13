import Image from "next/image";
import type { ReactNode } from "react";
import type { Tone } from "@/content/courses";
import { CircleArrow, PersonTile, cx } from "./ui";

/**
 * Card used for tutors, alumni and achievements: photo (or silhouette tile) with
 * overlaid tag pills, and a title / subtitle row with an arrow badge underneath.
 */
export function PhotoCard({
  photo,
  tone,
  alt,
  tags,
  tagPosition = "bottom",
  title,
  subtitle,
  aspect = "aspect-[4/4.2]",
  href,
  silhouette = true,
  watermark,
}: {
  photo: string | null;
  tone: Tone;
  alt: string;
  tags: string[];
  tagPosition?: "top" | "bottom";
  title: ReactNode;
  subtitle: ReactNode;
  aspect?: string;
  href?: string;
  silhouette?: boolean;
  watermark?: ReactNode;
}) {
  const lightTile = !photo && (tone === "sun" || tone === "sage");
  const tagCls = photo ? "text-white" : lightTile ? (tone === "sun" ? "text-ink" : "text-brand") : "text-white/90";

  const media = photo ? (
    <div className={cx("relative overflow-hidden rounded-[1rem] bg-mist", aspect)}>
      <Image
        src={photo}
        alt={alt}
        fill
        sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
        className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
      />
      {tagPosition === "bottom" ? (
        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
      ) : (
        <span className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/35 to-transparent" />
      )}
    </div>
  ) : silhouette ? (
    <PersonTile tone={tone} className={cx("rounded-[1rem]", aspect)} />
  ) : (
    <div
      className={cx(
        "relative overflow-hidden rounded-[1rem]",
        aspect,
        { brand: "bg-brand", ink: "bg-ink", sun: "bg-sun", sage: "bg-sage" }[tone],
      )}
    >
      {watermark}
    </div>
  );

  const body = (
    <>
      <div className="relative">
        {media}
        <div className={cx("absolute left-3 flex flex-wrap gap-1.5", tagPosition === "bottom" ? "bottom-3" : "top-3")}>
          {tags.map((t) => (
            <span key={t} className={cx("tag-pill backdrop-blur-[2px]", tagCls)}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-4">
        <div className="min-w-0">
          <h3 className="truncate text-[0.95rem] text-ink">{title}</h3>
          <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>
        </div>
        <CircleArrow />
      </div>
    </>
  );

  const cls = "lift group block rounded-[1.25rem] bg-frame p-1.5";
  if (href) {
    return (
      <a href={href} className={cls} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {body}
      </a>
    );
  }
  return <div className={cls}>{body}</div>;
}
