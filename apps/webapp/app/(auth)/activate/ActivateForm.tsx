"use client";

import { AUTH_ERRORS, emailSchema } from "@dd/shared/auth";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, PasswordField, SubmitButton } from "@/components/auth/fields";
import { FormAlert, inlineLink, OrDivider, secondaryButton } from "@/components/auth/ui";
import { ArrowLeft } from "@/components/icons";
import type { LoginState } from "@/lib/form-state";
import { activateAction } from "../actions";

export function ActivateForm({ backHref, expired }: { backHref: string; expired: boolean }) {
  const [state, action] = useActionState(activateAction, {} as LoginState);
  const [email, setEmail] = useState("");
  const [clientError, setClientError] = useState<string>();
  const error = state.error;

  return (
    <form
      action={action}
      noValidate
      className="mt-6"
      onSubmit={(e) => {
        const ok = emailSchema.safeParse(email).success;
        setClientError(ok ? undefined : email.trim() ? "Enter a valid email address." : "Enter your email address.");
        if (!ok) e.preventDefault();
      }}
    >
      {error ? (
        <FormAlert key={JSON.stringify(error)} className="mb-4">
          <p>
            {error.message}{" "}
            {error.code === AUTH_ERRORS.TEMP_PASSWORD_EXPIRED && (
              <Link href="/forgot-password?for=activation" className={inlineLink}>
                Request new details
              </Link>
            )}
            {error.portal && (
              <Link href={`/login/${error.portal}`} className={inlineLink}>
                Go to sign in
              </Link>
            )}
          </p>
        </FormAlert>
      ) : expired ? (
        <FormAlert tone="info" className="mb-4">
          That step timed out for your security. Enter your username and temporary password again.
        </FormAlert>
      ) : null}

      <div className="space-y-3">
        <Field
          label="Username (email)"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
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
        <PasswordField
          label="Temporary password"
          name="temporaryPassword"
          autoComplete="one-time-code"
          maxLength={128}
          showToggle={false}
          error={state.fields?.temporaryPassword}
        />
      </div>

      <div className="mt-6">
        <SubmitButton pendingLabel="Checking…">Continue</SubmitButton>
      </div>
      <OrDivider />
      <Link href={backHref} className={secondaryButton}>
        <ArrowLeft className="size-4" />
        Back to sign in
      </Link>
    </form>
  );
}
