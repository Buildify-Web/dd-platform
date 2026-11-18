"use client";

import { AUTH_ERRORS } from "@dd/shared/auth";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { PasswordState } from "@/lib/form-state";
import { Key } from "../icons";
import { passwordReady, PasswordChecklist, PasswordField, SubmitButton } from "./fields";
import { FormAlert, Heading, IconTile, inlineLink, StepBars } from "./ui";

type Action = (prev: PasswordState, fd: FormData) => Promise<PasswordState>;

/**
 * Design: "Set New Password" (step 2 of 3), used by both password reset and account
 * activation. The Save button stays disabled until the checklist is complete; the server
 * checks the same rules again (and password history). On success the action redirects to
 * the step-3 route (/activate/done or /reset-password/done, see PasswordSaved).
 */
export function SetPasswordForm({
  action: serverAction,
  mode,
  token,
  greetingName,
  username,
}: {
  action: Action;
  mode: "reset" | "activation";
  token?: string;
  greetingName?: string;
  /** The account email, so password managers save the new password against it. */
  username?: string;
}) {
  const [state, action] = useActionState(serverAction, {} as PasswordState);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const ready = passwordReady(password, confirm);
  const error = state.error;
  const restartHref = mode === "reset" ? "/forgot-password" : "/activate";

  return (
    <>
      <IconTile tone="yellow">
        <Key />
      </IconTile>
      <StepBars step={2} />
      <Heading
        className="mt-5"
        title={mode === "reset" ? "Set a new password" : "Choose your password"}
        lead={
          mode === "reset"
            ? "Choose something you haven't used here before."
            : `${greetingName ? `Hi ${greetingName}, set` : "Set"} the password you'll use to sign in from now on.`
        }
      />

      <form action={action} noValidate className="mt-6">
        {token && <input type="hidden" name="token" value={token} />}
        {username && <input type="email" name="username" autoComplete="username" value={username} hidden readOnly />}

        {error && (
          <FormAlert key={JSON.stringify(error)} className="mb-4">
            <p>
              {error.message}{" "}
              {error.code === AUTH_ERRORS.TOKEN_INVALID && (
                <Link href={restartHref} className={inlineLink}>
                  Start again
                </Link>
              )}
            </p>
          </FormAlert>
        )}

        <div className="space-y-3">
          <PasswordField
            label="New password"
            name="password"
            autoComplete="new-password"
            maxLength={128}
            showToggle={false}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={state.fields?.password}
          />
          <PasswordField
            label="Confirm password"
            name="confirm"
            autoComplete="new-password"
            maxLength={128}
            showToggle={false}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={state.fields?.confirm}
          />
        </div>

        <PasswordChecklist password={password} confirm={confirm} />

        <div className="mt-5">
          <SubmitButton pendingLabel="Saving…" disabled={!ready}>
            Save password
          </SubmitButton>
        </div>
      </form>
    </>
  );
}
