import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordSaved, portalParam } from "@/components/auth/PasswordSaved";
import { asides } from "@/lib/aside-content";

export const metadata: Metadata = { title: "Password saved" };

type Props = { searchParams: Promise<{ portal?: string }> };

/** Password reset step 3 of 3. */
export default async function ResetDonePage({ searchParams }: Props) {
  const { portal } = await searchParams;
  return (
    <AuthShell label="Password Reset" action={{ prompt: "Ready?", label: "Sign in", href: "/" }} aside={asides.setPassword}>
      <PasswordSaved portal={portalParam(portal)} activated={false} />
    </AuthShell>
  );
}
