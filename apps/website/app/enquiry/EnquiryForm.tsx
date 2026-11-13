"use client";

import { useState, type FormEvent } from "react";
import { ENQUIRY_INTERESTS, GRADES, type EnquiryInterest } from "@/lib/constants";
import { MESSAGE_MAX, NAME_MAX, enquirySchema } from "@/lib/validation/enquiry";
import { ArrowUpRight, Check } from "@/components/icons";
import { cx } from "@/components/ui";

type Errors = Partial<Record<"name" | "mobile" | "email" | "grade" | "interests" | "message" | "form", string>>;

const field =
  "w-full border border-line bg-paper px-5 py-3.5 text-base text-ink placeholder:text-ghost sm:text-sm outline-none transition-colors focus:border-brand focus:bg-white aria-[invalid=true]:border-red-500";

export function EnquiryForm({ initialInterest }: { initialInterest?: EnquiryInterest }) {
  const [interests, setInterests] = useState<EnquiryInterest[]>(initialInterest ? [initialInterest] : ["Regular tuition"]);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  const toggle = (i: EnquiryInterest) =>
    setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      mobile: String(fd.get("mobile") ?? ""),
      email: String(fd.get("email") ?? ""),
      grade: String(fd.get("grade") ?? ""),
      interests,
      message,
      company: String(fd.get("company") ?? ""),
    };

    const parsed = enquirySchema.safeParse(payload);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0]) as keyof Errors;
        if (!next[k]) next[k] = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setStatus("sending");
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; fieldErrors?: Errors };
      if (!res.ok) {
        setErrors({ ...(body.fieldErrors ?? {}), form: body.error ?? "Something went wrong. Please try again." });
        setStatus("idle");
        return;
      }
      setStatus("sent");
    } catch {
      setErrors({ form: "Network error. Please check your connection and try again." });
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="flex min-h-[420px] flex-col items-center justify-center text-center">
        <span className="grid size-14 place-items-center rounded-full bg-sun text-ink">
          <Check className="size-7" strokeWidth={2.4} />
        </span>
        <h2 className="mt-6 text-2xl font-medium text-ink">Thank you! Your enquiry has been sent.</h2>
        <p className="mt-2 max-w-sm text-sm text-ink-soft">
          We’ll get back to you with timings, fees and the right batch — usually within one working day.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setMessage("");
          }}
          className="btn-gloss btn-gloss-light mt-8 rounded-full bg-mist px-6 py-3 text-sm text-ink hover:bg-sun"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  const err = (k: keyof Errors) =>
    errors[k] ? (
      <p id={`${k}-error`} className="mt-1.5 pl-4 text-xs text-red-600">
        {errors[k]}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} noValidate aria-describedby={errors.form ? "form-error" : undefined}>
      <h2 className="text-2xl font-normal text-ink">Enquiry form</h2>

      <div className="mt-6 grid gap-x-3 gap-y-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm text-ink">Your name</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={NAME_MAX}
            placeholder="e.g. Priya Raman"
            className={cx(field, "rounded-full")}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {err("name")}
        </div>
        <div>
          <label htmlFor="mobile" className="mb-2 block text-sm text-ink">Mobile number</label>
          <input
            id="mobile"
            name="mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            pattern="[0-9]{10}"
            placeholder="10-digit number"
            className={cx(field, "rounded-full")}
            aria-invalid={!!errors.mobile}
            aria-describedby={errors.mobile ? "mobile-error" : undefined}
            onInput={(e) => {
              const el = e.currentTarget;
              el.value = el.value.replace(/\D/g, "").slice(0, 10);
            }}
          />
          {err("mobile")}
        </div>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm text-ink">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            placeholder="you@example.com"
            className={cx(field, "rounded-full")}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {err("email")}
        </div>
        <div>
          <label htmlFor="grade" className="mb-2 block text-sm text-ink">Student’s grade</label>
          <div className="relative">
            <select
              id="grade"
              name="grade"
              defaultValue=""
              className={cx(field, "appearance-none rounded-full pr-10 font-medium")}
              aria-invalid={!!errors.grade}
              aria-describedby={errors.grade ? "grade-error" : undefined}
            >
              <option value="" disabled>
                Select grade
              </option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute right-5 top-1/2 size-4 -translate-y-1/2 text-ink" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
          {err("grade")}
        </div>
      </div>

      <fieldset className="mt-6">
        <legend className="mb-3 text-sm text-ink">Interested in</legend>
        <div className="flex flex-wrap gap-2">
          {ENQUIRY_INTERESTS.map((i) => {
            const on = interests.includes(i);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(i)}
                className={cx(
                  "rounded-full px-4 py-2.5 text-[0.8rem] text-ink transition-all hover:-translate-y-px",
                  on ? "bg-sun font-semibold" : "bg-paper hover:bg-mist",
                )}
              >
                {i}
              </button>
            );
          })}
        </div>
        {err("interests")}
      </fieldset>

      <div className="mt-6">
        <label htmlFor="message" className="mb-2 block text-sm text-ink">Your message</label>
        <textarea
          id="message"
          name="message"
          rows={4}
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
          placeholder="Ask about courses, timings, fees or sessions"
          className={cx(field, "resize-none rounded-[1rem] py-4")}
          aria-invalid={!!errors.message}
          aria-describedby={cx("message-count", errors.message && "message-error") || undefined}
        />
        <div className="mt-1.5 flex justify-between">
          <span>{err("message")}</span>
          <span id="message-count" className="text-xs text-ghost" aria-live="polite">
            {message.length} / {MESSAGE_MAX}
          </span>
        </div>
      </div>

      {/* Honeypot: hidden from people and assistive tech, bots tend to fill it */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {errors.form ? (
        <p id="form-error" role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.form}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "sending"}
        className="btn-gloss group mt-5 inline-flex items-center gap-8 rounded-full bg-ink py-2 pl-7 pr-2 text-sm text-white hover:bg-brand disabled:opacity-70"
      >
        {status === "sending" ? "Sending…" : "Submit enquiry"}
        <span className="grid size-10 place-items-center rounded-full bg-sun text-ink transition-transform duration-300 group-hover:rotate-45">
          <ArrowUpRight className="size-4" />
        </span>
      </button>
    </form>
  );
}
