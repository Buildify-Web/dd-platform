# CLAUDE.md — dd-platform

Project knowledge for **Dynamic Donalds** (a tuition / coaching institute, Pre-KG to Grade 12), built by **Buildify**.
Source of truth: *Dynamic Donalds — Full Project Scope Document (Final, 24 Oct 2026)*. Read this file before working on any app in this repo.

---

## 1. What this repo contains

The full solution has 4 deliverables. **This repo (`dd-platform`) contains only the web side:**

| # | Deliverable | In this repo? | Location |
|---|---|---|---|
| 1 | Public website (responsive) | ✅ Built | `apps/website` |
| 2 | Web admin portal | ✅ Planned (next) | `apps/webapp` |
| — | Backend API (serves website, admin portal **and** the mobile app) | ✅ Planned | `apps/backend` |
| — | Background jobs (fee reminders, alerts, cleanup) | ✅ Planned | `apps/worker` |
| 3 | Mobile app (Flutter/Dart, Parent + Teacher roles) | ❌ **Separate repo** | — |
| 4 | Availo RFID attendance (Buildify hardware) | Integration only | `apps/backend/src/modules/rfid` |

The backend must still expose every API the **mobile app** needs (parent/teacher features in §6), even though the app itself is not built here.

## 2. Tech stack (fixed — do not substitute)

| Layer | Technology |
|---|---|
| Website + admin webapp | **Next.js (App Router) + TypeScript**, Tailwind CSS v4 |
| Backend API | **Express.js + TypeScript** (Swagger docs) |
| Database | **PostgreSQL + Prisma**, managed with **pgAdmin 4** |
| Background jobs | Node worker (+ Redis for queues/locks) |
| Mobile app (other repo) | Flutter / Dart |
| Monorepo | pnpm workspaces + Turborepo |
| Deploy | Docker (one image per app), Caddy for domains + TLS, GitHub Actions CI/CD |

Current versions in use: Node 24, pnpm 12, Next.js 16.4 (uses `proxy.ts`, not `middleware.ts`), React 19.3, Tailwind 4.3, Zod 4, TypeScript 5.9.

## 3. Target project structure

Only `apps/website` and the root workspace files exist so far. Create the rest **as each part is built** — keep to this layout.

```
dd-platform/
├── apps/
│   ├── website/                   → Public website (Next.js)          ✅ built
│   │   ├── app/
│   │   │   ├── page.tsx           → Home
│   │   │   ├── about-tutors/
│   │   │   ├── gallery/
│   │   │   ├── achievements/
│   │   │   ├── courses/
│   │   │   ├── enquiry/
│   │   │   ├── alumni/
│   │   │   └── contact/
│   │   ├── components/
│   │   └── public/                → Logos, static images
│   │
│   ├── webapp/                    → Admin portal (Next.js)
│   │   ├── app/
│   │   │   ├── (auth)/login/
│   │   │   └── (dashboard)/
│   │   │       ├── approvals/
│   │   │       ├── students/
│   │   │       ├── staff/
│   │   │       ├── courses/
│   │   │       ├── competitions/
│   │   │       ├── attendance/
│   │   │       ├── homework/
│   │   │       ├── fees/
│   │   │       ├── announcements/
│   │   │       ├── question-papers/
│   │   │       ├── assignments/
│   │   │       ├── marks/
│   │   │       ├── rfid/
│   │   │       └── reports/
│   │   ├── components/
│   │   └── lib/                   → API calls, auth helpers
│   │
│   ├── backend/                   → Express + TypeScript API
│   │   ├── src/
│   │   │   ├── modules/           → One folder per feature
│   │   │   │   ├── auth/
│   │   │   │   ├── registration/
│   │   │   │   ├── students/
│   │   │   │   ├── staff/
│   │   │   │   ├── courses/
│   │   │   │   ├── competitions/
│   │   │   │   ├── attendance/
│   │   │   │   ├── homework/
│   │   │   │   ├── leave/
│   │   │   │   ├── fees/
│   │   │   │   ├── assignments/
│   │   │   │   ├── question-papers/
│   │   │   │   ├── marks/
│   │   │   │   ├── announcements/
│   │   │   │   ├── notifications/
│   │   │   │   ├── enquiry/
│   │   │   │   ├── reports/
│   │   │   │   └── rfid/          → Receives scans from Availo devices
│   │   │   ├── middleware/        → Login check, role check, errors
│   │   │   ├── services/          → Email, push (FCM), file storage, translation
│   │   │   ├── config/
│   │   │   ├── docs/              → Swagger setup
│   │   │   └── server.ts
│   │   └── tests/
│   │
│   └── worker/                    → Automatic background jobs
│       └── src/jobs/
│           ├── fee-reminders.ts       → 10th, 20th, last day
│           ├── absentee-alert.ts      → After each session
│           ├── homework-daily.ts      → End of day
│           ├── attendance-pending.ts  → Teacher not marked
│           └── homework-cleanup.ts    → Remove after 1 month
│
├── packages/
│   ├── db/                        → Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts            → Sample data for local testing
│   │   └── index.ts
│   ├── shared/                    → Used by backend + webapp + website
│   │   ├── validation/            → Name ≤100 chars, photo ≤2 MB, 10-digit mobile
│   │   ├── constants/             → Grades, fee status, course rules
│   │   └── types/
│   ├── ui/                        → Shared Tailwind components
│   └── config/                    → ESLint, TypeScript, Tailwind settings
│
├── docker/
│   ├── website.Dockerfile
│   ├── webapp.Dockerfile
│   ├── backend.Dockerfile
│   └── worker.Dockerfile
├── docker-compose.dev.yml         → Local: PostgreSQL + Redis
├── docker-compose.prod.yml        → Server: all apps
├── Caddyfile                      → Domains + SSL on the server
├── .github/
│   ├── workflows/
│   │   ├── checks.yml             → Runs on every PR
│   │   └── deploy.yml             → Runs on update to Production
│   ├── CODEOWNERS
│   └── pull_request_template.md
├── .env.example                   → List of required settings (no real passwords)
├── turbo.json
├── pnpm-workspace.yaml
└── README.md
```

