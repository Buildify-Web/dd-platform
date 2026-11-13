"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import { Bell, BookNote, Calendar, Chart, Check, Close, GradCap, Home, Megaphone, Rupee, Trophy } from "@/components/icons";
import { cx } from "@/components/ui";

/*
 * Illustrated parent-app screen shown in the home hero (pure HTML/CSS, no image).
 *
 * Hover (mouse/pen): the phone straightens from its resting tilt, lifts toward the
 * viewer and follows the pointer in 3D — with real edge thickness, a moving glare,
 * a shifting shadow and slight parallax between the frame and the screen content.
 * Motion is a small rAF spring writing CSS variables, so React never re-renders on move.
 *
 * The screen is a working mini demo: tabs, quick-action sheets, reminders, an
 * expandable announcement and a month toggle. All data is sample data.
 */

const REST_TILT = -7; // degrees, matches the original hero composition
type Motion = { rx: number; ry: number; rz: number; s: number; gx: number; gy: number };
const REST: Motion = { rx: 0, ry: 0, rz: REST_TILT, s: 1, gx: 50, gy: 20 };

type Tab = "home" | "courses" | "reports";
type Sheet = "attendance" | "homework" | "fees" | "competitions";
type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const actions: { id: Sheet; l: string; I: Icon; c: string }[] = [
  { id: "attendance", l: "Attendance", I: Calendar, c: "bg-[#e7f2df] text-brand" },
  { id: "homework", l: "Homework", I: BookNote, c: "bg-[#e3ecfb] text-[#3a66c4]" },
  { id: "fees", l: "Fees", I: Rupee, c: "bg-[#fdf3d0] text-[#b58a00]" },
  { id: "competitions", l: "Competitions", I: Trophy, c: "bg-[#efe6fb] text-[#7a4cc2]" },
];

const months = {
  this: { label: "This Month", pct: 92, present: 23, absent: 2, late: 1 },
  last: { label: "Last Month", pct: 88, present: 22, absent: 3, late: 0 },
};

/** Shared hover/press feel for every tappable box on the screen. */
const tap =
  "cursor-pointer transition-[translate,scale,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-8px_rgba(23,38,15,0.4)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand";

export function PhoneMockup() {
  const hitRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const cur = useRef<Motion>({ ...REST });
  const target = useRef<Motion>({ ...REST });
  const raf = useRef(0);
  const reduced = useRef(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const tick = () => {
    const el = phoneRef.current;
    if (!el) return;
    const c = cur.current;
    const t = target.current;
    let moving = false;
    for (const k of Object.keys(c) as (keyof Motion)[]) {
      const d = t[k] - c[k];
      c[k] += d * 0.14;
      if (Math.abs(d) > 0.01) moving = true;
      else c[k] = t[k];
    }
    el.style.transform = `perspective(1100px) rotateX(${c.rx}deg) rotateY(${c.ry}deg) rotateZ(${c.rz}deg) scale(${c.s})`;
    el.style.setProperty("--rx", c.rx.toFixed(3));
    el.style.setProperty("--ry", c.ry.toFixed(3));
    el.style.setProperty("--gx", `${c.gx}%`);
    el.style.setProperty("--gy", `${c.gy}%`);
    raf.current = moving ? requestAnimationFrame(tick) : 0;
  };
  const kick = () => {
    if (!raf.current) raf.current = requestAnimationFrame(tick);
  };

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" || reduced.current || !hitRef.current) return;
    const r = hitRef.current.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    target.current = { rx: (0.5 - py) * 18, ry: (px - 0.5) * 24, rz: 0, s: 1.06, gx: px * 100, gy: py * 100 };
    if (!hovered) setHovered(true);
    kick();
  };
  const onLeave = () => {
    target.current = { ...REST };
    setHovered(false);
    kick();
  };

  return (
    <div
      ref={hitRef}
      data-hovered={hovered}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative -m-3 p-3" // untransformed hit area, so tilting never makes the hover flicker at the edges
    >
      <div
        ref={phoneRef}
        role="group"
        aria-label="Preview of the Dynamic Donalds parent app — try the buttons"
        style={{ transform: `perspective(1100px) rotateZ(${REST_TILT}deg)` }}
        className="relative w-[250px] rounded-[2.6rem] bg-[#1b1d1f] p-[9px] ring-1 ring-black/40 [transform-style:preserve-3d] lg:w-[270px]"
      >
        {/* body thickness (visible as the phone turns) + a shadow that moves against the tilt */}
        {[2, 4, 6, 8].map((z) => (
          <span key={z} aria-hidden className="absolute inset-0 rounded-[2.6rem] bg-[#0f1011]" style={{ transform: `translateZ(-${z}px)` }} />
        ))}
        <span
          aria-hidden
          className="absolute inset-0 rounded-[2.6rem] bg-[#0b0c0d]"
          style={{
            transform: "translateZ(-10px)",
            boxShadow: `calc(var(--ry, 0) * -1.8px) calc(30px + var(--rx, 0) * 1.6px) ${hovered ? 80 : 60}px -20px rgba(0,0,0,${hovered ? 0.6 : 0.55})`,
            transition: "box-shadow 400ms ease-out",
          }}
        />

        <span aria-hidden className="absolute -left-[3px] top-24 h-10 w-[3px] rounded-l bg-[#2a2c2e]" />
        <span aria-hidden className="absolute -left-[3px] top-36 h-14 w-[3px] rounded-l bg-[#2a2c2e]" />
        <span aria-hidden className="absolute -right-[3px] top-32 h-16 w-[3px] rounded-r bg-[#2a2c2e]" />

        <Screen hovered={hovered} />
      </div>
    </div>
  );
}

