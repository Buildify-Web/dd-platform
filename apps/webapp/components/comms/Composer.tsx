"use client";

import { istDate, LEARNING_MODES, learningModeLabel, SESSION_TYPES, sessionTypeLabel } from "@dd/shared/domain";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ICap, ICard, ICheck, IClip, IUser, IUsers, ITrophy } from "@/components/portal/icons";
import { UploadField, type Uploaded } from "@/components/teaching/UploadField";
import { SelectBox, useAction } from "@/components/ui/client";
import { btn, Card, cx, inputCls, Notice, textareaCls } from "@/components/ui/kit";
import { createAnnouncement, previewAudience } from "@/lib/actions";

export type AudienceGroup = { key: string; label: string; count: number; kind: string };

const TEMPLATES = [
  { label: "Holiday", title: "Holiday · ", message: "The centre will be closed on . Classes resume on ." },
  { label: "Exam / test", title: "Test on ", message: "A test is scheduled on . Portions: . Please revise and bring the required materials." },
  { label: "Event", title: "Event: ", message: "Join us for  on  at . Parents are welcome." },
  { label: "Timing change", title: "Timing change from ", message: "From , classes will run from  to . Thank you for your cooperation." },
];

const ICON: Record<string, React.ReactNode> = {
  all: <IUsers className="size-[18px]" />,
  grade: <ICap className="size-[18px]" />,
  class: <ICap className="size-[18px]" />,
  dues: <ICard className="size-[18px]" />,
  competition: <ITrophy className="size-[18px]" />,
  staff: <IUser className="size-[18px]" />,
};

/**
 * New announcement (admin) / Send class notice (staff). Text is mandatory; groups narrow the
 * audience (none selected for admin = all parents). Optional filters: course, session type,
 * learning mode. Send now or schedule.
 */
