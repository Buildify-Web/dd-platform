"use client";

import { PASSWORD_RULES } from "@dd/shared/auth";
import { useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Close } from "../icons";
import { ButtonArrow, cx, primaryButton } from "./ui";

const inputBase =
  "block h-11 w-full rounded-[10px] border bg-white px-3.5 text-base text-ink shadow-[0_1px_2px_rgba(23,38,15,0.04)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-ghost/80 focus:border-brand/60 focus:ring-4 focus:ring-brand/10 sm:text-[15px]";

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> & { label: string; error?: string; hint?: React.ReactNode };

/** Labelled text input (16px text on phones so iOS doesn't zoom on focus). */
export function Field({ label, error, hint, className, ...input }: InputProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[12.5px] text-ink-soft">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={cx(inputBase, error ? "border-danger/60 focus:border-danger focus:ring-danger/10" : "border-field")}
        {...input}
      />
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-[12.5px] text-danger">
          {error}
        </p>
      )}
      {hint}
    </div>
  );
}

/** Password input with the design's "Show" button inside the field. */
export function PasswordField({ label, error, className, showToggle = true, ...input }: InputProps & { showToggle?: boolean }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[12.5px] text-ink-soft">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={cx(inputBase, showToggle && "pr-[4.5rem]", error ? "border-danger/60 focus:border-danger focus:ring-danger/10" : "border-field")}
          {...input}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-controls={id}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-[5px] top-1/2 h-[34px] -translate-y-1/2 rounded-[7px] bg-[#eef0ea] px-3 text-[12.5px] text-ink-soft transition-colors hover:bg-[#e3e6de] hover:text-ink"
          >
            {visible ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Primary submit button with the arrow, showing a spinner while the server action runs. */
export function SubmitButton({ children, pendingLabel, disabled }: { children: React.ReactNode; pendingLabel: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} aria-disabled={pending || disabled} className={primaryButton}>
      {pending ? (
        <>
          <span className="spinner" aria-hidden />
          {pendingLabel}
        </>
      ) : (
        <>
          {children}
          <ButtonArrow />
        </>
      )}
    </button>
  );
}

/**
 * Live checklist under "Set a new password". Rules come from @dd/shared (same as the server).
 * Not yet met → grey dash; met → green tick; "Both passwords match" turns red once the
 * confirm field has text that differs.
 */
export function PasswordChecklist({ password, confirm }: { password: string; confirm: string }) {
  const rows = [
    ...PASSWORD_RULES.map((r) => ({ id: r.id, label: r.label, state: r.test(password) ? "ok" : "todo" })),
    { id: "match", label: "Both passwords match", state: !confirm ? "todo" : password === confirm ? "ok" : "bad" },
  ] as const;
  return (
    <ul className="mt-4 space-y-1.5 text-[12.5px]" aria-label="Password requirements">
      {rows.map((r) => (
        <li
          key={r.id}
          className={cx(
            "flex items-center gap-2.5 transition-colors duration-200",
            r.state === "ok" && "text-brand",
            r.state === "todo" && "text-muted",
            r.state === "bad" && "text-danger",
          )}
        >
          <span className="grid size-3.5 place-items-center" aria-hidden>
            {r.state === "ok" ? <Check className="size-3.5" strokeWidth={2.4} /> : r.state === "bad" ? <Close className="size-3" strokeWidth={2.4} /> : <span className="h-px w-2 bg-current" />}
          </span>
          {r.label}
          <span className="sr-only">{r.state === "ok" ? " (done)" : r.state === "bad" ? " (not yet)" : " (to do)"}</span>
        </li>
      ))}
    </ul>
  );
}

export const passwordReady = (password: string, confirm: string) =>
  PASSWORD_RULES.every((r) => r.test(password)) && password === confirm && password.trim() === password;