**Move-to-shared TODO:** the website currently keeps `lib/constants.ts` (grades, enquiry interests) and `lib/validation/enquiry.ts` (Zod schema) locally. When `packages/shared` is created, move them there and import from the website, webapp and backend so all three validate identically.

## 4. Commands

```bash
pnpm install                 # from repo root
pnpm dev:website             # http://localhost:3000
pnpm --filter @dd/website build | lint | typecheck
pnpm build / lint / typecheck   # all apps via turbo
```

pnpm is installed via corepack/npm (`npm i -g pnpm` if missing).

## 5. Domain rules (apply everywhere — website, webapp, backend, app)

### Grades and course rules (scope §5)
- Grades: **Pre-KG, LKG, UKG, Grade 1 … Grade 12**.
- **Below Grade 8 (Pre-KG–8):** Regular tuition; Maths Olympiad / Science Olympiad; Spell Bee; **Phonics only for Pre-KG–Grade 2** (disabled above Grade 2).
- **Grades 9–10:** Regular tuition Maths & Science (**mandatory, enabled by default**); Tamil; English; Social.
- **Grades 11–12:** Maths, Physics, Chemistry, Computer Science, Commerce, Accounts, Applied Maths, Economics.
- Attendance: **below Grade 8 → one entry per day**; **Grade 9+ → morning and evening sessions**. (The scope does not say how Grade 8 is handled; confirm with the client.)
- Assignments exist **only for Grades 9–12**.
- Session type: **Online / Offline**. Learning mode: **Group / One-on-One**. Choosing **One-on-One forces Online and locks it**.

### Field validation (scope §4)
- Person names (student, father, mother, teacher): **≤100 chars, letters, "." and spaces only**, no numerals.
- Mobile: **exactly 10 digits**, numeric. Email: standard validation.
- Address: **≤200 chars**. Profile photo / homework image: **≤2 MB**.
- Course / competition name: **≤100 chars**. Enquiry, daily status text: **≤500 chars**.

### Statuses
- Student: **Active / Inactive**. Inactive is allowed **only when no courses are enrolled**; admin can reactivate.
- Fee per month: **Paid Completely / Paid Partially (record the remaining balance) / Unpaid**.
- Attendance mark: **Present / Absent / Leave Applied / NA**.
- Notifications (website-triggered and announcements) go **only to active students and parents**.

## 6. Feature scope

### 6.1 Public website — `apps/website` (built)
Pages: Home, Courses (reflects configured courses and grades), Tutors (`/about-tutors`), Achievements, Gallery, Alumni & Feedback, Contact, Enquiry (≤500 chars, confirmation on success). Gallery, achievements and courses will later be **managed by admin** through the webapp: the content now lives in `apps/website/content/*.ts` and should switch to backend APIs.

