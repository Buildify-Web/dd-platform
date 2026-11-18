"use client";

import { emailSchema } from "@dd/shared/auth";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Field, SubmitButton } from "@/components/auth/fields";
import { FormAlert, Heading, IconTile, OrDivider, primaryButton, secondaryButton, StepBars } from "@/components/auth/ui";
import { ArrowLeft, Lock, Mail, MailCheck } from "@/components/icons";
import type { ForgotState } from "@/lib/form-state";
import { forgotAction } from "../actions";

const RESEND_AFTER_S = 60;

export function ForgotForm({ mode, backHref }: { mode: "reset" | "activation"; backHref: string }) {
  const [state, action] = useActionState(forgotAction, {} as ForgotState);
  const [email, setEmail] = useState("");
  const [clientError, setClientError] = useState<string>();
  const activation = mode === "activation";

  const validate = (e: React.FormEvent) => {
    const ok = emailSchema.safeParse(email).success;
    setClientError(ok ? undefined : email.trim() ? "Enter a valid email address." : "Enter your email address.");
    if (!ok) e.preventDefault();
  };

  if (state.sent) {
    return (
      <div className="anim-rise">
        <IconTile tone="green">
          <MailCheck />
        </IconTile>
        <StepBars step={1} />
        <Heading
          className="mt-5"
          title="Check your email"
          lead={
            activation
              ? `If ${state.sent.to} is approved and waiting for activation, new login details are on their way.`
              : `If ${state.sent.to} has an admin or staff account, a reset link is on its way. It works once and expires in ${state.sent.expiresInMinutes} minutes.`
          }
        />
        <p className="mt-3 text-center text-[12.5px] text-muted">Not in your inbox? Check spam or promotions.</p>
        <Link href={backHref} className={`${primaryButton} mt-6`}>
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>
        <form action={action} onSubmit={validate} className="mt-3 text-center">
          <input type="hidden" name="email" value={email} />
          <ResendButton sentAt={state.sent.at} />
        </form>
      </div>
    );
  }

  return (
    <>
      <IconTile tone="white">{activation ? <Mail /> : <Lock />}</IconTile>
      <StepBars step={1} />
      <Heading
        className="mt-5"
        title={activation ? "Request new login details" : "Forgot password?"}
        lead={
          activation
            ? "Approved but not activated yet? We'll email a new temporary password to your registered address."
            : "Works for admin and staff. We'll email a secure reset link to your registered address."
        }
      />
      <form action={action} noValidate onSubmit={validate} className="mt-6">
        {state.error && (
          <FormAlert key={JSON.stringify(state.error)} className="mb-4">
            {state.error.message}
          </FormAlert>
        )}
        <Field
          label="Registered email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (clientError) setClientError(undefined);
          }}
          error={clientError ?? state.fields?.email}
        />
        <div className="mt-6">
          <SubmitButton pendingLabel="Sending…">{activation ? "Send new details" : "Send reset link"}</SubmitButton>
        </div>
        <OrDivider />
        <Link href={backHref} className={secondaryButton}>
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>
      </form>
    </>
  );
}

/** "Send again", available a minute after each send. */
function ResendButton({ sentAt }: { sentAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const wait = Math.max(0, RESEND_AFTER_S - Math.floor((now - sentAt) / 1000));
  return (
    <button
      type="submit"
      disabled={wait > 0}
      className="-my-2 py-2 text-[13px] font-medium text-brand underline-offset-4 hover:underline disabled:cursor-default disabled:font-normal disabled:text-muted disabled:no-underline"
    >
      {wait > 0 ? `Didn't get it? Send again in ${wait}s` : "Didn't get it? Send again"}
    </button>
  );
}
