import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { Heading, IconTile, StepBars } from "@/components/auth/ui";
import { Mail } from "@/components/icons";
import { asides } from "@/lib/aside-content";
import { redirectIfSignedIn } from "@/lib/session";
import { ActivateForm } from "./ActivateForm";

export const metadata: Metadata = { title: "Activate your account" };

type Props = { searchParams: Promise<{ expired?: string; portal?: string }> };

/**
 * Design: "Activate Account (First Login)", step 1 of 3.
 * After an admin approves a registration, the user gets an email with their username and a
 * temporary password. Step 1 checks those, step 2 (/activate/password) sets their own
 * password, step 3 is the success screen.
 */
export default async function ActivatePage({ searchParams }: Props) {
  await redirectIfSignedIn();
  const { expired, portal } = await searchParams;
  const back = portal === "admin" || portal === "staff" ? `/login/${portal}` : "/";
  return (
    <AuthShell
      label="Admin and Staff Login"
      action={{ prompt: "Link expired?", label: "Request new", href: "/forgot-password?for=activation" }}
      aside={asides.activate}
    >
      <IconTile tone="green">
        <Mail />
      </IconTile>
      <StepBars step={1} />
      <Heading
        className="mt-5"
        title="Activate your account"
        lead="Your registration was approved. Enter the username and temporary password we emailed you."
      />
      <ActivateForm backHref={back} expired={expired === "1"} />
    </AuthShell>
  );
}