### 6.2 Web admin portal — `apps/webapp` (next to build)
- **Platform:** secure auth plus RBAC; account activation, password reset, and credentials emailed securely; file uploads with access-controlled downloads; email notifications; search, filters and date-range reports; **CSV and Excel export**; **audit history** (admin actions, fee changes, marks updates, attendance corrections); responsive UI.
- **Registration approval:** review and edit parent/student and staff registrations, then approve or reject. On approval, the student becomes **Active** and the username and password are emailed.
- **Students:** view and edit at any time; Active/Inactive rule (§5); manage enrolments; **approve parent enrolment changes** (new enrolments and deregistrations) before they take effect.
- **Staff:** approve registrations; **assign each teacher to grade + course**. Teachers see only students that match their assignments.
- **Attendance:** dashboard; date-range reports by student, class/grade, or teacher; manual entries plus Availo RFID entries (teachers and students); **absentee alert to admin right after each session ends**.
- **Homework:** review submissions and teacher updates; date-range reports by student, class/grade or teacher; **end-of-day alert listing "not completed"**.
- **Fees:** create and edit course fees at any time; monthly status per student; **per-student fee override**; **one-time payments** (count toward outstanding balance and reminders); **exempt students from reminders**; record offline payments; review payments parents made from the app's payment page (GPay QR, GPay number, bank transfer) and record them against fee records; pending-dues report and export at any time.
- **Automatic fee reminders**, each showing the correct outstanding amount: **10th** (all parents with an outstanding balance), **20th** (if still unpaid), **last day of the month** (if still unpaid).
- **Competitions:** name (≤100), date, registration fee and transport fee; multiple **sub-competitions**, each with its own fee; fees editable at any time; notify parents of the relevant grades on creation; shown to those parents under Course Enrolment with a checkbox each; **total = selected registration fees + transport fee**.
- **Courses:** name (≤100), one or more eligible grades (Pre-KG–12), and a fee; published courses appear in the parent Course Enrolment section; grade rules (§5).
- **Announcements:** text is mandatory; optional filters for Grade, Course (based on grade, including competitions), Session Type and Learning Mode. No filter sends to all active students and parents; filters send to the parents of matching students. Notification list filters by date range, newest first.
- **Question papers:** activate or delete at any time. **Only activated papers are visible to parents**, as links; deleted papers disappear.
- **Assignments:** admin can delete any staff assignment. It is removed from teacher and parent views, and **its links stop working**.
- **Admin can also do teacher functions:** mark attendance, update homework status, upload question papers, update marks.
- **RFID admin:** card assignment, replacement and disabling; review list for unmatched or invalid scans; device health; authorised corrections with audit trail; history and reports.

### 6.3 Backend APIs also needed by the mobile app (built elsewhere)
- **Parent:** registration (fields in §5, photo, session type and learning mode); course enrolment (deregistration **only during days 1–10 of the month**, changes need admin approval, competitions with checkboxes and total); homework (text or image ≤2 MB; date is system-filled and not editable; editable; teacher notified; teacher feedback shown; **completed homework hidden 1 month after submission**); daily class updates (up to **3 months back**; notified on update; **can send a reminder if the teacher hasn't updated for more than 2 days**); attendance table (notified immediately on Absent); leave application (by sessions or date range; admin approves); fees (history, due, partial payments, balance, payment page, change history, notifications); assignments for Grades 9–12 (links; **answers go to the teacher's email and are not uploaded in the app**); question papers after activation; marks once the teacher has updated them **and admin has made results visible**; general enquiry; notifications; **Tamil**: UI toggle plus cached auto-translation of user content (each text translated once, best effort).
- **Teacher:** registration (name, mobile, email, address, photo; admin approval); only assigned students; attendance marking (reminder to teacher and admin if not marked); daily class and homework status (grade → course → optional student; ≤500 chars; no student = whole grade and course; parents notified); assignments (Grades 9–12, grade or individual student, creates a link, admin alerted); question papers (one student or the whole session; needs admin approval; admin alerted); marks (grade → student and subject; enter or correct; parents notified, subject to visibility rules); notifications by date range, newest first.

### 6.4 Availo RFID (scope §6)
Buildify's own device. Read card ID, map it to the cardholder (its own card-to-student mapping), and record date, time, card ID and device ID; **dedupe taps within a configurable window**; review list for unmatched or invalid scans; card assign, replace and disable; device health; corrections with audit; events feed into the admin portal and app. Manual attendance remains available. **The model, firmware and protocol must be verified before the integration is final.** Hardware and cards are quoted separately.

### 6.5 Background jobs (`apps/worker`)
Fee reminders (10th, 20th, last day); absentee alert after each session; end-of-day homework "not completed" report; attendance-not-marked reminders; homework cleanup (hidden after 1 month); notification fan-out.

