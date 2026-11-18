"use client";

import { AUTH_ERRORS, emailSchema, type Portal } from "@dd/shared/auth";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, PasswordField, SubmitButton } from "@/components/auth/fields";
import { FormAlert, inlineLink, OrDivider, secondaryButton } from "@/components/auth/ui";
import { GradCap, Mail } from "@/components/icons";
import type { FormError, LoginState } from "@/lib/form-state";
import { loginAction } from "../../actions";

export function LoginForm({ portal, next, notice }: { portal: Portal; next: string; notice?: "password-saved" }) {
  const [state, action] = useActionState(loginAction, {} as LoginState);
  const [email, setEmail] = useState("");
  const [clientError, setClientError] = useState<string>();
  const admin = portal === "admin";
  const emailError = clientError ?? state.fields?.email;

  return (
    <form
      action={action}
      noValidate
      className="mt-6"
      onSubmit={(e) => {
        // Quick client-side check with the same rule as the server, before the round trip.
        const ok = emailSchema.safeParse(email).success;
        setClientError(ok ? undefined : email.trim() ? "Enter a valid email address." : "Enter your email address.");
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="portal" value={portal} />
      <input type="hidden" name="next" value={next} />

      {state.error ? (
        <FormAlert key={JSON.stringify(state.error)} className="mb-4">
          <LoginError error={state.error} portal={portal} />
        </FormAlert>
      ) : notice === "password-saved" ? (
        <FormAlert tone="info" className="mb-4">
          Password saved. Sign in with your new password.
        </FormAlert>
      ) : null}

      <div className="space-y-3">
        <Field
          label="Email address"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={254}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (clientError) setClientError(undefined);
          }}
          error={emailError}
        />
        <PasswordField label="Password" name="password" autoComplete="current-password" required maxLength={128} error={state.fields?.password} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-[12.5px]">
        <label className="-my-2 flex cursor-pointer items-center gap-2 py-2 text-ink-soft">
          <input type="checkbox" name="rememberMe" className="size-[15px] cursor-pointer rounded accent-ink" />
          Keep me signed in
        </label>
        <Link href={`/forgot-password?portal=${portal}`} className="-my-2 py-2 font-medium text-brand underline-offset-4 hover:underline">
          Forgot password?
        </Link>
      </div>

      <div className="mt-6">
        <SubmitButton pendingLabel="Signing in…">{admin ? "Sign in to admin portal" : "Sign in to staff portal"}</SubmitButton>
      </div>

      <OrDivider />
      {admin ? (
        <Link href="/login/staff" className={secondaryButton}>
          <GradCap className="size-[18px]" />
          Sign in as staff instead
        </Link>
      ) : (
        <Link href="/activate?portal=staff" className={secondaryButton}>
          <Mail className="size-[18px]" />
          First time? Activate your account
        </Link>
      )}

      <p className="mt-4 text-center text-[11.5px] text-muted">Every sign-in is logged.</p>
    </form>
  );
}

function LoginError({ error, portal }: { error: FormError; portal: Portal }) {
  switch (error.code) {
    case AUTH_ERRORS.INVALID_CREDENTIALS:
      return (
        <>
          <p className="font-medium">Incorrect email or password.</p>
          {error.attemptsLeft !== undefined && error.attemptsLeft > 0 && (
            <p className="mt-0.5">
              {error.attemptsLeft === 1 ? "1 attempt" : `${error.attemptsLeft} attempts`} left before a {error.lockMinutes ?? 15}-minute lock.
            </p>
          )}
        </>
      );
    case AUTH_ERRORS.ACCOUNT_LOCKED:
      return (
        <p>
          {error.message}{" "}
          <Link href={`/forgot-password?portal=${portal}`} className={inlineLink}>
            Reset password
          </Link>
        </p>
      );
    case AUTH_ERRORS.ACCOUNT_NOT_ACTIVATED:
      return (
        <p>
          {error.message}{" "}
          <Link href={`/activate?portal=${portal}`} className={inlineLink}>
            Activate now
          </Link>
        </p>
      );
    case AUTH_ERRORS.WRONG_PORTAL:
      return (
        <p>
          {error.message}{" "}
          {error.portal && (
            <Link href={`/login/${error.portal}`} className={inlineLink}>
              Go to {error.portal} sign-in
            </Link>
          )}
        </p>
      );
    default:
      return <p>{error.message}</p>;
  }
}
