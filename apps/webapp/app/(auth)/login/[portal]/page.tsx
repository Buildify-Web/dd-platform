import { PORTALS, type Portal } from "@dd/shared/auth";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { Heading, IconTile } from "@/components/auth/ui";
import { GradCap, ShieldCheck } from "@/components/icons";
import { asides } from "@/lib/aside-content";
import { redirectIfSignedIn } from "@/lib/session";
import { LoginForm } from "./LoginForm";

type Props = { params: Promise<{ portal: string }>; searchParams: Promise<{ next?: string; notice?: string }> };

const isPortal = (p: string): p is Portal => (PORTALS as readonly string[]).includes(p);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { portal } = await params;
  return { title: portal === "admin" ? "Admin sign in" : "Staff sign in" };
}

/** Designs: "Admin Login" (/login/admin) and "Staff Login" (/login/staff). */
export default async function LoginPage({ params, searchParams }: Props) {
  const { portal } = await params;
  if (!isPortal(portal)) notFound();
  await redirectIfSignedIn();
  const { next = "", notice } = await searchParams;
  const admin = portal === "admin";

  return (
    <AuthShell
      label={admin ? "Admin Login" : "Staff Login"}
      action={{ prompt: "Wrong portal?", label: "Switch", href: "/" }}
      aside={admin ? asides.adminLogin : asides.staffLogin}
    >
      <IconTile tone={admin ? "green" : "yellow"}>{admin ? <ShieldCheck /> : <GradCap />}</IconTile>
      <Heading
        className="mt-4"
        title="Welcome back!"
        lead={
          admin
            ? "Sign in to manage approvals, fees, courses and reports."
            : "Sign in to mark attendance, post class updates and share homework."
        }
      />
      <LoginForm portal={portal} next={next.slice(0, 512)} notice={notice === "password-saved" ? "password-saved" : undefined} />
    </AuthShell>
  );
}
