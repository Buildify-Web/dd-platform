import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { ButtonArrow, ButtonLink, Heading, IconTile, OrDivider, StepBars } from "@/components/auth/ui";
import { ArrowLeft, Key } from "@/components/icons";
import { asides } from "@/lib/aside-content";
import { backend } from "@/lib/backend";
import { resetPasswordAction } from "../actions";

export const metadata: Metadata = { title: "Set a new password" };

type Props = { searchParams: Promise<{ token?: string }> };

/**
 * Design: "Set New Password", step 2 of 3. Opened from the emailed link
 * (/reset-password?token=…). The link is checked on the server before the form shows; this
 * page sends `Referrer-Policy: no-referrer` (next.config.ts) so the token never leaks.
 */
export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token = "" } = await searchParams;
  const valid = /^[A-Za-z0-9_-]{20,200}$/.test(token) && (await backend("/v1/auth/password/reset/verify", { body: { token } })).ok;

  return (
    <AuthShell
      label="Password Reset"
      action={{ prompt: "Link expired?", label: "Request new", href: "/forgot-password" }}
      aside={asides.setPassword}
    >
      {valid ? (
        <SetPasswordForm action={resetPasswordAction} mode="reset" token={token} />
      ) : (
        <>
          <IconTile tone="yellow">
            <Key />
          </IconTile>
          <StepBars step={2} />
          <Heading
            className="mt-5"
            title="This link has expired"
            lead="Reset links work once and only for a short time. Request a new one and we'll email it to you."
          />
          <ButtonLink href="/forgot-password" className="mt-6">
            Request a new link
            <ButtonArrow />
          </ButtonLink>
          <OrDivider />
          <ButtonLink href="/" variant="secondary">
            <ArrowLeft className="size-4" />
            Back to sign in
          </ButtonLink>
        </>
      )}
    </AuthShell>
  );
}
