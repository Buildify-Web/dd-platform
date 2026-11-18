"use client";

import { AUTH_ERRORS } from "@dd/shared/auth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/lib/actions";
import { ICheck, IClose, ISearch, IWarn } from "../portal/icons";
import { btn, cx, inputCls } from "./kit";

// ───────────────────────────── Toasts ─────────────────────────────
type Toast = { id: number; tone: "ok" | "error"; text: string };
const ToastCtx = createContext<(tone: Toast["tone"], text: string) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((tone: Toast["tone"], text: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x.slice(-3), { id, tone, text }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), tone === "error" ? 6500 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cx(
              "anim-rise pointer-events-auto flex max-w-md items-start gap-2.5 rounded-2xl px-4 py-3 text-[13.5px] shadow-[0_18px_40px_-18px_rgba(23,38,15,.55)]",
              t.tone === "ok" ? "bg-ink text-white" : "bg-danger-ink text-white",
            )}
          >
            {t.tone === "ok" ? <ICheck className="mt-px size-4 shrink-0 text-sun" /> : <IWarn className="mt-px size-4 shrink-0" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/**
 * Runs a server action with a pending state and a toast. Session expiry sends the user to
 * "Session expired"; field errors are returned so forms can show them inline.
 */
export function useAction() {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = useCallback(
    <T,>(fn: () => Promise<ActionResult<T>>, opts: { success?: string | ((d: T) => string); onOk?: (d: T) => void; onError?: (e: { message: string; fields?: Record<string, string> }) => void } = {}) =>
      new Promise<ActionResult<T>>((resolve) => {
        start(async () => {
          let r: ActionResult<T>;
          try {
            r = await fn();
          } catch {
            r = { ok: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } };
          }
          if (r.ok) {
            const msg = typeof opts.success === "function" ? opts.success(r.data) : opts.success;
            if (msg) toast("ok", msg);
            opts.onOk?.(r.data);
          } else if (r.error.code === AUTH_ERRORS.SESSION_EXPIRED || r.error.code === AUTH_ERRORS.UNAUTHENTICATED) {
            router.push(`/session-expired?portal=${location.pathname.startsWith("/staff") ? "staff" : "admin"}`);
          } else {
            toast("error", r.error.message);
            opts.onError?.(r.error);
          }
          resolve(r);
        });
      }),
    [router, toast],
  );
  return [pending, run] as const;
}

/** A button that runs an action (optionally after a confirm dialog). */
export function ActionButton({
  action,
  children,
  className = btn.whiteSm,
  success,
  confirm,
  disabled,
  title,
  onDone,
}: {
  action: () => Promise<ActionResult<unknown>>;
  children: ReactNode;
  className?: string;
  success?: string;
  confirm?: { title: string; body?: ReactNode; confirmLabel?: string; danger?: boolean };
  disabled?: boolean;
  title?: string;
  onDone?: () => void;
}) {
  const [pending, run] = useAction();
  const [open, setOpen] = useState(false);
  const go = () => run(action, { success, onOk: () => (setOpen(false), onDone?.()) });
  return (
    <>
      <button type="button" title={title} aria-label={title} className={className} disabled={disabled || pending} onClick={() => (confirm ? setOpen(true) : void go())}>
        {pending && !confirm ? <span className="spinner size-3.5" /> : null}
        {children}
      </button>
      {confirm && (
        <Dialog open={open} onClose={() => setOpen(false)} title={confirm.title}>
          {confirm.body && <div className="text-[14px] text-ink-soft">{confirm.body}</div>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btn.white} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className={confirm.danger ? btn.danger : btn.dark} disabled={pending} onClick={() => void go()}>
              {pending && <span className="spinner" />}
              {confirm.confirmLabel ?? "Confirm"}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}

// ───────────────────────────── Dialog ─────────────────────────────
export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cx(
        "m-auto max-h-[90dvh] w-[min(94vw,520px)] overflow-visible rounded-[22px] bg-transparent p-0 backdrop:bg-ink/55 backdrop:backdrop-blur-[2px]",
        wide && "w-[min(94vw,760px)]",
      )}
    >
      {open && (
        <div className="anim-rise max-h-[90dvh] overflow-y-auto rounded-[22px] bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-[18px] font-normal text-ink">{title}</h2>
            <button type="button" onClick={onClose} className="-m-1 grid size-8 place-items-center rounded-full text-muted hover:bg-soft hover:text-ink" aria-label="Close">
              <IClose className="size-4" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

// ───────────────────────────── URL-driven filters ─────────────────────────────
/** Updates one search param (and resets `page`). */
export function useParamSetter() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const set = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (!("page" in patch)) next.delete("page");
      const q = next.toString();
      start(() => router.replace(`${pathname}${q ? `?${q}` : ""}`, { scroll: false }));
    },
    [pathname, router, sp],
  );
  return [pending, set, sp] as const;
}

export function FilterSelect({ name, value, options, label, className, clear = [] }: { name: string; value: string; options: { value: string; label: string }[]; label: string; className?: string; clear?: string[] }) {
  const [, set] = useParamSetter();
  return (
    <SelectBox aria-label={label} value={value} onChange={(v) => set({ [name]: v, ...Object.fromEntries(clear.map((c) => [c, null])) })} options={options} className={className} />
  );
}

/** Styled native select with a chevron. */
export function SelectBox({
  value,
  onChange,
  options,
  className,
  placeholder,
  disabled,
  invalid,
  ...aria
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  "aria-label"?: string;
  id?: string;
}) {
  return (
    <span className={cx("relative block min-w-0", className)}>
      <select
        {...aria}
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cx(inputCls, "cursor-pointer appearance-none pr-9 [text-overflow:ellipsis]")}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="m6 10 6 6 6-6" />
      </svg>
    </span>
  );
}

