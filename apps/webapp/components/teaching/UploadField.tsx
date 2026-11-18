"use client";

import { useRef, useState } from "react";
import { IFileUp } from "@/components/portal/icons";
import { useToast } from "@/components/ui/client";
import { cx } from "@/components/ui/kit";
import { uploadFile } from "@/lib/actions";

export type Uploaded = { id: string; name: string; size: number; mimeType: string };

const size = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/**
 * Drop zone that uploads straight away and hands back the stored file id. The server
 * re-checks the real type (magic bytes) and size for the purpose.
 */
export function UploadField({
  purpose,
  accept,
  maxMb,
  title = "Add a file",
  hint,
  value,
  onChange,
  compact,
}: {
  purpose: string;
  accept: string;
  maxMb: number;
  title?: string;
  hint: string;
  value: Uploaded | null;
  onChange: (f: Uploaded | null) => void;
  compact?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const toast = useToast();
  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) return toast("error", `File is too large. Max ${maxMb} MB.`);
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("purpose", purpose);
    const r = await uploadFile(fd);
    setBusy(false);
    if (r.ok) onChange(r.data);
    else toast("error", r.error.message);
  };
  return (
    <div
      onDragOver={(e) => (e.preventDefault(), setDrag(true))}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => (e.preventDefault(), setDrag(false), void pick(e.dataTransfer.files[0]))}
      className={cx("rounded-2xl border border-dashed text-center transition-colors", compact ? "p-4" : "px-4 py-8", drag ? "border-brand bg-ok-tint" : "border-[#cfe0bf] bg-[#f4f8ef]")}
    >
      <input ref={ref} type="file" accept={accept} hidden onChange={(e) => void pick(e.target.files?.[0])} />
      {value ? (
        <div className="flex items-center justify-between gap-3 text-left">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium">{value.name}</p>
            <p className="text-[12px] text-muted">{size(value.size)} · uploaded</p>
          </div>
          <button type="button" className="text-[13px] text-danger-ink hover:underline" onClick={() => onChange(null)}>
            Remove
          </button>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="mx-auto flex flex-col items-center gap-2">
          <span className="grid size-11 place-items-center rounded-xl border border-line bg-white text-brand">{busy ? <span className="spinner" /> : <IFileUp className="size-5" />}</span>
          <span className="text-[14px] font-semibold">{busy ? "Uploading…" : title}</span>
          <span className="text-[12px] text-muted">{hint}</span>
        </button>
      )}
    </div>
  );
}