### 6.6 Acceptance criteria (scope §8, summarised)
Website live and responsive · register → approve → login with role-only access · grade and competition rules work · parent and teacher features work · admin can manage everything · reminders on 10th, 20th and last day with correct balances · papers hidden until activated · deleted assignments and papers inaccessible by link · admin-recorded payments update fee records · RFID handles valid, duplicate and unmatched scans and card management · access control, notifications, reports, audit and E2E tests pass.

**Out of scope (future AI phase):** homework feedback drafts, attendance insights, progress summaries, question-paper drafting, fee-defaulter prediction, parent support chat, better translation.

## 7. Website implementation notes (`apps/website`)

- **Design is fixed.** It must match the approved Figma exports page for page (Home, Courses, Tutors, Achievements, Gallery, Alumni, Contact, Enquiry, plus the navbar and footer). Don't restyle; only change content.
- **Design tokens** live in `app/globals.css` under `@theme`: `ink #17260f` (text and dark cards), `brand #2b7010` (green), `sun #f6c90e` (yellow), `mist #ecece6` (hero and section background), `paper #f2f4ee` (footer), `frame #eff0ea` (card frame), `sage #dce8cf`, `ghost #9a9e92` (grey headline words). Font is **Outfit** via `next/font` (self-hosted).
- **Shared building blocks:** `HeroFrame` (rounded grey frame with the navbar inside), `PageHero`, `CtaBand`, `PillButton` (dark pill with a round arrow), `CourseCard`, `PhotoCard` (photo or silhouette tile with tag pills), `PersonTile`, `Footer` (with the giant faded wordmark).
- **Content files** (all sample data, to be replaced with the client's real data): `content/courses.ts`, `content/people.ts` (tutors, alumni, testimonials), `content/gallery.ts`, `lib/site.ts` (phone, email, address, office hours, rating). Real contact details: **+91 91504 85214**, **meenaannamalai27@gmail.com**. The address and office hours are samples.
- **Images:** local WebP files in `public/images` (stock placeholders; replace them using the same filenames or update the content files). Logo: `public/logo.png` (transparent); favicons are `app/icon.png` and `app/apple-icon.png`. **No remote image hosts are allowed** (CSP plus `images.remotePatterns: []`).
- **EN/TA toggle** (`lib/i18n.tsx`) translates the site chrome (nav, footer, CTAs) only. Full Tamil page copy needs client-reviewed text.
- **Enquiry flow:** `EnquiryForm` (client-side Zod) → `POST /api/enquiry` → server validates again and forwards to `${BACKEND_API_URL}/enquiries` with an `X-Internal-Key` header. With no backend: dev accepts without storing; **production returns 503** so leads are never silently dropped. The backend `enquiry` module must implement `POST /enquiries`, accepting `{ name, mobile, email, grade, interests[], message, source }`.

### Security baseline (keep this for the webapp too)
- `proxy.ts`: **per-request nonce CSP** (`script-src 'self' 'nonce-…' 'strict-dynamic'`, `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'self'`, `base-uri 'self'`). Pages render dynamically (`await connection()` in the root layout) so the nonce applies.
- `next.config.ts`: HSTS, `X-Frame-Options: DENY`, `nosniff`, a strict `Referrer-Policy`, a locked-down `Permissions-Policy`, COOP/CORP same-origin, `poweredByHeader: false`; API routes get `default-src 'none'` and `no-store`.
- API routes: **same-origin check** (Origin/Referer must match the host); JSON-only (415 otherwise); body cap of 8 KB; **rate limit** (5 per 10 minutes per IP, in memory; move to Redis when scaling); **strict Zod schemas** (unknown keys rejected); a honeypot field; generic error messages; **never log personal data**.
- No `dangerouslySetInnerHTML`. External links use `rel="noopener noreferrer"`. Secrets live only in env (`.env.example` lists the names).
- For the webapp and backend: httpOnly + Secure + SameSite cookies or short-lived JWT plus refresh; bcrypt/argon2 password hashing; RBAC checked **on the server for every route**; signed, expiring file-download URLs; Prisma only (no raw SQL string building); audit log on sensitive actions; enforce upload size and type limits on the server.

## 8. Conventions
- TypeScript strict (`noUncheckedIndexedAccess` on). Path alias `@/*` per app.
- Server Components by default. Add `"use client"` only for interactivity (tabs, carousels, forms, toggles).
- Keep validation rules and constants in one place (`packages/shared` once created) and reuse them on client and server.
- Run `lint`, `typecheck` and `build` before handing work over.