export function SearchBox({ name = "q", value, placeholder, className }: { name?: string; value: string; placeholder: string; className?: string }) {
  const [, set] = useParamSetter();
  const [v, setV] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  return (
    <label className={cx("relative block", className)}>
      <span className="sr-only">{placeholder}</span>
      <ISearch className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={v}
        placeholder={placeholder}
        onChange={(e) => {
          setV(e.target.value);
          clearTimeout(timer.current);
          const next = e.target.value;
          timer.current = setTimeout(() => set({ [name]: next.trim() }), 350);
        }}
        className="h-11 w-full rounded-full border border-transparent bg-soft pr-4 pl-10 text-base text-ink outline-none placeholder:text-muted focus:border-ink/20 focus:bg-white sm:text-[14px]"
      />
    </label>
  );
}

/** Pill segmented control (Morning / Evening, Group / One-on-one). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  disabled,
  size = "md",
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; disabled?: boolean }[];
  disabled?: boolean;
  size?: "sm" | "md";
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx("inline-flex max-w-full rounded-full bg-soft p-1", disabled && "opacity-60")}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          disabled={disabled || o.disabled}
          onClick={() => onChange(o.value)}
          className={cx(
            "shrink-0 rounded-full transition-colors disabled:cursor-not-allowed",
            size === "sm" ? "h-7 px-3 text-[12.5px]" : "h-8 px-4 text-[13px]",
            o.value === value ? "bg-white text-ink shadow-[0_1px_3px_rgba(23,38,15,.12)]" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Link-free segmented filter backed by a search param. */
export function ParamSegmented({ name, value, options, label }: { name: string; value: string; options: { value: string; label: string }[]; label: string }) {
  const [, set] = useParamSetter();
  return <Segmented label={label} value={value} onChange={(v) => set({ [name]: v })} options={options} />;
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx("relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-brand" : "bg-[#d4d7cd]")}
    >
      <span className={cx("absolute top-1 size-5 rounded-full bg-white shadow transition-[left]", checked ? "left-6" : "left-1")} />
    </button>
  );
}

/** Chip toggle (grades, courses, audiences). */
export function Chip({ selected, onClick, children, disabled, tone = "ink" }: { selected: boolean; onClick: () => void; children: ReactNode; disabled?: boolean; tone?: "ink" | "sun" }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        selected ? (tone === "sun" ? "border-sun bg-sun text-ink" : "border-ink bg-ink text-white") : "border-line-2 bg-white text-ink hover:border-ink/30",
      )}
    >
      {children}
    </button>
  );
}

/** Labelled form field wrapper with an inline error. */
export function Field({ label, error, hint, children, required, className }: { label: ReactNode; error?: string; hint?: ReactNode; children: (id: string) => ReactNode; required?: boolean; className?: string }) {
  const id = useId();
  return (
    <div className={cx("min-w-0", className)}>
      <label htmlFor={id} className="mb-1.5 block text-[12.5px] text-ink-soft">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children(id)}
      {error ? <p className="mt-1.5 text-[12px] text-danger">{error}</p> : hint ? <p className="mt-1.5 text-[12px] text-muted">{hint}</p> : null}
    </div>
  );
}

/** "Copy link" button (fetches a signed link from the server, then copies it). */
export function CopyButton({ getText, label = "Copy link", className = btn.whiteSm }: { getText: () => Promise<string | null>; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const toast = useToast();
  return (
    <button
      type="button"
      className={className}
      disabled={state === "busy"}
      onClick={async () => {
        setState("busy");
        const text = await getText();
        if (!text) {
          setState("idle");
          return;
        }
        try {
          await navigator.clipboard.writeText(text);
          setState("done");
          toast("ok", "Link copied. It works for a limited time.");
          setTimeout(() => setState("idle"), 2000);
        } catch {
          setState("idle");
          toast("error", "Couldn't copy. Your browser blocked the clipboard.");
        }
      }}
    >
      {state === "done" ? "Copied" : label}
    </button>
  );
}
