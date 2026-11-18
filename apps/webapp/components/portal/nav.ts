/**
 * Sidebar navigation for both portals (matches the designs' groups and order).
 * `count` names a key from GET /v1/meta/counts; group badges add up their items.
 */
export type NavItem = { label: string; href: string; icon: string; count?: string; exact?: boolean };
export type NavGroup = { key: string; label: string; items: NavItem[] };

export const ADMIN_NAV: NavGroup[] = [
  {
    key: "main",
    label: "Main menu",
    items: [
      { label: "Dashboard", href: "/admin", icon: "grid", exact: true },
      { label: "Approvals", href: "/admin/approvals", icon: "check", count: "approvals" },
      { label: "Students", href: "/admin/students", icon: "users" },
      { label: "Staff", href: "/admin/staff", icon: "user" },
      { label: "Leave requests", href: "/admin/leave", icon: "calendar", count: "leave" },
    ],
  },
  {
    key: "academics",
    label: "Academics",
    items: [
      { label: "Attendance", href: "/admin/attendance", icon: "attendance" },
      { label: "Homework", href: "/admin/homework", icon: "book" },
      { label: "Class updates", href: "/admin/class-updates", icon: "pencil" },
      { label: "Marks", href: "/admin/marks", icon: "chart" },
      { label: "Question papers", href: "/admin/question-papers", icon: "file", count: "papers" },
      { label: "Assignments", href: "/admin/assignments", icon: "clipboard" },
      { label: "Courses", href: "/admin/courses", icon: "cap" },
      { label: "Competitions", href: "/admin/competitions", icon: "trophy" },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    items: [
      { label: "Fees", href: "/admin/fees", icon: "card" },
      { label: "Payments to review", href: "/admin/payments", icon: "dollar", count: "payments" },
      { label: "Reports", href: "/admin/reports", icon: "bars" },
    ],
  },
  {
    key: "communication",
    label: "Communication",
    items: [
      { label: "Announcements", href: "/admin/announcements", icon: "megaphone" },
      { label: "Notifications", href: "/admin/notifications", icon: "bell", count: "notifications" },
    ],
  },
  {
    key: "system",
    label: "System",
    items: [
      { label: "RFID", href: "/admin/rfid", icon: "idcard", count: "rfid" },
      { label: "Website content", href: "/admin/website", icon: "globe", count: "enquiries" },
      { label: "Audit log", href: "/admin/audit", icon: "history" },
      { label: "Settings", href: "/admin/settings", icon: "gear" },
    ],
  },
];

export const STAFF_NAV: NavGroup[] = [
  {
    key: "main",
    label: "Main menu",
    items: [
      { label: "Dashboard", href: "/staff", icon: "grid", exact: true },
      { label: "My students", href: "/staff/students", icon: "users" },
      { label: "Attendance", href: "/staff/attendance", icon: "attendance" },
      { label: "Class updates", href: "/staff/class-updates", icon: "pencil" },
    ],
  },
  {
    key: "teaching",
    label: "Teaching",
    items: [
      { label: "My courses", href: "/staff/teaching", icon: "cap" },
      { label: "Homework", href: "/staff/homework", icon: "book", count: "homeworkToCheck" },
      { label: "Assignments", href: "/staff/assignments", icon: "clipboard" },
      { label: "Question papers", href: "/staff/question-papers", icon: "file" },
      { label: "Marks", href: "/staff/marks", icon: "chart" },
    ],
  },
  {
    key: "communication",
    label: "Communication",
    items: [
      { label: "Class notices", href: "/staff/notices", icon: "megaphone" },
      { label: "Notifications", href: "/staff/notifications", icon: "bell", count: "notifications" },
    ],
  },
];
