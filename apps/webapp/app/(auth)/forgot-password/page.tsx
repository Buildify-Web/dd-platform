import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { asides } from "@/lib/aside-content";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Forgot password" };

type Props = { searchParams: Promise<{ portal?: string; for?: string }> };

/**
 * Design: "Forgot Password", step 1 of 3.
 * The same endpoint serves "Request new" on the activation screens (?for=activation):
 * active accounts get a reset link, approved-but-not-activated accounts get fresh login details.
 */
export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { portal, for: purpose } = await searchParams;
  const signIn = portal === "admin" || portal === "staff" ? `/login/${portal}` : "/";
  const activation = purpose === "activation";
  return (
    <AuthShell
      label={activation ? "Admin and Staff Login" : "Password Reset"}
      action={activation ? { prompt: "Have your details?", label: "Activate", href: "/activate" } : { prompt: "Remembered it?", label: "Sign in", href: signIn }}
      aside={activation ? asides.activate : asides.forgot}
    >
      <ForgotForm mode={activation ? "activation" : "reset"} backHref={activation ? "/activate" : signIn} />
    </AuthShell>
  );
}