export function Composer({ groups, portal, sender, courses }: { groups: AudienceGroup[]; portal: "admin" | "staff"; sender: string; courses: { id: string; name: string }[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(groups[0] ? [groups[0].key] : []);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<Uploaded | null>(null);
  const [when, setWhen] = useState<"now" | "schedule">("now");
  const [at, setAt] = useState(`${istDate()}T18:00`);
  const [filters, setFilters] = useState({ courseId: "", sessionType: "", learningMode: "" });
  const [count, setCount] = useState<{ parents: number; staff: number; label: string } | null>(null);
  const [pending, run] = useAction();
  const toggle = (k: string) => setSelected((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  useEffect(() => {
    if (!selected.length) return;
    const t = setTimeout(() => {
      void previewAudience({ audiences: selected, filters }).then((r) => r.ok && setCount(r.data));
    }, 200);
    return () => clearTimeout(t);
  }, [selected, filters]);

  const shown = selected.length ? count : null;
  const total = shown ? shown.parents + shown.staff : 0;
  const recipients = shown ? [shown.parents ? `${shown.parents} parent${shown.parents === 1 ? "" : "s"}` : "", shown.staff ? `${shown.staff} staff` : ""].filter(Boolean).join(" + ") : "—";
  const valid = title.trim() && message.trim() && selected.length && (when === "now" || at);
  const scheduledIso = useMemo(() => (when === "schedule" && at ? `${at}:00+05:30` : undefined), [when, at]);

  const submit = (draft: boolean) =>
    run(() => createAnnouncement({ title: title.trim(), message: message.trim(), audiences: selected, filters, attachmentFileId: file?.id, scheduledFor: draft ? undefined : scheduledIso, draft }), {
      success: (d) => (draft ? "Draft saved." : d.status === "SCHEDULED" ? "Scheduled." : `Sent to ${d.recipients} recipient${d.recipients === 1 ? "" : "s"}.`),
      onOk: () => router.push(portal === "admin" ? "/admin/announcements" : "/staff/notices"),
    });

  const preview = (
    <div className="relative mx-auto w-full max-w-[340px] py-6">
      <span className="absolute top-1/2 left-1/2 aspect-square w-[118%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#f6c90e_0%,#f9d84d_55%,transparent_70%)] opacity-90" aria-hidden />
      <div className="relative mx-auto aspect-[9/18.5] w-[240px] rotate-[6deg] rounded-[38px] bg-[#1b2a17] p-[9px] shadow-[0_30px_60px_-25px_rgba(23,38,15,.8)]">
        <div className="relative h-full overflow-hidden rounded-[30px] bg-[linear-gradient(160deg,#2b7010,#17360c_70%)]">
          <span className="absolute top-2.5 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
          <p className="mt-12 text-center text-[44px] leading-none font-light text-white/90">8:00</p>
          <p className="mt-1 text-center text-[11px] text-white/70">{new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" }).format(new Date())}</p>
          <div className="mx-3 mt-5 rounded-2xl bg-white/85 p-2.5 text-ink backdrop-blur">
            <div className="flex items-center gap-1.5">
              <Image src="/logo-mark.png" alt="" width={336} height={331} className="size-4" />
              <span className="flex-1 truncate text-[10px] font-semibold">{sender}</span>
              <span className="text-[9px] text-muted">now</span>
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] font-semibold">{title || "Your title"}</p>
            <p className="line-clamp-4 text-[10px] text-ink-soft">{message || "Your message appears here."}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-3">
        {portal === "staff" && <Notice>You can send notices only to parents of students in your assigned classes. School-wide announcements are sent by admin.</Notice>}
        <Card>
          <Step n={1} title="Who should get it?" sub="Choose one or more groups" />
          {groups.length === 0 ? (
            <p className="text-[13.5px] text-muted">No classes assigned yet.</p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((g) => {
                const on = selected.includes(g.key);
                return (
                  <button
                    key={g.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(g.key)}
                    className={cx("relative rounded-2xl border p-3.5 text-left transition-colors", on ? "border-brand bg-[#eef6e7]" : "border-line bg-frame hover:border-ink/25")}
                  >
                    <span className={cx("grid size-9 place-items-center rounded-xl", on ? "bg-brand text-white" : "border border-line bg-white text-ink")}>{ICON[g.kind] ?? ICON.all}</span>
                    <span className={cx("absolute top-3 right-3 grid size-5 place-items-center rounded-full", on ? "bg-brand text-white" : "border border-[#cfd2c9] bg-white")}>{on && <ICheck className="size-3" />}</span>
                    <span className="mt-6 block text-[14px]">{g.label}</span>
                    <span className="block text-[12px] text-muted">{g.kind === "staff" ? `${g.count} staff` : `${g.count} parent${g.count === 1 ? "" : "s"}`}</span>
                  </button>
                );
              })}
            </div>
          )}
          {portal === "admin" && (
            <details className="mt-3 rounded-2xl bg-frame px-4 py-3 text-[13px]">
              <summary className="cursor-pointer text-ink-soft">More filters (optional): course, session type, learning mode</summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <SelectBox aria-label="Course" value={filters.courseId} onChange={(v) => setFilters({ ...filters, courseId: v })} options={[{ value: "", label: "Any course" }, ...courses.map((c) => ({ value: c.id, label: c.name }))]} />
                <SelectBox aria-label="Session type" value={filters.sessionType} onChange={(v) => setFilters({ ...filters, sessionType: v })} options={[{ value: "", label: "Online + offline" }, ...SESSION_TYPES.map((s) => ({ value: s, label: sessionTypeLabel(s) }))]} />
                <SelectBox aria-label="Learning mode" value={filters.learningMode} onChange={(v) => setFilters({ ...filters, learningMode: v })} options={[{ value: "", label: "Any mode" }, ...LEARNING_MODES.map((m) => ({ value: m, label: learningModeLabel(m) }))]} />
              </div>
            </details>
          )}
        </Card>

        <Card>
          <Step n={2} title="What do you want to say?" sub="Pick a template or write your own" />
          <div className="mb-4 flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <button key={t.label} type="button" className="h-9 rounded-full border border-line-2 bg-white px-4 text-[13px] hover:border-ink/30" onClick={() => (setTitle(t.title), setMessage(t.message))}>
                {t.label}
              </button>
            ))}
          </div>
          <label htmlFor="an-title" className="mb-1.5 block text-[12.5px] text-ink-soft">
            Title <span className="text-danger">*</span>
          </label>
          <input id="an-title" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          <p className="mt-1 text-right text-[11.5px] text-muted">{title.length} / 80</p>
          <label htmlFor="an-msg" className="mb-1.5 block text-[12.5px] text-ink-soft">
            Message <span className="text-danger">*</span>
          </label>
          <textarea id="an-msg" rows={4} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} className={textareaCls} />
          <p className="mt-1 text-right text-[11.5px] text-muted">{message.length} / 500</p>
          {file ? (
            <UploadField purpose="ANNOUNCEMENT" accept=".pdf,image/*" maxMb={5} hint="" value={file} onChange={setFile} compact />
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-frame p-3.5">
              <span className="grid size-9 place-items-center rounded-xl bg-sage text-brand">
                <IClip className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px]">Attach a file</span>
                <span className="block text-[12px] text-muted">PDF or image, up to 5 MB</span>
              </span>
              <AttachButton onUploaded={setFile} />
            </div>
          )}
        </Card>

        <Card>
          <Step n={3} title="When should it go?" sub="Parents get a push notification and see it in the app" />
          <div className="grid gap-2.5 sm:grid-cols-2">
            {(["now", "schedule"] as const).map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={when === w}
                onClick={() => setWhen(w)}
                className={cx("rounded-2xl border px-4 py-4 text-center transition-colors", when === w ? "border-ink bg-ink text-white" : "border-line bg-frame hover:border-ink/25")}
              >
                <span className="block text-[14.5px] font-semibold">{w === "now" ? "Send now" : "Schedule"}</span>
                <span className={cx("block text-[12px]", when === w ? "text-white/75" : "text-muted")}>{w === "now" ? "Delivered immediately" : "Pick a date and time"}</span>
              </button>
            ))}
          </div>
          {when === "schedule" && (
            <div className="mt-3 sm:w-64">
              <label htmlFor="an-at" className="mb-1.5 block text-[12.5px] text-ink-soft">
                Send at (India time)
              </label>
              <input id="an-at" type="datetime-local" min={`${istDate()}T00:00`} value={at} onChange={(e) => setAt(e.target.value)} className={inputCls} />
            </div>
          )}
        </Card>
      </div>

      <div className="grid content-start gap-3 xl:sticky xl:top-4">
        <div className="flex justify-end gap-2">
          <button type="button" className={btn.white} onClick={() => router.back()}>
            Cancel
          </button>
          <button type="button" className={btn.white} disabled={pending || !title.trim() || !message.trim() || !selected.length} onClick={() => void submit(true)}>
            Save draft
          </button>
        </div>
        <div className="hidden overflow-hidden sm:block">{preview}</div>
        <Card>
          <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
            <p className="text-[15px]">Ready to send</p>
            <span className="rounded-full bg-ok-tint px-2.5 py-0.5 text-[12px] text-brand-deep">{recipients}</span>
          </div>
          <dl className="divide-y divide-line text-[13.5px]">
            <div className="flex justify-between gap-3 py-3">
              <dt className="text-ink-soft">Audience</dt>
              <dd className="text-right">{shown?.label ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3 py-3">
              <dt className="text-ink-soft">Channels</dt>
              <dd>Push · In-app</dd>
            </div>
            <div className="flex justify-between gap-3 py-3">
              <dt className="text-ink-soft">Sender shown as</dt>
              <dd className="text-right">{sender}</dd>
            </div>
          </dl>
          <button type="button" className={cx(btn.dark, "mt-2 w-full")} disabled={pending || !valid || total === 0} onClick={() => void submit(false)}>
            {pending && <span className="spinner" />}
            {when === "now" ? "Send now" : "Schedule"}
          </button>
          {shown && total === 0 && <p className="mt-2 text-[12px] text-danger">No active recipients match this audience.</p>}
        </Card>
      </div>
    </div>
  );
}

function Step({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-ink text-[13px] font-semibold text-sun">{n}</span>
      <div>
        <h2 className="text-[15.5px] font-semibold">{title}</h2>
        <p className="text-[12.5px] text-muted">{sub}</p>
      </div>
    </div>
  );
}

function AttachButton({ onUploaded }: { onUploaded: (f: Uploaded) => void }) {
  const [open, setOpen] = useState(false);
  if (open)
    return (
      <div className="w-full basis-full">
        <UploadField purpose="ANNOUNCEMENT" accept=".pdf,image/*" maxMb={5} hint="PDF or image, up to 5 MB" value={null} onChange={(f) => f && onUploaded(f)} compact />
      </div>
    );
  return (
    <button type="button" className={btn.whiteSm} onClick={() => setOpen(true)}>
      Choose file
    </button>
  );
}
