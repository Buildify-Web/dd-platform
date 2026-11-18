"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { searchPortal } from "@/lib/actions";
import { Avatar, cx } from "../ui/kit";
import * as I from "./icons";
import type { NavGroup, NavItem } from "./nav";

const ICONS: Record<string, (p: React.SVGProps<SVGSVGElement>) => React.ReactElement> = {
  grid: I.IGrid,
  check: I.ICheckSquare,
  users: I.IUsers,
  user: I.IUser,
  calendar: I.ICalendar,
  attendance: I.ICalendarCheck,
  book: I.IBook,
  pencil: I.IPencil,
  chart: I.IChart,
  file: I.IFile,
  clipboard: I.IClipboard,
  cap: I.ICap,
  trophy: I.ITrophy,
  card: I.ICard,
  dollar: I.IDollar,
  bars: I.IBars,
  megaphone: I.IMegaphone,
  bell: I.IBell,
  idcard: I.IIdCard,
  globe: I.IGlobe,
  history: I.IHistory,
  gear: I.IGear,
};

const isActive = (pathname: string, item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

/** Sidebar groups. The group holding the current page is open; others collapse to a count. */
export function SidebarNav({ groups, counts }: { groups: NavGroup[]; counts: Record<string, number> }) {
  const pathname = usePathname();
  const current = groups.find((g) => g.items.some((i) => isActive(pathname, i)))?.key ?? groups[0]!.key;
  const [toggled, setOpen] = useState<Set<string>>(() => new Set());
  // The group holding the current page is always open; the rest follow the user's toggles.
  const open = new Set([...toggled, current]);

  return (
    <nav className="-mx-1 mt-3 min-h-0 flex-1 overflow-y-auto px-1 pb-3" aria-label="Main">
      {groups.map((g) => {
        const expanded = open.has(g.key);
        const total = g.items.reduce((t, i) => t + (i.count ? (counts[i.count] ?? 0) : 0), 0);
        return (
          <div key={g.key} className="mt-1 first:mt-0">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen((o) => {
                const n = new Set(o);
                if (n.has(g.key)) n.delete(g.key);
                else n.add(g.key);
                return n;
              })}
              className="flex h-9 w-full items-center gap-2 rounded-lg px-1.5 text-left text-[11.5px] text-muted hover:text-ink"
            >
              <span className="flex-1">{g.label}</span>
              {!expanded && total > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-sun px-1.5 text-[10.5px] font-semibold text-ink">{total}</span>}
              {expanded ? <I.IChevronDown className="size-3.5" /> : <I.IChevronRight className="size-3.5" />}
            </button>
            {expanded && (
              <ul className="mt-0.5 space-y-0.5 pb-1">
                {g.items.map((item) => {
                  const Icon = ICONS[item.icon] ?? I.IGrid;
                  const active = isActive(pathname, item);
                  const n = item.count ? (counts[item.count] ?? 0) : 0;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cx(
                          "flex h-10 items-center gap-3 rounded-[11px] px-2.5 text-[14px] transition-colors",
                          active ? "bg-ink text-white" : "text-ink hover:bg-soft",
                        )}
                      >
                        <Icon className={cx("size-[18px] shrink-0", active ? "text-white" : "text-ink-soft")} />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {n > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-sun px-1.5 text-[10.5px] font-semibold text-ink">{n}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** Bottom user card: role chip, name, sign out. Dark while on the profile page. */
export function UserCard({ name, role, href, logout }: { name: string; role: string; href: string; logout: () => Promise<void> }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <div className={cx("mt-2 flex items-center gap-2.5 rounded-2xl p-2.5", active ? "bg-ink" : "bg-frame")}>
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-2.5" aria-label="My profile">
        <Avatar name={name} size={34} tone="bg-sun" />
        <span className="min-w-0">
          <span className={cx("inline-block rounded-full px-2 py-px text-[9.5px] font-medium tracking-wide whitespace-nowrap", active ? "bg-sun text-ink" : "bg-ink text-sun")}>{role}</span>
          <span className={cx("block truncate text-[13px]", active ? "text-white" : "text-ink")}>{name}</span>
        </span>
      </Link>
      <form action={logout}>
        <button type="submit" className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-ink hover:bg-soft" aria-label="Sign out" title="Sign out">
          <I.ILogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}

/** Hamburger + slide-in drawer for phones and tablets. */
export function MobileNavButton({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="-ml-1 grid size-10 shrink-0 place-items-center rounded-full text-ink hover:bg-soft lg:hidden" aria-label="Open menu" aria-expanded={open}>
        <I.IMenu className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="anim-fade absolute inset-0 bg-ink/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="anim-rise absolute inset-y-0 left-0 flex w-[min(86vw,300px)] flex-col bg-white p-4 shadow-2xl" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>
            <button type="button" onClick={() => setOpen(false)} className="absolute top-3 right-3 grid size-9 place-items-center rounded-full hover:bg-soft" aria-label="Close menu">
              <I.IClose className="size-4" />
            </button>
            {children}
          </div>
        </div>
      )}
    </>
  );
}

type Result = { label: string; sub?: string; href: string; kind: string };

/** ⌘K / Ctrl+K: jump to any page, student or (admin) staff member. */
export function CommandPalette({ groups, admin, compact }: { groups: NavGroup[]; admin: boolean; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !compact) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [compact]);
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setTimeout(() => inputRef.current?.focus(), 0);
    }
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      const r = await searchPortal(q.trim());
      if (!r.ok) return;
      const base = admin ? "/admin" : "/staff";
      setPeople([
        ...r.data.students.map((s) => ({ label: s.name, sub: `${s.gradeLabel} · ${s.code}${s.status === "INACTIVE" ? " · Inactive" : ""}`, href: admin ? `${base}/students/${s.id}` : `${base}/students?q=${encodeURIComponent(s.name)}`, kind: "Student" })),
        ...r.data.staff.map((s) => ({ label: s.name, sub: s.subject ?? "Staff", href: `/admin/staff/${s.id}`, kind: "Staff" })),
      ]);
    }, 220);
    return () => clearTimeout(t);
  }, [q, admin]);

  const pages = useMemo<Result[]>(() => {
    const all = groups.flatMap((g) => g.items.map((i) => ({ label: i.label, sub: g.label, href: i.href, kind: "Page" })));
    const s = q.trim().toLowerCase();
    return s ? all.filter((p) => p.label.toLowerCase().includes(s)) : all.slice(0, 8);
  }, [groups, q]);
  const results = [...(q.trim().length < 2 ? [] : people), ...pages];
  const go = (r: Result | undefined) => {
    if (!r) return;
    setOpen(false);
    setQ("");
    router.push(r.href);
  };

  return (
    <>
      {compact ? (
        <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full border border-line-2 bg-white text-ink" aria-label="Search">
          <I.ISearch className="size-[18px]" />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setOpen(true)} className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-soft pr-1.5 pl-3.5 text-left text-[13.5px] text-muted hover:bg-[#e2e5dc]">
            <I.ISearch className="size-4 shrink-0" />
            <span className="flex-1 truncate">Search</span>
            <kbd className="rounded-full border border-line-2 bg-white px-2 py-0.5 font-sans text-[10.5px] text-ink-soft">⌘K</kbd>
          </button>
          <button type="button" onClick={() => setOpen(true)} className="grid size-10 shrink-0 place-items-center rounded-full border border-line-2 bg-white text-ink hover:border-ink/30" aria-label="Quick filters">
            <I.ISliders className="size-[18px]" />
          </button>
        </div>
      )}
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setOpen(false);
        }}
        className="mx-auto mt-[12vh] w-[min(94vw,560px)] overflow-visible rounded-[20px] bg-transparent p-0 backdrop:bg-ink/45 backdrop:backdrop-blur-[2px]"
      >
        {open && (
          <div className="anim-rise overflow-hidden rounded-[20px] bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <I.ISearch className="size-4 text-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => (setQ(e.target.value), setActive(0))}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(results.length - 1, a + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(0, a - 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    go(results[active]);
                  }
                }}
                placeholder={admin ? "Search students, staff or pages…" : "Search your students or pages…"}
                className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted sm:text-[15px]"
                aria-label="Search"
              />
              <kbd className="rounded-md border border-line-2 px-1.5 py-0.5 font-sans text-[10.5px] text-muted">Esc</kbd>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
              {results.length === 0 && <li className="px-3 py-6 text-center text-[13.5px] text-muted">No matches.</li>}
              {results.map((r, i) => (
                <li key={`${r.kind}${r.href}${i}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r)}
                    className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", i === active ? "bg-soft" : "")}
                  >
                    {r.kind === "Page" ? <span className="grid size-8 place-items-center rounded-lg bg-frame text-ink-soft"><I.IArrowRight className="size-4" /></span> : <Avatar name={r.label} size={32} />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-ink">{r.label}</span>
                      {r.sub && <span className="block truncate text-[12px] text-muted">{r.sub}</span>}
                    </span>
                    <span className="text-[11px] text-muted">{r.kind}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </dialog>
    </>
  );
}
