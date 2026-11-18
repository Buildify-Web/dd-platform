import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordSaved, portalParam } from "@/components/auth/PasswordSaved";
import { asides } from "@/lib/aside-content";

export const metadata: Metadata = { title: "Account active" };

type Props = { searchParams: Promise<{ portal?: string }> };

/** Activation step 3 of 3. */
export default async function ActivationDonePage({ searchParams }: Props) {
  const { portal } = await searchParams;
  return (
    <AuthShell label="Admin and Staff Login" action={{ prompt: "Ready?", label: "Sign in", href: "/" }} aside={asides.activate}>
      <PasswordSaved portal={portalParam(portal)} activated />
    </AuthShell>
  );
}
