import type { AsideContent } from "@/components/auth/AuthAside";

/**
 * Right-panel copy for each auth screen, as in the designs. The activity cards are
 * illustrations of what the portal does (sample figures), never live data.
 */
export const asides = {
  chooseRole: {
    title: (
      <>
        Run Dynamic Donalds
        <br />
        from one place
      </>
    ),
    body: "Approvals, attendance, fees and class updates for every grade, with each role seeing only what it should.",
    items: [
      { title: "Attendance synced from RFID · Gate 1", detail: "Evening session · 184 check-ins", status: "syncing" },
      { title: "Fee reminders sent to 73 parents", detail: "10 Nov · automatic", status: "done" },
    ],
  },
  adminLogin: {
    title: "Manage every class, fee and approval",
    body: "One portal for registrations, enrolments, fees, RFID attendance and parent communication.",
    photos: [
      { src: "/auth/teaching-team.webp", alt: "Dynamic Donalds teaching team" },
      { src: "/auth/class-group-whiteboard.webp", alt: "A class at Dynamic Donalds" },
      { src: "/auth/dd-family-team.webp", alt: "The Dynamic Donalds family" },
    ],
    items: [
      { title: "16 registrations waiting for review", detail: "Parents and staff", status: "syncing" },
      { title: "November fees generated", detail: "204 students · ₹7,10,000", status: "done" },
    ],
  },
  staffLogin: {
    title: "Teach, track and update in one place.",
    body: "Mark attendance, post class updates, share homework and notify parents of your own classes.",
    items: [
      { title: "Grade 10 · Maths class update", detail: "Due today by 8:00 PM", status: "syncing" },
      { title: "Attendance marked · 30 / 32", detail: "Evening session", status: "done" },
    ],
  },
  activate: {
    title: (
      <>
        Welcome to the
        <br />
        Dynamic Donalds team.
      </>
    ),
    body: "Your login details are emailed once admin approves your registration. Activate once, then sign in any time.",
    items: [
      { title: "Registration approved by admin", detail: "Login details emailed", status: "syncing" },
      { title: "Classes assigned", detail: "Grade 9–10 · Maths", status: "done" },
    ],
  },
  forgot: {
    title: "Locked out? Back in two minutes",
    body: "Reset links are single-use, expire quickly and every reset is recorded in the audit log.",
    items: [
      { title: "Reset link sent to l•••@email.com", detail: "Expires in 30 minutes", status: "syncing" },
      { title: "Other sessions signed out", detail: "After password change", status: "done" },
    ],
  },
  setPassword: {
    title: "Keep every account secure",
    body: "Strong passwords, lockout after repeated failures and a permanent log of every sign-in.",
    items: [
      { title: "Checking password strength", detail: "Letters, numbers, length", status: "syncing" },
      { title: "Reset link verified", detail: "Single use", status: "done" },
    ],
  },
} satisfies Record<string, AsideContent>;

/** 403 and Session expired share this panel; the idle time comes from settings. */
export function accessAside(idleMinutes: number): AsideContent {
  return {
    title: "Each role sees only what it should",
    body: (
      <>
        Admin manages fees, approvals, courses and settings. Staff see their own classes. Sessions end after{" "}
        <strong className="font-semibold text-ink">{idleMinutes} minutes</strong> idle.
      </>
    ),
    items: [
      { title: "Route checked on the server", detail: "Every page, every request", status: "syncing" },
      { title: "Signed out after inactivity", detail: `${idleMinutes} min idle`, status: "done" },
    ],
  };
}
