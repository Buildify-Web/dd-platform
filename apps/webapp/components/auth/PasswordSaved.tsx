import type { Portal } from "@dd/shared/auth";
import { Check } from "../icons";
import { ButtonArrow, ButtonLink, Heading, IconTile, StepBars } from "./ui";

/**
 * Step 3 of 3 for both password flows (routes /activate/done and /reset-password/done).
 * The sign-in button shows a "Password saved" notice on the login page.
 */
export function PasswordSaved({ portal, activated }: { portal: Portal | null; activated: boolean }) {
  return (
    <div className="anim-rise">
      <IconTile tone="green">
        <Check />
      </IconTile>
      <StepBars step={3} />
      <Heading
        className="mt-5"
        title={activated ? "Your account is active" : "Password saved"}
        lead={
          activated
            ? "You're all set. Sign in with your email and the password you just chose."
            : "Your password has been changed and every other device was signed out. Sign in with your new password."
        }
      />
      <ButtonLink href={portal ? `/login/${portal}?notice=password-saved` : "/"} className="mt-6">
        {portal ? `Sign in to ${portal} portal` : "Sign in"}
        <ButtonArrow />
      </ButtonLink>
    </div>
  );
}

export const portalParam = (p: string | undefined): Portal | null => (p === "admin" || p === "staff" ? p : null);
