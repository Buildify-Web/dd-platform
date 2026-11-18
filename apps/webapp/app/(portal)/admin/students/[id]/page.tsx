import { ageOn, attendanceStatusLabel, formatINR, genderLabel, isGender, learningModeLabel, monthKey, sessionLabel, sessionTypeLabel, type AttendanceSession, type AttendanceStatus, type FeeStatus } from "@dd/shared/domain";
import type { Metadata } from "next";
import Link from "next/link";
import { btn, Card, cx, Empty, LinkTabs, Pill, StatCard, Table, td, th } from "@/components/ui/kit";
import { api, param, type SearchParams } from "@/lib/api";
import { requireAdmin } from "@/lib/portal";
import { CoursesManager, DeleteStudentButton, OverviewForm, StatusToggle, type StudentDetail } from "./StudentForms";

export const metadata: Metadata = { title: "Student profile" };

type Profile = {
  student: StudentDetail & {
    code: string;
    gradeLabel: string;
    rfid: string | null;
    parentName: string | null;
    photoFileId: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    schoolName: string | null;
    schoolIdCardFileId: string | null;
  };
  stats: {
    attendance: number | null;
    attendanceDelta: number | null;
    outstanding: number;
    feeStatus: FeeStatus | null;
    homework: { done: number; total: number };
    lastTest: { score: number; max: number; label: string } | null;
  };
  enrolments: { id: string; courseId: string; name: string; fee: number; feeOverride: number | null; overrideReason: string | null; mandatory: boolean }[];
  availableCourses: { id: string; name: string; fee: number }[];
};

const mask = (m: string) => (m.length === 10 ? `${m.slice(0, 2)}XXXXXX${m.slice(-2)}` : m);
const rfidShort = (u: string) => {
  const h = u.replace(/:/g, "");
  return h.length > 8 ? `${h.slice(0, 4)}…${h.slice(-4)}` : h;
};
const month = () => new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "Asia/Kolkata" }).format(new Date());

