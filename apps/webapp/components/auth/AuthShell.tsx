import Image from "next/image";
import Link from "next/link";
import { Globe } from "../icons";
import { AuthAside, type AsideContent } from "./AuthAside";

export type TopAction = { prompt: string; label: string; href: string };

/**
 * The frame every sign-in screen shares (designs: Choose Role, Admin/Staff Login, Activate,
 * Forgot / Set New Password, 403 / Session expired):
 *
 *   canvas ─┬─ shell (rounded, light) ─┬─ left column: brand header · centred content · footer
 *           │                          └─ right panel: headline, tile illustration, activity cards (lg+)
 *
 * Below `lg` the right panel is hidden and the left column fills the screen.
 */
export function AuthShell({
  label,
  action,
  aside,
  children,
}: {
  /** Small line under "Dynamic Donalds", e.g. "Admin Login". */
  label: string;
  /** Top-right prompt + button, e.g. "Wrong portal?" [Switch]. */
  action: TopAction;
  aside: AsideContent;
  children: React.ReactNode;
}) {
  const external = /^(https?:|mailto:)/.test(action.href);
  return (
    <div className="flex min-h-dvh p-2 sm:p-4 lg:px-8 lg:py-[26px]">
      <div className="mx-auto grid w-full max-w-[1320px] gap-[23px] rounded-[22px] bg-shell p-2.5 sm:rounded-[28px] sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.135fr)] lg:p-[22px]">
        <div className="flex min-h-[calc(100dvh-1rem-1.25rem)] min-w-0 flex-col px-3 pb-2 pt-2 sm:min-h-[calc(100dvh-2rem-2rem)] sm:px-5 lg:min-h-[max(calc(100dvh-52px-44px),640px)] lg:px-2 lg:pb-0 lg:pt-0">
          <header className="flex items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-3 rounded-lg" aria-label="Dynamic Donalds: choose your portal">
              <Image src="/logo.png" alt="" width={480} height={424} priority className="h-[42px] w-auto shrink-0" />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[14px] font-semibold text-ink">Dynamic Donalds</span>
                <span className="block truncate text-[10.5px] text-muted">{label}</span>
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="hidden text-[12px] text-muted min-[400px]:inline">{action.prompt}</span>
              {external ? (
                <a href={action.href} rel="noopener noreferrer" target={action.href.startsWith("http") ? "_blank" : undefined} className={topButton}>
                  {action.label}
                </a>
              ) : (
                <Link href={action.href} className={topButton}>
                  {action.label}
                </Link>
              )}
            </div>
          </header>

          <main className="flex flex-1 items-center justify-center py-10 lg:py-8">
            <div className="w-full max-w-[376px]">{children}</div>
          </main>

          <footer className="flex items-center justify-between pb-1 text-[12px] text-muted">
            <span>© {new Date().getFullYear()} Dynamic Donalds</span>
            <span className="inline-flex items-center gap-1.5" title="Language: English">
              <Globe className="size-3.5" />
              <span aria-label="English">ENG</span>
            </span>
          </footer>
        </div>

        <AuthAside {...aside} />
      </div>
    </div>
  );
}

const topButton =
  "inline-flex h-8 items-center rounded-lg border border-[#e1e3dc] bg-white px-3.5 text-[12px] font-medium text-ink shadow-[0_1px_2px_rgba(23,38,15,0.05)] transition-colors hover:border-ink/25 hover:bg-[#fbfbf8]";
