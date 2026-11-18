import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/(auth)/actions";
import type { Me } from "@/lib/session";
import { ToastProvider } from "../ui/client";
import { btn } from "../ui/kit";
import { IBell, ILogOut, IPlus } from "./icons";
import { ADMIN_NAV, STAFF_NAV } from "./nav";
import { CommandPalette, MobileNavButton, SidebarNav, UserCard } from "./ShellClient";

/**
 * The signed-in frame for both portals (designs: header bar, sidebar card, content).
 *   header   logo · "Admin portal" pill · ⌘K search · filter · bell (dot when unread) · New announcement
 *   sidebar  "Welcome back, <name>" · collapsible groups with yellow count badges · user card
 * Below lg the sidebar becomes a drawer opened from the header.
 */
export function PortalShell({ me, counts, children }: { me: Me; counts: Record<string, number>; children: ReactNode }) {
  const admin = me.user.role === "ADMIN";
  const nav = admin ? ADMIN_NAV : STAFF_NAV;
  const home = admin ? "/admin" : "/staff";
  const sidebar = (
    <>
      <div className="border-b border-line px-1 pb-3">
        <p className="text-[12px] text-muted">Welcome back,</p>
        <p className="truncate text-[17px] text-ink">{me.user.name}</p>
      </div>
      <SidebarNav groups={nav} counts={counts} />
      <UserCard name={me.user.name} role={admin ? "ADMIN" : "STAFF · TEACHER"} href={`${home}/profile`} logout={logoutAction} />
    </>
  );
  return (
    <ToastProvider>
      <div className="min-h-dvh p-0 sm:p-3 lg:p-4">
        <div className="mx-auto flex min-h-dvh max-w-[1680px] flex-col gap-3 bg-frame p-2.5 sm:min-h-[calc(100dvh-1.5rem)] sm:rounded-[26px] sm:p-3 lg:min-h-[calc(100dvh-2rem)] lg:gap-3.5 lg:p-4">
          <header className="flex h-[60px] shrink-0 items-center gap-2 rounded-[18px] bg-white px-3 sm:h-16 sm:gap-3 sm:px-4 lg:rounded-[20px]">
            <MobileNavButton>{sidebar}</MobileNavButton>
            <Link href={home} className="flex min-w-0 items-center gap-2.5">
              <Image src="/logo-mark.png" alt="" width={336} height={331} className="h-9 w-auto shrink-0" priority />
              <span className="hidden truncate text-[15.5px] font-semibold tracking-[-0.01em] text-ink min-[420px]:block">Dynamic Donalds</span>
            </Link>
            <span className="hidden shrink-0 rounded-full bg-soft px-2.5 py-1 text-[11px] text-ink-soft md:inline">{admin ? "Admin portal" : "Staff portal"}</span>
            <div className="ml-1 hidden min-w-0 flex-1 md:block lg:ml-4 lg:max-w-[470px]">
              <CommandPalette groups={nav} admin={admin} />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="md:hidden">
                <CommandPalette groups={nav} admin={admin} compact />
              </div>
              <Link href={`${home}/notifications`} className="relative grid size-10 place-items-center rounded-full border border-line-2 bg-white text-ink hover:border-ink/30" aria-label={`Notifications${counts.notifications ? `, ${counts.notifications} unread` : ""}`}>
                <IBell className="size-[18px]" />
                {!!counts.notifications && <span className="absolute top-2 right-2.5 size-2 rounded-full bg-sun ring-2 ring-white" />}
              </Link>
              <span className="hidden sm:block">
                <Link href={admin ? "/admin/announcements/new" : "/staff/notices/new"} className={btn.dark}>
                  <IPlus className="size-4 text-sun" />
                  New announcement
                </Link>
              </span>
              <Link href={admin ? "/admin/announcements/new" : "/staff/notices/new"} className="grid size-10 place-items-center rounded-full bg-ink text-sun sm:hidden" aria-label="New announcement">
                <IPlus className="size-4" />
              </Link>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 gap-3 lg:gap-3.5">
            <aside className="sticky top-4 hidden max-h-[calc(100dvh-7.5rem)] w-[226px] shrink-0 flex-col rounded-[20px] bg-white p-4 lg:flex">{sidebar}</aside>
            <main id="main" className="min-w-0 flex-1 pb-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}

export function LogoutIcon() {
  return <ILogOut className="size-4" />;
}
