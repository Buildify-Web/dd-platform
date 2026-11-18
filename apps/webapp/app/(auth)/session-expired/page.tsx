import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ButtonArrow, ButtonLink, Heading, IconTile } from "@/components/auth/ui";
import { ArrowLeft, Clock } from "@/components/icons";
import { accessAside } from "@/lib/aside-content";
import { config } from "@/lib/config";

export const metadata: Metadata = { title: "Session expired" };

type Props = { searchParams: Promise<{ portal?: string }> };

/** Design: "Session expired" (the second state of the access screen). */
export default async function SessionExpiredPage({ searchParams }: Props) {
  const { portal } = await searchParams;
  const signIn = portal === "admin" || portal === "staff" ? `/login/${portal}` : "/";
  const idle = config.idleMinutes();
  return (
    <AuthShell
      label="Admin and Staff Login"
      action={{ prompt: "Need help?", label: "Contact admin", href: `mailto:${config.supportEmail()}` }}
      aside={accessAside(idle)}
    >
      <IconTile tone="white">
        <Clock />
      </IconTile>
      <Heading
        className="mt-5"
        title="Your session expired"
        lead={`For your security, you were signed out after ${idle} minutes without activity. Sign in again to pick up where you left off.`}
      />
      <div className="mt-6 space-y-4">
        <ButtonLink href={signIn}>
          Sign in again
          <ButtonArrow />
        </ButtonLink>
        <ButtonLink href="/" variant="secondary">
          <ArrowLeft className="size-4" />
          Switch portal
        </ButtonLink>
      </div>
    </AuthShell>
  );
}