function Screen({ hovered }: { hovered: boolean }) {
  const [tab, setTab] = useState<Tab>("home");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [bellDot, setBellDot] = useState(true);
  const [reminder, setReminder] = useState(false);
  const [annOpen, setAnnOpen] = useState(false);
  const [month, setMonth] = useState<keyof typeof months>("this");
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [registered, setRegistered] = useState(false);
  const m = months[month];

  // Content drifts slightly against the frame while tilting — reads as glass depth.
  const parallax = (k: number) => ({ translate: `calc(var(--ry, 0) * ${k}px) calc(var(--rx, 0) * ${-k}px)` });

  return (
    <div className="relative overflow-hidden rounded-[2.1rem] bg-[#f4f6f1] text-left">
      {/* status + header */}
      <div className="bg-[linear-gradient(160deg,#2b7010_0%,#1f5a0b_100%)] px-4 pb-12 pt-3 text-white">
        <div className="flex items-center justify-between text-[9px] font-medium">
          <span>9:41</span>
          <span className="h-[18px] w-[70px] rounded-full bg-black" />
          <span className="flex gap-0.5">
            <span className="h-1.5 w-3 rounded-sm bg-white/90" />
            <span className="h-1.5 w-1.5 rounded-sm bg-white/90" />
          </span>
        </div>
        <div className="mt-3 flex items-start justify-between" style={parallax(0.12)}>
          <div>
            <p className="text-[9px] text-white/80">Good morning,</p>
            <p className="text-[15px] font-semibold leading-tight">DD Fam 👋</p>
          </div>
          <button
            type="button"
            onClick={() => setBellDot(false)}
            aria-label={bellDot ? "Notifications, 1 new" : "Notifications, all read"}
            className="relative -m-1 grid size-6 cursor-pointer place-items-center rounded-full transition-colors hover:bg-white/15"
          >
            <Bell className={cx("size-4 text-white/90", bellDot && "origin-top motion-safe:animate-[bell-ring_2.4s_ease-in-out_infinite]")} />
            {bellDot ? <span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-sun ring-2 ring-[#2b7010]" /> : null}
          </button>
        </div>
      </div>

      <div className="relative -mt-9" style={parallax(0.28)}>
        {/* HOME (always rendered so the screen keeps its height) */}
        <div className={cx("space-y-2.5 px-3 pb-3", tab !== "home" && "invisible")}>
          {/* student card */}
          <div className="rounded-2xl bg-white p-2.5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-brand text-white">
                <GradCap className="size-4" />
              </span>
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-ink">Thenu Annamalai</p>
                <p className="text-[8px] text-muted">Grade 11 · Science</p>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-[#e5f3dc] px-1.5 py-0.5 text-[7px] text-brand">
                <span className="size-1 animate-pulse rounded-full bg-brand" /> Active
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center">
              {actions.map(({ id, l, I, c }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSheet(id)}
                  className="group/a flex cursor-pointer flex-col items-center gap-1 rounded-lg py-0.5 focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <span
                    className={cx(
                      "grid size-7 place-items-center rounded-lg transition-[translate,scale,box-shadow] duration-200 group-hover/a:-translate-y-0.5 group-hover/a:scale-110 group-hover/a:shadow-[0_6px_12px_-6px_rgba(23,38,15,0.45)] group-active/a:scale-95",
                      c,
                    )}
                  >
                    <I className="size-3.5" />
                  </span>
                  <span className="text-[6.5px] text-ink-soft transition-colors group-hover/a:text-ink">{l}</span>
                </button>
              ))}
            </div>
          </div>

          {/* upcoming events */}
          <div>
            <Row title="Upcoming Events" />
            <button
              type="button"
              onClick={() => setReminder((v) => !v)}
              aria-pressed={reminder}
              className={cx("mt-1.5 flex w-full items-center gap-2 rounded-xl bg-white p-2 text-left shadow-sm", tap)}
            >
              <div className="rounded-lg bg-[#e7f2df] px-1.5 py-1 text-center leading-none text-brand">
                <p className="text-[6.5px] font-semibold">NOV</p>
                <p className="text-[12px] font-bold">05</p>
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-semibold text-ink">Maths Test</p>
                <p className="text-[7px] text-muted">09:00 AM – 10:00 AM</p>
              </div>
              <span
                className={cx(
                  "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[6.5px] transition-colors",
                  reminder ? "bg-brand text-white" : "bg-mist text-ink-soft",
                )}
              >
                {reminder ? <Check className="size-2" strokeWidth={3} /> : <Bell className="size-2" />}
                {reminder ? "Reminder on" : "Remind me"}
              </span>
            </button>
          </div>

          {/* announcement */}
          <div>
            <Row title="Latest Announcements" />
            <button
              type="button"
              onClick={() => setAnnOpen((v) => !v)}
              aria-expanded={annOpen}
              className={cx("mt-1.5 flex w-full items-start gap-2 rounded-xl bg-[#eef6e8] p-2 text-left hover:bg-[#e6f1de]", tap)}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-white">
                <Megaphone className="size-3" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[8.5px] font-semibold text-ink">Annual Day 2026</p>
                <p className="text-[6.5px] text-muted">Don’t forget the Annual Day on Nov 20.</p>
                <div className={cx("grid transition-[grid-template-rows] duration-300", annOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                  <p className="overflow-hidden text-[6.5px] text-ink-soft">
                    <span className="block pt-1">Rehearsals start Nov 10 after class. Parents are warmly invited!</span>
                  </p>
                </div>
              </div>
              <span className={cx("text-[8px] text-brand transition-transform duration-300", annOpen && "rotate-90")}>›</span>
            </button>
          </div>

          {/* attendance overview */}
          <button
            type="button"
            onClick={() => setMonth((v) => (v === "this" ? "last" : "this"))}
            className={cx("block w-full rounded-xl bg-white p-2 text-left shadow-sm", tap)}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-ink">Attendance Overview</p>
              <p className="rounded-full bg-mist px-1.5 py-0.5 text-[7px] text-muted">{m.label} ▾</p>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <Donut pct={m.pct} />
              <ul className="flex-1 space-y-0.5 text-[7.5px] text-ink-soft">
                <Stat dot="bg-brand" label="Present" value={m.present} />
                <Stat dot="bg-[#e5484d]" label="Absent" value={m.absent} />
                <Stat dot="bg-sun" label="Late" value={m.late} />
              </ul>
            </div>
          </button>
        </div>

        {/* COURSES */}
        {tab === "courses" ? (
          <Panel title="My Courses">
            {[
              { n: "Mathematics", d: "Group · Offline", c: "bg-[#e7f2df] text-brand", p: 72 },
              { n: "Physics", d: "Group · Online", c: "bg-[#e3ecfb] text-[#3a66c4]", p: 58 },
              { n: "Chemistry", d: "One-on-One · Online", c: "bg-[#fdf3d0] text-[#b58a00]", p: 64 },
            ].map((x) => (
              <div key={x.n} className={cx("rounded-xl bg-white p-2 shadow-sm", tap)} tabIndex={0}>
                <div className="flex items-center gap-2">
                  <span className={cx("grid size-6 place-items-center rounded-lg", x.c)}>
                    <BookNote className="size-3" />
                  </span>
                  <div className="flex-1">
                    <p className="text-[9px] font-semibold text-ink">{x.n}</p>
                    <p className="text-[6.5px] text-muted">{x.d}</p>
                  </div>
                  <span className="text-[7px] font-semibold text-ink">{x.p}%</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-mist">
                  <div className="h-full origin-left animate-[bar-grow_0.8s_ease-out_both] rounded-full bg-brand" style={{ width: `${x.p}%` }} />
                </div>
                <p className="mt-1 text-[6px] text-muted">Syllabus covered</p>
              </div>
            ))}
          </Panel>
        ) : null}

        {/* REPORTS */}
        {tab === "reports" ? (
          <Panel title="Term 1 Marks">
            <div className="rounded-xl bg-white p-2.5 shadow-sm">
              <div className="flex h-24 items-end justify-around gap-2">
                {[
                  { s: "Maths", v: 92 },
                  { s: "Physics", v: 85 },
                  { s: "Chem", v: 88 },
                  { s: "English", v: 79 },
                ].map((x, i) => (
                  <div key={x.s} className="group/b flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[6.5px] font-semibold text-ink opacity-70 transition-opacity group-hover/b:opacity-100">{x.v}</span>
                    <div
                      className="w-full origin-bottom animate-[bar-rise_0.7s_cubic-bezier(0.22,1,0.36,1)_both] rounded-t-md bg-brand/80 transition-colors group-hover/b:bg-sun"
                      style={{ height: `${x.v - 20}%`, animationDelay: `${i * 80}ms` }}
                    />
                    <span className="text-[6px] text-muted">{x.s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={cx("flex items-center justify-between rounded-xl bg-[#eef6e8] p-2", tap)} tabIndex={0}>
              <div>
                <p className="text-[8.5px] font-semibold text-ink">Overall</p>
                <p className="text-[6.5px] text-muted">Up 4% from last term</p>
              </div>
              <span className="text-[13px] font-bold text-brand">86%</span>
            </div>
          </Panel>
        ) : null}
      </div>

      {/* bottom nav */}
      <div className="relative flex justify-around border-t border-line bg-white px-3 pb-3 pt-2 text-[7px] text-muted">
        {(
          [
            { id: "home", l: "Home", I: Home },
            { id: "courses", l: "Courses", I: BookNote },
            { id: "reports", l: "Reports", I: Chart },
          ] as const
        ).map(({ id, l, I }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={cx(
              "flex cursor-pointer flex-col items-center gap-0.5 rounded-lg px-2 py-0.5 transition-colors hover:text-ink",
              tab === id && "text-brand hover:text-brand",
            )}
          >
            <I className={cx("size-3.5 transition-transform duration-200", tab === id && "-translate-y-px scale-110")} />
            {l}
          </button>
        ))}
      </div>

      {/* bottom sheet */}
      <div
        onClick={() => setSheet(null)}
        className={cx(
          "absolute inset-0 z-10 bg-ink/35 transition-opacity duration-300",
          sheet ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        className={cx(
          "absolute inset-x-0 bottom-0 z-10 rounded-t-2xl bg-white px-3 pb-4 pt-2 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.3)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          sheet ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!sheet}
        inert={!sheet}
      >
        <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-line" />
        {sheet ? (
          <SheetBody
            sheet={sheet}
            done={done}
            toggle={(k) => setDone((d) => ({ ...d, [k]: !d[k] }))}
            registered={registered}
            register={() => setRegistered((v) => !v)}
            close={() => setSheet(null)}
          />
        ) : null}
      </div>

      {/* glare that follows the pointer */}
      <span
        aria-hidden
        className={cx("pointer-events-none absolute inset-0 z-20 transition-opacity duration-500", hovered ? "opacity-100" : "opacity-0")}
        style={{ background: "radial-gradient(circle at var(--gx, 50%) var(--gy, 20%), rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 55%)" }}
      />
    </div>
  );
}

function Row({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between px-0.5">
      <p className="text-[10px] font-semibold text-ink">{title}</p>
      <p className="text-[7px] text-brand">View All ›</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="absolute inset-0 animate-[screen-in_0.35s_cubic-bezier(0.22,1,0.36,1)_both] space-y-2 overflow-hidden px-3 pb-3">
      <div className="rounded-2xl bg-white px-2.5 py-2 shadow-sm">
        <p className="text-[11px] font-semibold text-ink">{title}</p>
        <p className="text-[7px] text-muted">Thenu Annamalai · Grade 11</p>
      </div>
      {children}
    </div>
  );
}

function Stat({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <li className="flex justify-between">
      <span>
        <span className={cx("mr-1 inline-block size-1.5 rounded-full", dot)} />
        {label}
      </span>
      <b className="text-ink tabular-nums">{value}</b>
    </li>
  );
}

function Donut({ pct }: { pct: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-12">
      <svg viewBox="0 0 48 48" className="size-12 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#e5e9e0" strokeWidth="5" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="#2b7010"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[10px] font-bold text-ink tabular-nums">{pct}%</span>
    </div>
  );
}

function SheetBody({
  sheet,
  done,
  toggle,
  registered,
  register,
  close,
}: {
  sheet: Sheet;
  done: Record<string, boolean>;
  toggle: (k: string) => void;
  registered: boolean;
  register: () => void;
  close: () => void;
}) {
  const a = actions.find((x) => x.id === sheet)!;
  const body: Record<Sheet, ReactNode> = {
    attendance: (
      <>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 21 }, (_, i) => {
            const s = i === 4 || i === 12 ? "a" : i === 9 ? "l" : "p";
            return (
              <span
                key={i}
                className={cx(
                  "grid aspect-square place-items-center rounded-md text-[6px] transition-transform hover:scale-110",
                  s === "p" && "bg-[#e7f2df] text-brand",
                  s === "a" && "bg-[#fde3e3] text-[#c53030]",
                  s === "l" && "bg-[#fdf3d0] text-[#b58a00]",
                )}
              >
                {i + 1}
              </span>
            );
          })}
        </div>
        <p className="mt-2 text-[7px] text-muted">Green present · red absent · yellow late</p>
      </>
    ),
    homework: (
      <div className="space-y-1.5">
        {[
          { k: "hw1", t: "Maths — Exercise 4.2", d: "Due today" },
          { k: "hw2", t: "Physics — Numericals", d: "Due Friday" },
          { k: "hw3", t: "Chemistry — Chapter 3 notes", d: "Due Monday" },
        ].map((h) => (
          <button
            key={h.k}
            type="button"
            onClick={() => toggle(h.k)}
            aria-pressed={!!done[h.k]}
            className={cx("flex w-full items-center gap-2 rounded-lg bg-mist/70 p-1.5 text-left", tap)}
          >
            <span
              className={cx(
                "grid size-3.5 shrink-0 place-items-center rounded border transition-colors",
                done[h.k] ? "border-brand bg-brand text-white" : "border-ghost bg-white",
              )}
            >
              {done[h.k] ? <Check className="size-2.5" strokeWidth={3} /> : null}
            </span>
            <span className="flex-1">
              <span className={cx("block text-[8px] font-medium text-ink transition-opacity", done[h.k] && "line-through opacity-50")}>{h.t}</span>
              <span className="block text-[6.5px] text-muted">{done[h.k] ? "Completed" : h.d}</span>
            </span>
          </button>
        ))}
      </div>
    ),
    fees: (
      <div className="space-y-1.5">
        {[
          { m: "November 2026", s: "Paid completely", c: "bg-[#e7f2df] text-brand" },
          { m: "October 2026", s: "Paid completely", c: "bg-[#e7f2df] text-brand" },
          { m: "December 2026", s: "Due on 10 Dec", c: "bg-[#fdf3d0] text-[#b58a00]" },
        ].map((f) => (
          <div key={f.m} className={cx("flex items-center justify-between rounded-lg bg-mist/70 p-1.5", tap)} tabIndex={0}>
            <span className="text-[8px] font-medium text-ink">{f.m}</span>
            <span className={cx("rounded-full px-1.5 py-0.5 text-[6.5px]", f.c)}>{f.s}</span>
          </div>
        ))}
      </div>
    ),
    competitions: (
      <div className="space-y-1.5">
        <div className="rounded-lg bg-mist/70 p-2">
          <p className="text-[8.5px] font-semibold text-ink">Science Olympiad</p>
          <p className="text-[6.5px] text-muted">Registrations close Nov 30</p>
        </div>
        <button
          type="button"
          onClick={register}
          aria-pressed={registered}
          className={cx(
            "flex w-full items-center justify-center gap-1 rounded-full py-1.5 text-[8px] font-medium",
            registered ? "bg-brand text-white" : "bg-sun text-ink",
            tap,
          )}
        >
          {registered ? <Check className="size-2.5" strokeWidth={3} /> : null}
          {registered ? "Interest sent to admin" : "Register interest"}
        </button>
      </div>
    ),
  };

  return (
    <div className="animate-[screen-in_0.3s_ease-out_both]">
      <div className="mb-2 flex items-center gap-2">
        <span className={cx("grid size-6 place-items-center rounded-lg", a.c)}>
          <a.I className="size-3" />
        </span>
        <p className="flex-1 text-[10px] font-semibold text-ink">{a.l}</p>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="grid size-5 cursor-pointer place-items-center rounded-full bg-mist text-ink transition-colors hover:bg-sun"
        >
          <Close className="size-2.5" />
        </button>
      </div>
      {body[sheet]}
    </div>
  );
}
