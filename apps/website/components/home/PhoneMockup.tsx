import { Bell, BookNote, Calendar, Chart, GradCap, Home, Megaphone, Rupee, Trophy } from "@/components/icons";

/** Illustrated parent-app screen shown in the home hero (pure HTML/CSS, no image). */
export function PhoneMockup() {
  return (
    <div
      aria-hidden
      className="relative w-[250px] rounded-[2.6rem] bg-[#1b1d1f] p-[9px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)] ring-1 ring-black/40 lg:w-[270px]"
    >
      <span className="absolute -left-[3px] top-24 h-10 w-[3px] rounded-l bg-[#2a2c2e]" />
      <span className="absolute -left-[3px] top-36 h-14 w-[3px] rounded-l bg-[#2a2c2e]" />
      <span className="absolute -right-[3px] top-32 h-16 w-[3px] rounded-r bg-[#2a2c2e]" />
      <div className="relative overflow-hidden rounded-[2.1rem] bg-[#f4f6f1]">
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
          <div className="mt-3 flex items-start justify-between">
            <div>
              <p className="text-[9px] text-white/80">Good morning,</p>
              <p className="text-[15px] font-semibold leading-tight">DD Fam 👋</p>
            </div>
            <Bell className="size-4 text-white/90" />
          </div>
        </div>

        <div className="-mt-9 space-y-2.5 px-3 pb-3">
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
                <span className="size-1 rounded-full bg-brand" /> Active
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center">
              {[
                { l: "Attendance", I: Calendar, c: "bg-[#e7f2df] text-brand" },
                { l: "Homework", I: BookNote, c: "bg-[#e3ecfb] text-[#3a66c4]" },
                { l: "Fees", I: Rupee, c: "bg-[#fdf3d0] text-[#b58a00]" },
                { l: "Competitions", I: Trophy, c: "bg-[#efe6fb] text-[#7a4cc2]" },
              ].map(({ l, I, c }) => (
                <div key={l} className="flex flex-col items-center gap-1">
                  <span className={`grid size-7 place-items-center rounded-lg ${c}`}>
                    <I className="size-3.5" />
                  </span>
                  <span className="text-[6.5px] text-ink-soft">{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* upcoming events */}
          <div>
            <div className="flex items-center justify-between px-0.5">
              <p className="text-[10px] font-semibold text-ink">Upcoming Events</p>
              <p className="text-[7px] text-brand">View All ›</p>
            </div>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm">
              <div className="rounded-lg bg-[#e7f2df] px-1.5 py-1 text-center leading-none text-brand">
                <p className="text-[6.5px] font-semibold">NOV</p>
                <p className="text-[12px] font-bold">05</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold text-ink">Maths Test</p>
                <p className="text-[7px] text-muted">09:00 AM – 10:00 AM</p>
              </div>
            </div>
          </div>

          {/* announcement */}
          <div>
            <div className="flex items-center justify-between px-0.5">
              <p className="text-[10px] font-semibold text-ink">Latest Announcements</p>
              <p className="text-[7px] text-brand">View All ›</p>
            </div>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-[#eef6e8] p-2">
              <span className="grid size-6 place-items-center rounded-full bg-brand text-white">
                <Megaphone className="size-3" />
              </span>
              <div>
                <p className="text-[8.5px] font-semibold text-ink">Annual Day 2026</p>
                <p className="text-[6.5px] text-muted">Don’t forget the Annual Day on Nov 20.</p>
              </div>
            </div>
          </div>

          {/* attendance overview */}
          <div className="rounded-xl bg-white p-2 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-ink">Attendance Overview</p>
              <p className="text-[7px] text-muted">This Month ▾</p>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <div
                className="grid size-12 place-items-center rounded-full"
                style={{ background: "conic-gradient(#2b7010 0 92%, #e5e9e0 92% 100%)" }}
              >
                <span className="grid size-9 place-items-center rounded-full bg-white text-[10px] font-bold text-ink">92%</span>
              </div>
              <ul className="flex-1 space-y-0.5 text-[7.5px] text-ink-soft">
                <li className="flex justify-between"><span><span className="mr-1 inline-block size-1.5 rounded-full bg-brand" />Present</span><b className="text-ink">23</b></li>
                <li className="flex justify-between"><span><span className="mr-1 inline-block size-1.5 rounded-full bg-[#e5484d]" />Absent</span><b className="text-ink">2</b></li>
                <li className="flex justify-between"><span><span className="mr-1 inline-block size-1.5 rounded-full bg-sun" />Late</span><b className="text-ink">1</b></li>
              </ul>
            </div>
          </div>
        </div>

        {/* bottom nav */}
        <div className="flex justify-around border-t border-line bg-white px-3 pb-3 pt-2 text-[7px] text-muted">
          <span className="flex flex-col items-center gap-0.5 text-brand"><Home className="size-3.5" />Home</span>
          <span className="flex flex-col items-center gap-0.5"><BookNote className="size-3.5" />Courses</span>
          <span className="flex flex-col items-center gap-0.5"><Chart className="size-3.5" />Reports</span>
        </div>
      </div>
    </div>
  );
}