/** Design: "Student profile" (Students / Madhuri Ishani). */
export default async function StudentProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const { id } = await params;
  await requireAdmin(`/admin/students/${id}`);
  const tab = param((await searchParams).tab) || "overview";
  const p = await api<Profile>(`/v1/students/${id}`);
  const s = p.student;
  const age = s.dateOfBirth ? ageOn(s.dateOfBirth) : null;
  const personal = [age !== null ? `${age} yrs` : null, isGender(s.gender) ? genderLabel[s.gender] : null, s.schoolName ? `School: ${s.schoolName}` : null].filter(Boolean).join(" · ");
  const meta = [s.code, s.gradeLabel, personal || null, sessionTypeLabel(s.sessionType), learningModeLabel(s.learningMode), s.rfid ? `RFID ${rfidShort(s.rfid)}` : "No RFID card", s.parentName ? `Parent: ${s.parentName}` : null, mask(s.mobile)]
    .filter(Boolean)
    .join(" · ");
  const base = `/admin/students/${id}`;

  return (
    <>
      <p className="mb-2 text-[12.5px] text-muted">
        <Link href="/admin/students" className="hover:text-ink">
          Students
        </Link>{" "}
        / {s.name}
      </p>
      <section className="mb-3 flex flex-wrap items-center gap-4 rounded-[20px] bg-ink p-4 text-white sm:p-5">
        {s.photoFileId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/files/${s.photoFileId}`} alt="" className="size-[72px] rounded-2xl object-cover sm:size-20" />
        ) : (
          <span className="grid size-[72px] shrink-0 place-items-center rounded-2xl bg-sun text-[24px] font-semibold text-ink sm:size-20 sm:text-[26px]">
            {s.name
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-[clamp(1.4rem,2.6vw,1.75rem)] leading-tight font-normal">{s.name}</h1>
          <p className="mt-1 text-[12.5px] text-white/75">{meta}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusToggle id={s.id} status={s.status} />
          <DeleteStudentButton id={s.id} name={s.name} />
        </div>
      </section>

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={`Attendance · ${month()}`}
          value={p.stats.attendance === null ? "—" : `${p.stats.attendance}%`}
          sub={p.stats.attendanceDelta === null ? "No data last month" : <span className={p.stats.attendanceDelta >= 0 ? "text-brand" : "text-danger"}>{`${p.stats.attendanceDelta >= 0 ? "▲" : "▼"} ${Math.abs(p.stats.attendanceDelta)}% vs last month`}</span>}
        />
        <StatCard
          label="Outstanding fee"
          value={formatINR(p.stats.outstanding)}
          sub={<span className={p.stats.outstanding ? "text-danger" : "text-brand"}>{p.stats.feeStatus === "PARTIAL" ? `Partial · ${month()}` : p.stats.feeStatus === "UNPAID" ? `Unpaid · ${month()}` : p.stats.outstanding ? "Earlier months" : "All paid"}</span>}
          href={`/admin/fees/${s.id}`}
        />
        <StatCard label="Homework done" value={`${p.stats.homework.done}/${p.stats.homework.total}`} sub="this month" />
        <StatCard label="Last test" value={p.stats.lastTest ? `${p.stats.lastTest.score}/${p.stats.lastTest.max}` : "—"} sub={p.stats.lastTest?.label ?? "No marks yet"} />
      </div>

      <Card>
        <LinkTabs
          active={tab}
          tabs={[
            { key: "overview", label: "Overview", href: base },
            { key: "courses", label: "Courses", href: `${base}?tab=courses` },
            { key: "fees", label: "Fees", href: `${base}?tab=fees` },
            { key: "attendance", label: "Attendance", href: `${base}?tab=attendance` },
            { key: "homework", label: "Homework", href: `${base}?tab=homework` },
            { key: "marks", label: "Marks", href: `${base}?tab=marks` },
          ]}
        />
        <div className="pt-4">
          {tab === "overview" && <OverviewForm s={s} />}
          {tab === "courses" && <CoursesManager studentId={s.id} enrolments={p.enrolments} available={p.availableCourses} />}
          {tab === "fees" && <FeesTab id={s.id} outstanding={p.stats.outstanding} status={p.stats.feeStatus} />}
          {tab === "attendance" && <AttendanceTab id={s.id} />}
          {tab === "homework" && <HomeworkTab id={s.id} />}
          {tab === "marks" && <MarksTab id={s.id} />}
        </div>
      </Card>
    </>
  );
}

function FeesTab({ id, outstanding, status }: { id: string; outstanding: number; status: FeeStatus | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-[14px]">
          Outstanding: <span className="font-semibold">{formatINR(outstanding)}</span>
          {status && <Pill className="ml-2" tone={status === "PAID" ? "green" : status === "PARTIAL" ? "sun" : "red"}>{status === "PAID" ? "Paid" : status === "PARTIAL" ? "Paid partially" : "Unpaid"} · this month</Pill>}
        </p>
        <p className="mt-1 text-[12.5px] text-muted">Record payments, overrides, one-time charges and reminders on the fee record.</p>
      </div>
      <Link href={`/admin/fees/${id}?month=${monthKey()}`} className={btn.dark}>
        Open fee record
      </Link>
    </div>
  );
}

const statusTone = { PRESENT: "green", ABSENT: "red", LEAVE: "sun", NA: "grey" } as const;

async function AttendanceTab({ id }: { id: string }) {
  const d = await api<{ month: string; rows: { date: string; session: AttendanceSession; status: AttendanceStatus; source: string; late: boolean; markedByName: string | null }[] }>(`/v1/students/${id}/attendance`);
  if (!d.rows.length) return <Empty title="No attendance marked this month yet" />;
  return (
    <Table>
      <thead>
        <tr>
          <th className={th}>Date</th>
          <th className={th}>Session</th>
          <th className={th}>Status</th>
          <th className={th}>Source</th>
        </tr>
      </thead>
      <tbody>
        {d.rows.map((r) => (
          <tr key={`${r.date}${r.session}`}>
            <td className={td}>{r.date}</td>
            <td className={td}>{sessionLabel(r.session)}</td>
            <td className={td}>
              <Pill tone={statusTone[r.status]}>{attendanceStatusLabel[r.status]}</Pill>
              {r.late && <Pill tone="blue" className="ml-1.5">Late</Pill>}
            </td>
            <td className={cx(td, "text-ink-soft")}>{r.source === "RFID" ? "RFID" : r.source === "LEAVE" ? "Leave approved" : `Manual · ${r.markedByName ?? "—"}`}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

async function HomeworkTab({ id }: { id: string }) {
  const d = await api<{ rows: { id: string; title: string; subject: string; dueOn: string; status: string; feedback: string | null }[] }>(`/v1/students/${id}/homework`);
  if (!d.rows.length) return <Empty title="No homework yet" />;
  const label = (s: string) => (s === "CHECKED" ? <Pill tone="green">Checked</Pill> : s === "SUBMITTED" ? <Pill tone="sun">To check</Pill> : s === "REDO" ? <Pill tone="red">Needs redo</Pill> : <Pill>Not submitted</Pill>);
  return (
    <Table>
      <thead>
        <tr>
          <th className={th}>Homework</th>
          <th className={th}>Subject</th>
          <th className={th}>Due</th>
          <th className={th}>Status</th>
          <th className={th}>Feedback</th>
        </tr>
      </thead>
      <tbody>
        {d.rows.map((r) => (
          <tr key={r.id}>
            <td className={td}>{r.title}</td>
            <td className={cx(td, "text-ink-soft")}>{r.subject}</td>
            <td className={td}>{r.dueOn}</td>
            <td className={td}>{label(r.status)}</td>
            <td className={cx(td, "max-w-[260px] text-ink-soft")}>{r.feedback ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

async function MarksTab({ id }: { id: string }) {
  const d = await api<{ rows: { testId: string; test: string; subject: string; score: number; max: number; visible: boolean; date: string | null }[] }>(`/v1/students/${id}/marks`);
  if (!d.rows.length) return <Empty title="No marks yet" />;
  return (
    <Table>
      <thead>
        <tr>
          <th className={th}>Test</th>
          <th className={th}>Subject</th>
          <th className={th}>Date</th>
          <th className={th}>Marks</th>
          <th className={th}>Parents</th>
        </tr>
      </thead>
      <tbody>
        {d.rows.map((r) => (
          <tr key={r.testId}>
            <td className={td}>{r.test}</td>
            <td className={cx(td, "text-ink-soft")}>{r.subject}</td>
            <td className={td}>{r.date ?? "—"}</td>
            <td className={cx(td, "font-semibold tabular-nums")}>
              {r.score} / {r.max}
            </td>
            <td className={td}>{r.visible ? <Pill tone="green">Visible</Pill> : <Pill>Hidden</Pill>}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
