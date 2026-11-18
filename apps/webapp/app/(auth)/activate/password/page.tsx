import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { asides } from "@/lib/aside-content";
import { backend } from "@/lib/backend";
import { ACTIVATION_COOKIE } from "@/lib/cookies";
import { completeActivationAction } from "../../actions";

export const metadata: Metadata = { title: "Choose your password" };

/**
 * Activation step 2 of 3. Only reachable with the short-lived ticket cookie set in step 1;
 * without it (or once it expires) the user goes back to step 1.
 */
export default async function ActivationPasswordPage() {
  const ticket = (await cookies()).get(ACTIVATION_COOKIE)?.value;
  if (!ticket) redirect("/activate?expired=1");
  const res = await backend<{ name: string; email: string }>("/v1/auth/activation/ticket", { body: { ticket } });
  if (!res.ok) redirect("/activate?expired=1");

  const firstName = res.data.name.split(" ")[0];
  return (
    <AuthShell
      label="Admin and Staff Login"
      action={{ prompt: "Link expired?", label: "Request new", href: "/forgot-password?for=activation" }}
      aside={{ ...asides.setPassword, items: [asides.setPassword.items[0], { title: "Login details verified", detail: "Single use", status: "done" }] }}
    >
      <SetPasswordForm action={completeActivationAction} mode="activation" greetingName={firstName} username={res.data.email} />
    </AuthShell>
  );
}
