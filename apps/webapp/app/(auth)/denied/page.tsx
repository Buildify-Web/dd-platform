import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ButtonArrow, ButtonLink, Heading, IconTile, secondaryButton } from "@/components/auth/ui";
import { ArrowLeft, ShieldX } from "@/components/icons";
import { accessAside } from "@/lib/aside-content";
import { config } from "@/lib/config";
import { logoutAction } from "../actions";

export const metadata: Metadata = { title: "No access" };

/**
 * Design: "403 · No permission". Shown when a signed-in user opens a page their role can't
 * use (the check runs on the server for every page, and again in the backend for every API call).
 * "Switch portal" signs out, so a different account can sign in.
 */
export default function DeniedPage() {
  return (
    <AuthShell
      label="Admin and Staff Login"
      action={{ prompt: "Need help?", label: "Contact admin", href: `mailto:${config.supportEmail()}` }}
      aside={accessAside(config.idleMinutes())}
    >
      <IconTile tone="white">
        <ShieldX />
      </IconTile>
      <Heading
        className="mt-5"
        title="You don't have access"
        lead="Fees, approvals, courses and settings are managed by admin. Ask an administrator if you need this page."
      />
      <div className="mt-6 space-y-4">
        <ButtonLink href="/dashboard">
          Back to my dashboard
          <ButtonArrow />
        </ButtonLink>
        <form action={logoutAction}>
          <button type="submit" className={secondaryButton}>
            <ArrowLeft className="size-4" />
            Switch portal
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
