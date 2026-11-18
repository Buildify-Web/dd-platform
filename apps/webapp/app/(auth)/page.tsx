import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ButtonArrow, cx, Heading, IconTile, OrDivider, primaryButton } from "@/components/auth/ui";
import { GradCap, ShieldCheck, User } from "@/components/icons";
import { asides } from "@/lib/aside-content";
import { config } from "@/lib/config";
import { redirectIfSignedIn } from "@/lib/session";

export const metadata: Metadata = { title: "Choose your portal" };

/** Design: "Choose Role". Entry point of the portal domain. */
export default async function ChooseRolePage() {
  await redirectIfSignedIn();
  return (
    <AuthShell label="Admin & staff portal" action={{ prompt: "Parent?", label: "Get the app", href: config.parentAppUrl() }} aside={asides.chooseRole}>
      <IconTile tone="white">
        <User />
      </IconTile>
      <Heading className="mt-4" title="Welcome back!" lead="Choose your portal to continue where you left off." />

      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-[22px]">
        <RoleCard href="/login/admin" tone="bg-role-admin" icon={<ShieldCheck />} title="Continue as Admin" detail="Full access" />
        <RoleCard href="/login/staff" tone="bg-role-staff" icon={<GradCap />} title="Continue as Staff" detail="Your classes" />
      </div>

      <OrDivider />
      <Link href="/activate" className={primaryButton}>
        Activate a new staff account
        <ButtonArrow />
      </Link>

      <p className="mx-auto mt-5 max-w-[22rem] text-center text-[11.5px] leading-relaxed text-muted">
        Parents and students use the Dynamic Donalds mobile app. By continuing you accept our{" "}
        <a href={`${config.websiteUrl()}/privacy`} target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-2 hover:text-brand">
          Privacy Policy
        </a>
        .
      </p>
    </AuthShell>
  );
}

function RoleCard({ href, tone, icon, title, detail }: { href: string; tone: string; icon: React.ReactNode; title: string; detail: string }) {
  return (
    <Link
      href={href}
      className={cx(
        "lift group flex aspect-square flex-col items-center justify-center rounded-[14px] px-3 text-center ring-1 ring-inset ring-black/[0.03] hover:ring-ink/10",
        tone,
      )}
    >
      <span className="text-ink transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110 [&>svg]:size-6">{icon}</span>
      <span className="mt-3.5 text-[13.5px] font-semibold text-ink">{title}</span>
      <span className="mt-1 text-[11.5px] text-muted">{detail}</span>
    </Link>
  );
}
