# CLAUDE.md — dd-platform

Project knowledge for **Dynamic Donalds** (a tuition / coaching institute, Pre-KG to Grade 12), built by **Buildify**.
Source of truth: *Dynamic Donalds — Full Project Scope Document (Final, 24 Oct 2026)*. Read this file before working on any app in this repo.

---

## 1. What this repo contains

The full solution has 4 deliverables. **This repo (`dd-platform`) contains only the web side:**

| # | Deliverable | In this repo? | Location |
|---|---|---|---|
| 1 | Public website (responsive) | ✅ Built | `apps/website` |
| 2 | Web admin portal | ✅ Built (§9 sign-in, §10 everything else) | `apps/webapp` |
| — | Backend API (serves website, admin portal **and** the mobile app) | ✅ Portal API built (§9, §10); parent app endpoints pending | `apps/backend` |
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

Current versions in use: Node 24, pnpm 12, Next.js 16.4 (uses `proxy.ts`, not `middleware.ts`), React 19.3, Tailwind 4.3, Zod 4, TypeScript 5.9, Express 5, **Prisma 7.10** (pinned: 8.x is still RC), argon2 via `@node-rs/argon2`, pino, Vitest 5, tsup.

**pnpm build scripts:** pnpm 12 refuses dependency install scripts unless listed under `allowBuilds` in `pnpm-workspace.yaml`. Allowed: `@prisma/engines`, `prisma`, `esbuild`. Denied: `@scarf/scarf` (telemetry ping from swagger-ui). Add new entries deliberately.

## 3. Target project structure

Built so far: `apps/website`, `apps/webapp` (auth screens), `apps/backend` (auth module), `packages/shared`, `packages/db`. Create the rest **as each part is built**, keeping to this layout. The webapp auth routes differ from the early sketch below; the real layout is in §9.

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

**Move-to-shared TODO:** `packages/shared` now exists (auth rules live in `@dd/shared/auth`). The website still keeps `lib/constants.ts` (grades, enquiry interests) and `lib/validation/enquiry.ts` (Zod schema) locally. When `packages/shared` is created, move them there and import from the website, webapp and backend so all three validate identically.

## 4. Commands

```bash
pnpm install                 # from repo root (also runs `prisma generate`)
pnpm dev:website             # http://localhost:3000
pnpm dev:webapp              # http://localhost:3100  (admin & staff portal)
pnpm dev:backend             # http://localhost:4000  (Swagger UI at /docs)
pnpm db:up                   # Docker: PostgreSQL on 55432 + Redis on 56379 (docker-compose.dev.yml)
pnpm db:migrate              # prisma migrate dev (reads DATABASE_URL from apps/backend/.env)
pnpm db:deploy               # prisma migrate deploy (production)
pnpm admin:bootstrap         # create / re-invite the main admin (§9)
pnpm --filter @dd/backend seed:dev  # DEV ONLY sample data + dev-admin / dev-staff logins (§10.9)
pnpm --filter @dd/website build | lint | typecheck
pnpm build / lint / typecheck / test   # all packages via turbo
```

Local env files (gitignored): `apps/backend/.env`, `apps/webapp/.env.local`, `apps/website/.env.local`. `/.env.example` lists every key.

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
- **Content files:** `content/courses.ts` and the rating in `lib/site.ts` are still sample data. The **tutors, alumni and testimonials (real Google reviews) in `content/people.ts` are real** (see "People pages" below). `content/gallery.ts` holds the **client's real photos**. `lib/site.ts` holds the contact details.
- **Real contact details:** **+91 91504 85214**, **meenaannamalai27@gmail.com**, and the address **Krishna Swamy St, Lakshmi Nagar, Ganapathipuram, Chromepet, Tambaram, Tamil Nadu 600044**. The institute is in **Chromepet**, not Ashok Nagar; that was an old sample.
- **Address fields:** `addressShort` (footer) is "Krishna Swamy St, Lakshmi Nagar, Chromepet". `mapsHref` is a Google Maps search for "Dynamic Donalds" plus the full address. Swap in the client's Maps share link if they provide one. Office hours are still samples.
- **Images:** local WebP files in `public/images`. Apart from the gallery, these are stock placeholders; replace them using the same filenames or update the content files. Favicons are `app/icon.png` and `app/apple-icon.png`. **No remote image hosts are allowed** (CSP plus `images.remotePatterns: []`).
- **Logo files:**
  - `public/logo.png` is the full logo, with the emblem plus the "DYNAMIC DONALDS / Education is Life" banner. The footer and OpenGraph use it.
  - `public/logo-mark.png` is the emblem only (336×331), cropped from `logo.png` and trimmed to its visible pixels. The navbar and the intro use it.

### Website features added after the first build
- **People pages: Tutors and Alumni share one UI** (`components/ProfileGrid.tsx`, client)
  - **Data shape:** both lists use the `Profile` type in `content/people.ts`. `Tutor = Profile & { tone }`; alumni are plain `Profile[]`.
    - `Profile` fields: `id` (used in the share link), `name`, `headline` (one line), `tags` (only the first shows on phones, so put the most useful one first), `photo`, an optional `teaches` (`{ group, subjects[] }[]`), and `path` (newest first).
    - Each `path` step has `kind` `education`, `research` or `work`, plus optional `place`, `when` and `note`.
    - Leave out any field the client didn't give. **Never invent years, institutions or degree names.**
  - **Page wrappers:** `app/about-tutors/TutorGrid.tsx` and `app/alumni/AlumniGrid.tsx` are thin server components. Each passes `hashPrefix`, `noun`, `eyebrow`, `cta` and a `tile` to `ProfileGrid`. Build any new people list (staff, toppers…) the same way rather than writing a new grid.
  - **UI design: grid**
    - **Columns:** `grid-cols-2` on phones (gap 2.5) and `lg:grid-cols-4` (gap 3).
    - **Cards:** each card is a `<button>` styled like PhotoCard (`lift group`, `bg-frame p-1.5`, `rounded-[1.25rem]`).
    - **Card photo:** `aspect-[4/4.7]`, `rounded-[1rem]`, a bottom gradient, outlined white `tag-pill`s, a "View profile" chip that fades in on hover, and a 1.05 zoom on hover.
    - **Card text:** the name (0.95rem, medium) and the headline (xs, muted; 2 lines on phones, 1 line at `sm`). A `CircleArrow` sits on the right from `sm` up.
    - **Faces:** every photo uses `object-cover object-[50%_22%]` so faces stay in frame.
  - **UI design: completion tile**
    - **What it is:** an ink tile after the cards that fills out the last row, with a radial green circle top-right and a yellow pill link with an ink arrow circle.
    - **Tutors:** "7 tutors / Meet a tutor", in 1 column.
    - **Alumni:** "From our classrooms to medicine and technology / Start your child's journey", spanning `col-span-2`.
    - **Height:** keep it short so it never stretches the row. When the number of people changes, re-check that the tile still completes the row.
  - **UI design: profile dialog** (`<dialog>`, `w-[min(94vw,1000px)]`, `rounded-[1.5rem]`, ink/75 blurred backdrop, `anim-rise` when the person changes)
    - **Photo:** on the left at `md` (`0.85fr`), with an "n of N" chip and the tags.
    - **Details:** on the right, the eyebrow ("Tutor profile" / "Alumni profile"), the name (3xl–4xl), the headline, the "Teaches" chips (an ink group pill plus mist subject pills), and the icon timeline:
      - education = yellow cap
      - research = sage flask
      - work = green briefcase
      - `note` = a yellow badge
    - **Timeline heading:** reads "Education & experience" only when there's a `work` step, otherwise "Education".
    - **Height:** `min(540px, 88dvh)` for short profiles (no `teaches` and 3 or fewer steps), otherwise `min(660px, 88dvh)`.
    - **Footer:** pinned, with prev, "Next: name" and the CTA `PillButton`. Only the details area scrolls. On phones the whole dialog scrolls.
    - **Behaviour:**
      - Arrow keys switch people, and Esc or a backdrop click closes it.
      - Body scroll is locked while it's open.
      - The URL hash `#<prefix>-<id>` (`#tutor-bashir`, `#alumni-janani`) is kept in sync, and it opens on load and on `hashchange`.
- **Tutors data:** 7 real tutors, in this order: Dr. Bashir (Biochemistry, Ph.D.), Srimathi M (Chemistry, gold medalist), Bharathi R (Physics, M.Phil.), Kuzhali (Physics, M.Sc. 2023), Kalaiselvan G (Humanities, with TGT/PGT `teaches`), Sridevi (B.E. ECE), B. Aishvarya (B.Tech IT; card tag "IT").
  - **Photos:** `public/images/tutors/<id>.webp` (q82, max 900px wide). Kalaiselvan's black scan bars and Srimathi's scan border were trimmed. The user confirmed which photo is which tutor.
  - **Kuzhali's M.Sc. year** was a typo ("203"); the client confirmed it is 2023.
  - **Still to confirm with the client** (also noted in the file):
    - Srimathi's Ph.D. is read as "pursuing at SRM IST, Kattankulathur".
    - Dr. Bashir's "UG" and "PG" are kept as given, because the exact degree names weren't supplied.
- **Alumni data:** 2 real alumni. "Batch of" means the year they passed Class 12.
  - **Prakruthi B** (batch of 2022): Software Developer, Zenitude Technology Solutions, Hyderabad.
  - **Janani Selvan** (batch of 2023): MBBS, final year, ACS Medical College and Hospital.
  - **Photos:** `public/images/alumni/<id>.webp`. The user confirmed which photo is which person.
  - **Page header:** "Where our students are now".
  - **Removed:** the stock `alumni-graduate.webp` and `alumni-batch.webp`, plus the stock `tutor-arjun.webp` and `tutor-english.webp`.
- **Student video feedback** ("Student's feedback" on `/alumni`, `id="student-feedback"`, between the Alumni grid and the parent testimonials)
  - **Where the files go:** videos go in `apps/website/public/videos/feedback/` as `feedback-01.mp4` … `feedback-05.mp4` (the client's real clips are in place). Their text lives in `content/video-feedback.ts`, which documents adding more at the top of the file. The client has about 28 videos in total.
  - **Current students** (real, client summaries, Nov 2026): 01 Darshana, 02 Madhumitha, 03 Nitesh Aravind, 04 Thanishya, 05 Rajitha.
  - **Video format:** MP4 (H.264 + AAC), portrait 9:16, around 720p, 2–6 MB each, with `-movflags +faststart`. The ffmpeg command is in the file. An optional poster `.jpg` can sit next to each video.
  - **Missing files:** a missing file shows a clean "Video coming soon" slide, detected through the `<video>` `onError` event. In dev only, it also shows the expected path.
  - **Entry fields:** `id`, `video`, `student`, `headline` (one short line) and `points` (2–4 key points). `poster` and `rating` (default 5) are optional.
    - **Removed on purpose** (client request): grade, course, subject, tags, quote and stats. Don't add them back.
    - **Writing style:** write the points as short third-person summaries in clean English, not as invented direct quotes. Teacher names are as the client gave them (Meena ma'am, Kowsalya ma'am, Thenu sir).
  - **UI: card shell** (`app/alumni/VideoFeedback.tsx`, client): a single ink card, `rounded-[1.75rem]`, with a deep shadow and two soft brand glows (green radial top-right, faint yellow bottom).
  - **UI: video side** (left, `18rem` at `md`, `20.5rem` at `lg`; `aspect-[9/14]` on phones, `9/16` from `sm`)
    - **Top:** story-style progress segments, one per video. The active one fills with playback.
    - **Top-left:** an "01 / 10" chip. **Top-right:** a glass sound toggle.
    - **Centre:** a glass play/pause button.
  - **UI: review side** (right): a glass panel (`bg-white/[0.04]`, ring white/7) containing:
    - a "Verified student" pill (brand-bright) plus yellow stars
    - the headline (1.6–2rem)
    - a "Student" row (yellow cap icon plus name)
    - after a hairline, the key points, each with a yellow tick badge
    - a footer with "Up next", a ghost prev button, a yellow next button, and dots (shown only for 12 or fewer videos)
  - **Behaviour:**
    - Plays **muted**, and only while 35% or more of the card is on screen. It never autoplays under `prefers-reduced-motion`.
    - When a clip ends it moves to the next one.
    - ←/→ keys, the arrows, the dots and swiping (more than 50px) all navigate. A swipe suppresses the tap-to-play click that follows it.
    - An `aria-live` line announces the current student.
  - **CSP:** there is no `media-src`, so it falls back to `default-src 'self'`. Self-hosted videos work; external video hosts would need a CSP change.
  - **Repo size:** about 28 videos at around 4 MB each is roughly 110 MB. If that's too heavy for git, move them to object storage and update the `video` URLs (plus `media-src` in the CSP).
- **Founder & award** (client text and photo, Nov 2026)
  - **"Our founders" section on `/about`** (`FounderDesk` in `app/about/page.tsx`; content is `founderMessage`, `founderWorks` and `leadersAward` in `content/about.ts`). It sits after Our story and is in the section chips and the rail.
    - **Header:** "Thenu & Meena **Annamalai**" (ghost "&", surname in brand green), with the aside "Thenu Annamalai & Meena Annamalai founded Dynamic Donalds, Chennai, in 2013."
    - **Founders card:** an ink card with `founders.togetherPhoto` (`public/images/founders-together.webp`: both founders outdoors, 866×649 source upscaled 2× to 1732×1298, q90, `aspect-[4/3]`), a "Since 2013" chip, "Thenu & Meena **Annamalai**" and a yellow heart disc.
    - **Award photo:** the award photo is **not** used here (client request). It already leads the Achievements page.
    - **Message panel:** a mist panel headed "A note from Meena Annamalai", with an intro that is deliberately neutral (no "I founded", because there are two founders), a large yellow-ruled quote ("We are not just a tuition centre. We are a family where Education meets Sanskar."), a closing line, and her name plus an "Our achievements" link.
    - **Key-work cards:** four white cards, each with a numbered watermark, an icon, a body and a stat:
      - workbooks with print partner Quicky (KG–5)
      - free competition training (11 years)
      - 100% pass results (12+ years)
      - free education and the VILA collaboration
  - **Award:** "Leaders of the Change", Star Education Awards 2026, with The Times of India (media partner).
    - **Photo:** `public/images/awards/leaders-of-change-2026.webp` (901×623 source, upscaled 2× to 1802×1246, q90).
    - **Where it shows:** a 2026 step in the Our story timeline, and a **"Recognition" feature at the top of `/achievements`** (an ink card with the photo, "Awarded to Meena Annamalai, Founder & Managing Director of Dynamic Donalds…", and a "Meet our founders" link to `/about#founder`).
    - **Sample data:** the Hall of fame below the Recognition feature on `/achievements` is still sample data.
  - **Spelling:** standardised to the founder's own **"Aarivukalanjiyam"** and **"Kalanjiyam"** everywhere; it used to be "…kalanjium".
  - **Medals card:** now reads "Hundreds of Gold, Silver & Bronze", per the founder's text.
- **Google reviews** (the "What parents and students say about us" section on `/alumni`: `app/alumni/Testimonials.tsx`, data is `testimonials` in `content/people.ts`)
  - **Source:** 21 **real** Google reviews, picked from the written reviews the client copied from the Maps listing (Nov 2026).
  - **Review counts** (`lib/site.ts`): **98 on Google** (`googleReviewsCount`) and **102 on Justdial** (`justdialReviewsCount`), both shown in the rating box area.
    - **Why the paste had fewer:** it only had about 51 reviews because Google lists only reviews with written text; star-only ratings still count towards the total.
    - **Keeping them current:** update both numbers as they grow.
  - **Not used:** the 2 negative reviews, one-word reviews and unrelated ones are left out.
  - **Truncated reviews:** reviews Google cuts off ("… More") end at the last complete visible sentence. Only spelling, spacing and emoji clean-up was applied; never add words to a review.
  - **Tamil review:** Vidhya Agoram's review keeps its original Tamil (`lang: "ta"`) with an English `translation` shown underneath.
  - **Role:** `role` is "Parent" or "Student" only when the review itself says so; otherwise it's "Google review".
  - **Reviewer photos are drop-in:** put a file in `apps/website/public/images/reviews/` named `reviewPhotoSlug(name)` + `.webp/.jpg/.jpeg/.png` (lower-case name with spaces → hyphens, e.g. `christy-sandra-fernando-b.jpg`).
    - **How it's picked up:** `withReviewPhotos()` in `app/alumni/page.tsx` checks the folder on every request with `existsSync` (`process.cwd()/public`, which also works in standalone Docker when `public/` is copied next to `server.js`) and sets `photo`.
    - **How it shows:** a round photo (`ring-4 ring-white/30`) on the colour panel and a 40px circle in the list.
    - **No photo:** the initials stay. Don't hotlink Google profile URLs, because the CSP blocks remote images.
    - **Slide panel:** a big photo or initials monogram on a colour panel cycling brand / sun / ink / sage, plus a "Google review ★★★★★" pill. There is **no Parent/Student label under the image** (the client removed it); the role shows only under the name beside the quote and in the list.
  - **Quote size:** scales with the quote's length via `quoteSize()`.
  - **Timing:** auto-advance waits `readTime()`, 5–12 s depending on length, and the yellow progress bar matches.
  - **Justdial:** the listing returns 403 to automated fetches, so Justdial reviews need to be pasted in by hand.
  - **Still to confirm:** the **4.9** average rating in `lib/site.ts` (also used on the home page) hasn't been checked against the live Google listing.
- **"Admin portal" footer link** (`components/Footer.tsx`, bottom row next to the copyright, EN/TA via the `adminPortal` i18n key)
  - **URL:** the portal is hosted on **its own domain**, so the link is absolute. It comes from the `ADMIN_PORTAL_URL` env var, read **at request time** in `app/layout.tsx` (`portalUrl()`, only http/https accepted) and passed to `Footer` as `portalUrl`. One Docker image works for any domain.
  - **Fallbacks:** in development it defaults to `http://localhost:3100`; in production an empty/invalid value **hides** the link.
- **"Built by Buildify" credit** (`components/Footer.tsx`, bottom row, every page)
  - **What it is:** a small `text-xs` muted "Built by" plus the logo at `h-3.5`, at 80% opacity (full on hover), linking to https://www.buildify-web.com/ in a new tab (`noopener noreferrer`).
  - **Logo file:** `public/buildify-logo.png` (350×64), made from the client's white-on-black logo: cropped, with a transparent background and ink `#17260f` artwork so it suits the light footer.
  - **Size:** keep it small; the client asked for it to stay subtle.
- **Home: programme cards** (`components/home/StagesCarousel.tsx`)
  - **Card content:** each colour card has an icon disc, a grade chip, the title (1.6rem), a one-line description, two ticked key points, and subject pills at the bottom.
  - **Footer row:** the course count (computed from `content/courses.ts`, so it stays in sync with `/courses`) plus "· Online & offline".
  - **Wording:** points follow the course rules in §5 (Phonics Pre-KG–2; Maths & Science by default for 9–10; Science and Commerce streams; group or 1:1).
- **Home: "Trusted by" card** (`app/page.tsx`)
  - **Avatars:** the first 4 **real Google reviewers** from `testimonials`, as initials circles or their photo once it's dropped into `public/images/reviews` (`withReviewPhotos` / `reviewerInitials` in `lib/review-photos.ts`, shared with `/alumni`), plus a "98" bubble.
  - **Text and link:** "4.9 · 98 Google reviews"; the whole card links to `/alumni#reviews`.
  - **Removed:** the stock `avatar-1…6.webp` photos.
  - **Still sample:** `site.familiesCount` ("1,000+").
- **Overflow gotcha:** an `absolute` element (including `.sr-only`, e.g. `CircleArrow label=…`) inside a horizontal scroller escapes the scroller's clipping when **no ancestor is positioned**, and makes the whole page scroll sideways. Keep the card or link `relative`, or don't put sr-only text inside scroller cards.
  - **Audit limitation:** the audit script misses this because it skips clipped elements.
  - **Better check:** `window.scrollTo({ left: 600, behavior: "instant" })`, then confirm `scrollX` is still 0. Use `instant`, because the site sets `scroll-behavior: smooth` and a smooth scroll reads as 0 straight away.
- **About Us / Vision & Mission** (`app/about/page.tsx`, content in `content/about.ts`; "About" sits after Home in the navbar and in the footer)
  - **Copy:** the client's own About Us and Vision & Mission text. The one-line descriptions under the four values are ours and need client confirmation.
  - **Founder photo:** `public/images/founder.webp`, portrait, both founders holding an award (client photo, Nov 2026).
    - **Size and quality:** the client's file was a 529×1061 **JPEG renamed to .webp**. It was converted to a real WebP, denoised, upscaled 2× with Lanczos to **1058×2122**, unsharp-masked, and saved at q92. The client's original is kept in the session scratchpad. It's served with `quality={90}`; `next.config.ts` allows `images.qualities: [75, 90]`, where 75 stays the default.
    - **Crop:** the 4:5 card uses `object-[50%_35%]`, so both faces and the whole award are in frame.
    - **Quote placement:** the quote sits **below the photo**, not over it, followed by a hairline and the name row. Don't put text back over this photo.
    - **Founders:** there are **two: Thenu Annamalai and Meena Annamalai** (`founders.names` in `content/about.ts`, in that order).
      - The photo card caption reads "Thenu Annamalai & Meena Annamalai / Founders, Dynamic Donalds" with a "Founders" tag. It wraps on phones instead of truncating.
      - Nobody has confirmed who is who in the photo, so **don't say who stands where**; the alt text only names both.
      - `meena` (`Meena Annamalai, Founder & Managing Director`) is used wherever the content is hers alone: her note, the 2026 award, and the achievements card.
    - **Replacing any image under `public/images` with the same file name:**
      - Make sure it is a real WebP (check with PIL `Image.open(...).format`).
      - Delete `.next/cache/images` and `.next/dev/cache/images`, because Next.js keeps serving its old optimized copy.
      - Hard-refresh the browser (Ctrl+Shift+R).
      - Re-check the `object-position` if the photo's shape changed.
  - **Medal tally:** the client's "This year alone… _ trophies, _ gold…" has blanks, so `medalTally` stays hidden until every `count` is a number.
  - **Sections, in order:** hero with four stat tiles → "On this page" chip links → Our story (sticky founders photo card plus a 2013 / 2017 / COVID‑19 / 2026 / Today timeline) → Our founders (`#founder`) → What we do (syllabi, a results panel, "Beyond academics" tiles) → Achievements (Best School of Training award card, competitions, a medals card) → Learning with heart (free education, online worldwide, VILA) → Vision & mission (dark section; the mission is shown as "JOYFUL. PERSONAL. POWERFUL.") → Values (G / I / S / C tiles) → CtaBand "Learn. Grow. Shine."
  - **Hero photos:** two real client photos, `public/images/about/field-trip-group.webp` (bus field trip, 1157×868) and `students-teachers-group.webp`. The right one was replaced by the client in Nov 2026 with a **stage prize-distribution group photo** (1600×1066). The client's file was a JPEG renamed to .webp, so it was converted to a real WebP at q86; it uses `position="object-[35%_50%]"` via the `HeroPhoto` prop. **After any photo swap:** convert to a real WebP, delete `.next/cache/images` and `.next/dev/cache/images`, and hard-refresh. They sit **side by side in a 2-column grid, staggered vertically, and never overlap**: the "2,000+" chip goes in the gap below the left photo and the "Since 2013" chip in the gap above the right one. Don't go back to overlapping or rotated photos; the client asked for no overlap.
  - **Results panel:** the decorative green circle is kept small (180px) and pushed into the top-right corner, so it never sits behind the "90%" figure or its label (the client flagged this overlap).
  - **New icons** in `components/icons.tsx`: Heart, Eye, Target, Brush, Sparkle.
  - **Floating section rail** (`components/about/SectionRail.tsx`, client): a fixed left-side nav, `lg` and up only, frosted glass like the scrolled navbar.
    - **When it shows:** it appears once the inline chips (`#about-toc`) slide under the navbar, and hides after the Values section ends, so it never covers the CTA band or footer. Hidden states use `inert`.
    - **Active section:** the last section whose top has passed 35% of the viewport is filled yellow (`aria-current="location"`). It's computed in an rAF scroll handler.
    - **Width rule:** at **1400px and wider** it shows numbered circles 01–06, because it fits fully in the page margin. **Below 1400px** the container gutter is only 32px, so it shows slim dots (about 24px wide) so it never covers content. Hover or focus slides the labels out in both versions.
    - **Shape:** keep `rounded-xl`, not `rounded-full`, on the list. `rounded-full` turns the expanded panel into an oval.
    - **Phones and tablets** (below `lg`): no rail; the inline chips at the top remain.
    - **Adding a section:** add it to the `sections` array in the page; the chips and the rail both read it.
  - **Navbar fit:** with 8 links, the `lg` link padding is `px-2` so it fits at 1024px.
- **Gallery** (`content/gallery.ts`, `app/gallery/GalleryGrid.tsx`)
  - **Photos:** **30 real client photos** in `public/images/gallery/*.webp`, with descriptive filenames, max 1600px long side, WebP q80, EXIF-rotated. 14 were added in Nov 2026: prize winners, stage trophies, the bus ride, event prep, award and teacher-honour collages, Saraswati Pooja, the team photo, the trophy collection, certificates, paper-flower craft, the eye check-up, Diwali, and an evening celebration.
  - **Albums:** Classroom, Competitions, Events, Celebrations, Our Team.
  - **Order:** the order of the array is the "All" view: strongest photos first, albums interleaved.
  - **Data:** each item stores the photo's real `width`/`height`. `date` is optional and was left out, because the client gave no dates. Captions describe what's visible and need client confirmation.
  - **Grid:** a **uniform grid**, not masonry; the client asked for clean alignment.
    - **Columns:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, and every tile is `aspect-[4/3]`.
    - **Fitting each photo:** photos with a ratio of 1.2–1.6 use `object-cover`. Anything taller or wider (collages, the 3.3:1 trophy panorama, 2:1 shots) uses `object-contain` over a blurred, scaled copy of itself, so nothing important is cropped.
    - **Phone width:** keep `grid-cols-1` and `min-w-0` on the `<li>`. Otherwise a long truncated caption widens the implicit column past the phone screen.
    - **Loading:** 12 photos at first (4 full rows), then "Load more". Album tabs show photo counts.
  - **Lightbox:** a `<dialog>` with prev/next buttons, arrow keys and an "n of N" counter.
- **Navbar brand lockup** (`components/Brand.tsx`)
  - **Wordmark:** `BrandWordmark` rebuilds the logo's name as live text: yellow-on-green "DYNAMIC DONALDS" plus the tagline. The logo image's own text was unreadable at navbar size.
  - **Sizing:** everything is in `em` with `text-box: trim-both cap alphabetic`, so the band padding is optically equal. `BRAND_HEIGHT` (`h-[2.1em]`, measured) makes the emblem exactly as tall as the wordmark.
  - **Size control:** the navbar `<Link>`'s font size drives the whole lockup.
  - **Laptop width:** at `lg` (1024–1279px) the navbar spacing is tightened so it fits on one line.
- **Home intro loader** (`components/IntroLoader.tsx`, rendered in the root layout)
  - **Animation:** the logo is shown centred for about 2.3s with a progress line. Then the emblem and the wordmark FLIP-animate onto the navbar's `[data-brand="mark"]` and `[data-brand="name"]` elements.
  - **When it plays:** only on a full load of `/`, never on client-side navigation.
  - **Safety:** honours reduced motion with a simple fade. A CSS failsafe (`.intro-failsafe`) hides the overlay after 6s if JS never runs.
  - **Keep in sync:** keep the `data-brand` attributes on the navbar elements.
- **Interactive 3D hero phone** (`components/home/PhoneMockup.tsx`, client component)
  - **Hover motion:** on mouse or pen hover, the phone straightens from its −7° rest angle, lifts and tilts toward the pointer. An rAF spring writes `--rx`/`--ry`/`--gx`/`--gy` CSS variables, so React doesn't re-render on mouse move.
  - **Depth effects:** `preserve-3d` layers give edge thickness. The glare, the shadow and the content parallax all read those variables.
  - **No `will-change`:** don't add `will-change: transform`, because it blurs the text.
  - **Mini app:** the screen works: Home/Courses/Reports tabs, quick-action bottom sheets (homework you can tick off), event reminder, expandable announcement, attendance month toggle with an SVG donut, and the bell dot. All data is sample.
  - **Above the chips:** the hero wrapper raises the phone above the floating chips with `has-[[data-hovered=true]]:z-20`. Don't use `hover:`, which is gated on `(hover: hover)`.
  - **Touch and accessibility:** touch devices get taps but no tilt. The phone's buttons are real and accessible, so only the decorative hero shapes are `aria-hidden`.
- **Hover system** (`app/globals.css`, components layer)
  - **`.lift`:** every card or box uses it: a 6px rise plus a soft shadow, done with the `translate` property so it composes with other transforms.
  - **Entrance and float classes:** `.anim-rise`, `.anim-pop` and `.anim-float` are one-shot or looping animations. All of them are disabled under `prefers-reduced-motion`.
  - **Per-card touches:** cards add small extras through `group-hover`: icons tilt or scale, number watermarks rise, photos zoom.
  - **New cards:** use `lift group` on any new card for consistency.
  - **Horizontal scrollers:** the programme carousel's scroller has vertical padding with matching negative margin, so lifted cards aren't clipped.
- **"Why choose" 01–04 rows** (`components/home/WhyChoose.tsx`): on the active row, the number rises and darkens, a yellow accent bar grows, the text shifts and an arrow slides in. The panel re-keys on change, so the icon pops, the text rises and the green disc rotates.
- **Contact map** (`components/MapIllustration.tsx`)
  - **What it is:** a stylised, not-to-scale Chromepet map: GST Road (labelled along the road with `textPath`), the suburban railway, Chromepet Station, Radha Nagar, Hasthinapuram and "CHROMEPET".
  - **Label rules** (documented in the file):
    - keep the area under the pin bubble clear, around (360,165)
    - labels that must always show go inside desktop-visible y ≈ 46–283 and phone-visible x ≈ 155–565
    - keep the bottom-right corner free for the "Open in Google Maps" button
    - no label crosses a road or another label
  - **After changing the map:** re-check it at 390, 1280 and 1905px.

### Responsive / mobile rules (website and webapp)
- **Widths to check:** **360, 390, 768, 1024, 1280 and 1440px**. The trouble spots are 360 (small Android phones) and **1024** (the `lg` breakpoint, where the two-column layouts start and columns are at their narrowest).
- **No sideways scrolling:** no page may scroll horizontally at any width. The audit script below checks for this.
- **Big uppercase headings (`.display`):**
  - `.display` includes `text-wrap: balance`, so a forced `<br />` line that still has to wrap splits evenly instead of leaving one word alone.
  - Size headings with `clamp()`, capped so the longest forced line fits its column.
  - Home hero: `text-[clamp(2.1rem,10.2vw,2.9rem)] sm:text-6xl lg:text-[clamp(3rem,4.7vw,4.5rem)]`.
  - CTA band: `text-[clamp(1.95rem,9vw,2.3rem)] sm:text-5xl lg:text-[3.6rem]`.
  - Rule of thumb: the line "EVERY GRADE &" needs about 8em of width.
- **Buttons:** `PillButton` is `shrink-0 whitespace-nowrap`; it must never wrap or be squeezed. Where text and a button share a row in a narrow column, stack them at that breakpoint. The home hero does this: `lg:flex-col xl:flex-row`.
- **Form fields:** use `text-base sm:text-sm` (16px on phones). Anything under 16px makes iOS Safari zoom in when the field is tapped.
- **Tap targets:**
  - Aim for at least 40px.
  - To make a small control easier to tap without changing its look, add padding and an equal negative margin. The EN/TA toggle uses `py-3 -my-3`.
  - The buttons inside the hero phone mockup are a decorative demo and are exempt.
- **Cards with a photo beside text:** don't absolutely position the text with a fixed right padding; it overlaps on phones. Keep the text in normal flow, inside a flex column with `justify-between`, plus right padding equal to photo width + offset + gap at each breakpoint. Achievements highlights: `pr-[7.75rem] sm:pr-[9rem] lg:pr-[10.25rem]` with a 96 / 110 / 130px photo.
- **Phones (below `sm`):**
  - Hero floating chips are 140px wide.
  - The "Why choose" rows use a 4.25rem number column and smaller numbers, and drop the arrow and the slide. The slide only applies at `lg`, because it pushed the row past the edge.
  - The enquiry page's contact tiles are 120px tall.
- **Breaking long text:**
  - Email addresses get a zero-width space before "@" so they wrap there and nowhere else (footer).
  - Use `[overflow-wrap:break-word]`, not `anywhere`, so words aren't split mid-way.
- **Responsive audit script:** `scratchpad/cdp/audit.mjs` (rewrite it if the scratchpad is gone).
  - For each page and width, it reports horizontal overflow, the elements sticking out of the screen, tap targets under 32px and text under 12px. It also saves full-page screenshots.
  - Run it with `MSYS_NO_PATHCONV=1` in Git Bash, otherwise the `/` route gets rewritten into a Windows path.

### Dev environment notes
- **Port 3000 conflict:** on this machine, port 3000 is often taken by a Docker container from another project (`arn_frontend`). Run the site with `pnpm --filter @dd/website dev --port 3001`, or stop that container.
- **Dev CSP:** `proxy.ts` uses `style-src 'self' 'unsafe-inline'` **in dev only**, so the Next.js dev-tools toolbar can inject its styles. A nonce would cancel `'unsafe-inline'`. Production stays nonce-only.
- **Visual checks:**
  - Playwright's Chromium is installed at `%LOCALAPPDATA%/ms-playwright/chromium-1248/chrome-win64/chrome.exe`.
  - For static shots, use `--headless=new --screenshot --virtual-time-budget=8000`.
  - For hover and click checks, drive it over CDP (`--remote-debugging-port`, `Input.dispatchMouseEvent`) with Node 24's built-in `WebSocket`.
  - Headless Chrome can't go below about 500px wide, so emulate phones with `Emulation.setDeviceMetricsOverride`.
  - CDP screenshot clips use page coordinates, so add `scrollY`.
  - Virtual-time screenshots skip CSS transition frames, so you can't capture mid-animation.
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

## 9. Admin & staff portal: sign-in (built Nov 2026)

The first part of the web portal: everything from "choose your portal" to a signed-in session, built from the 7 approved auth designs. Frontend in `apps/webapp`, backend in `apps/backend/src/modules/auth`, rules in `packages/shared`, tables in `packages/db`.

### 9.1 Deployment shape
- **Separate domains:** website, portal (webapp) and API are each hosted on their own domain. The website links to the portal through `ADMIN_PORTAL_URL` (§7). Links inside emails use the backend's `PORTAL_URL`.
- **BFF pattern:** the browser **never calls the API directly**. Forms post to Next.js **server actions** (`app/(auth)/actions.ts`), which call the backend server-to-server (`lib/backend.ts`). So there is no CORS, and the session cookie lives only on the portal's own domain.
- **Internal key:** every BFF call carries `X-Internal-Key` (webapp `WEBAPP_INTERNAL_API_KEY` must be one of the backend's comma-separated `INTERNAL_API_KEYS`, ≥32 chars). Only with a valid key does the backend trust `X-Client-IP` / `X-Client-User-Agent` (the real browser's IP from Caddy's `X-Forwarded-For`), which drive rate limits and the sign-in log. Without the key those headers are ignored, so nobody can spoof their IP.
- **Mobile app:** will use the same `/v1/auth` endpoints with `Authorization: Bearer <token>`. A parent/teacher portal value is added when the app's auth is built.

### 9.2 Account model and the main admin
- **Roles:** `ADMIN`, `STAFF` (parents later). **Statuses:** `PENDING_APPROVAL` → (main admin approves) → `INVITED` (temporary password emailed) → (user activates) → `ACTIVE`; also `REJECTED`, `DISABLED`. Only `ACTIVE` accounts can sign in.
- **Main admin** (`isMainAdmin`): exactly one owner account, `MAIN_ADMIN_EMAIL` = **meenaannamalai27@gmail.com**. Created only by `pnpm admin:bootstrap` (`src/scripts/bootstrap-main-admin.ts`):
  - no main admin → creates it as `INVITED` and emails a temporary password + activation link;
  - exists but not activated → issues a fresh temporary password;
  - already `ACTIVE` → does nothing (use "Forgot password?").
  - Without Brevo configured it prints the temporary password in the terminal instead. It refuses to run if a *different* account is already main admin.
- **Nobody becomes admin by signing up.** Any other admin (or staff) must register and be approved by the main admin. Registration + the approvals screen are the next steps; on approval call `issueTemporaryPassword(user, ctx)` from `modules/auth/service.ts`, which sets `INVITED`, stores an argon2 hash of a new temporary password (valid `TEMP_PASSWORD_DAYS`) and emails it.
- **Portal per role:** `ADMIN` signs in only at `/login/admin`, `STAFF` only at `/login/staff`. The wrong portal (with the right password) returns `WRONG_PORTAL` with a link to the right one.

### 9.3 Screens (apps/webapp) and routes
All screens share `components/auth/AuthShell.tsx`. Pages live in `app/(auth)/`.

| Design | Route | Notes |
|---|---|---|
| Choose Role | `/` | Admin card → `/login/admin`, Staff card → `/login/staff`, "Activate a new staff account" → `/activate`. "Parent? Get the app" → `PARENT_APP_URL` (falls back to `WEBSITE_URL`). Privacy Policy → `${WEBSITE_URL}/privacy` (**the website has no privacy page yet**). |
| Admin Login | `/login/admin` | Green shield tile. Secondary: "Sign in as staff instead". |
| Staff Login | `/login/staff` | Yellow cap tile. Secondary: "First time? Activate your account". |
| Activate Account (step 1/3) | `/activate` | Username (email) + temporary password → sets the ticket cookie → step 2. "Request new" → `/forgot-password?for=activation`. `?expired=1` shows a "timed out" notice. |
| Set password for activation (2/3) | `/activate/password` | Needs the ticket cookie, else back to `/activate?expired=1`. Greets by first name. On success → `/activate/done?portal=…` (3/3, "Your account is active"). |
| Forgot Password (1/3) | `/forgot-password` | `?portal=admin\|staff` sets where "Sign in" goes. `?for=activation` switches the copy to "Request new login details". Sent state: "Check your email" + "Send again" after 60 s. |
| Set New Password (2/3) | `/reset-password?token=…` | Token checked on the server before the form shows; invalid → "This link has expired". Page sends `Referrer-Policy: no-referrer`. On success → `/reset-password/done?portal=…` (3/3, "Password saved"). |
| 403 · No permission | `/denied` | "Back to my dashboard" → `/dashboard` (redirects by role). "Switch portal" signs out → `/`. |
| Session expired | `/session-expired?portal=…` | "Sign in again" → that portal's login. |
| (temporary) signed-in home | `/admin`, `/staff` | `components/portal/PortalHome.tsx`: name, role chip, sign out. **Replace with the real dashboards.** |

- **Design deviations, on purpose:**
  - The designs' "Preview error state" link and the "Preview state 403 / Session expired" toggle are designer previews, so they're not rendered. Real error states appear when they happen, and the two access states are separate routes.
  - Staff login lead reads "Sign in to mark attendance, post class updates and share homework." (the design repeated the admin line about approvals and fees, which staff can't do).
  - Activate headline is "Welcome to the / Dynamic Donalds team." (the design's stray "-" is dropped).
  - "ENG" is a static language label for now; the portal is English-only.
  - Set-password and temporary-password fields have no Show button (as designed); sign-in password has one.
- **Right panel (`AuthAside`) content** is per screen in `lib/aside-content.tsx`. The activity cards (e.g. "16 registrations waiting for review") are **illustrations, not live data**; nothing about the institute is shown before sign-in. The 403/expired panel reads the idle time from `SESSION_IDLE_MINUTES`.

### 9.4 Design structure and components (`apps/webapp/components/auth`)
- **Tokens** in `app/globals.css` `@theme`: the website's brand tokens plus portal surfaces: `canvas #e4e6df` (page), `shell #f1f2ed` (rounded frame), `field #e0e3db` (input border), `soft #e8eae4` / `soft-line #dadcd4` (secondary button), `role-admin #f3e9c1`, `role-staff #d1ddc6`, `danger #c2341f`. Font Outfit (`next/font`).
- **`AuthShell`:** canvas → shell (`rounded-[28px]`, `p-[22px]` at lg) → 2-column grid `minmax(0,1fr) / minmax(0,1.135fr)`, gap 23px (matches the 1372×892 frames). Left column = brand header (logo + "Dynamic Donalds" + per-screen label, top-right prompt + white button), content centred at `max-w-[376px]`, footer (© year, globe "ENG"). **Below `lg` the right panel is hidden.**
- **`AuthAside`:** white→green vertical gradient, headline (`clamp(1.9rem,2.55vw,2.15rem)`, content width 27rem so lines break like the designs; no `text-balance`), body, then three glass cards pinned to the bottom: two `ActivityCard`s (radio, title, detail, "Syncing…" pulsing yellow dot / "Done" green dot) and a skeleton card. Cards step in from the right (`mr-[17px]`, `mr-[54px]`) as designed.
- **`TileField`:** the isometric tile grid, pure CSS 3D. A 5×5 grid laid flat with `rotateX(57deg) rotateZ(45deg)` (no perspective, so it looks isometric); each tile has a second layer at `translateZ(-13px)` that shows as thickness. The centre tile is the yellow logo tile, raised and bobbing (`.anim-bob`, along Z), with a yellow glow on the floor. A radial `mask-image` fades the field. Position: `right-[-178px] top-[-84px] size-[600px]`.
- **`ui.tsx`:** `IconTile` (green / yellow / white, 44px in a 4px `#e5e8e0` ring), `StepBars` (3 bars, `step` filled), `Heading`, `OrDivider`, `primaryButton` / `secondaryButton` classes (46px, `rounded-[10px]`), `ButtonLink`, `ButtonArrow`, `FormAlert` (error shakes once, `role="alert"`; info variant).
- **`fields.tsx`** (client): `Field`, `PasswordField` (inline "Show"/"Hide" button, `aria-pressed`), `SubmitButton` (spinner + pending label via `useFormStatus`), `PasswordChecklist` (rules from `@dd/shared`: dash = to do, green tick = met, red × = confirm mismatch), `passwordReady()`.
- **`SetPasswordForm`:** shared by reset and activation; Save stays disabled until the checklist is complete. **Step 3 is its own route** (`PasswordSaved` on `/activate/done` and `/reset-password/done`): a server action that changes cookies makes Next.js re-render the current page, so showing success in place would re-run the page's ticket/token check (now used) and bounce the user. "Sign in to … portal" opens the login page with a "Password saved" notice.
- **Forms:** server actions via `useActionState`; email is a controlled input so it survives an error (React resets uncontrolled fields after an action); a quick client-side Zod check runs before submit. Inputs are 16px on phones.
- **Checked** at 1372×892 against every design and at narrow widths (no horizontal scroll). Re-check 360/390/768/1024/1280/1440 when layouts change.

### 9.5 Sessions and route protection
- **Session = opaque random token** (256-bit). The backend stores only its SHA-256 (`Session.tokenHash`); the webapp keeps it in an **httpOnly, SameSite=Lax** cookie: `__Host-dd_session` in production (HTTPS-only, host-locked), `dd_session` in dev (`lib/cookies.ts`).
- **Timeouts** (backend env): idle `SESSION_IDLE_MINUTES` (30) and absolute `SESSION_MAX_HOURS` (12). **"Keep me signed in"**: idle 7 days (`SESSION_REMEMBER_IDLE_DAYS`), absolute 30 days, and the cookie persists across browser restarts (otherwise it's a browser-session cookie). `lastSeenAt` is refreshed at most once a minute.
- **Each check is on the server, every request:**
  1. `proxy.ts` (optimistic): `/admin*` or `/staff*` without the cookie → `/login/<portal>?next=…`. It also sets the per-request nonce CSP.
  2. Page guard `requireRole(role, portal, path)` in `lib/session.ts` calls `GET /v1/auth/me` (deduped per request with React `cache`): signed out → login, expired → `/session-expired`, wrong role → `/denied`. **Every new dashboard page must call it.**
  3. Backend: `authenticate` + `requireRole(...)` middleware (`src/middleware/auth.ts`) on every protected API route. Denials are logged as `ACCESS_DENIED`.
- `next` after login is only honoured for same-portal paths (`/admin…` for admin).
- Signing out (`logoutAction`) revokes the session in the DB and deletes the cookie.

### 9.6 Backend auth API (`/v1/auth`, Swagger at `/docs`)
| Endpoint | Purpose |
|---|---|
| `POST /login` `{email,password,portal,rememberMe}` | Returns `{token,user,session}`. |
| `POST /logout` (Bearer) | Revokes the session; 204 even if already ended. |
| `GET /me` (Bearer) | User + session; counts as activity. 401 `SESSION_EXPIRED` vs `UNAUTHENTICATED`. |
| `POST /activation/verify` `{email,temporaryPassword}` | Returns a 15-min single-use `ticket` (`ACTIVATION_TICKET_MINUTES`). |
| `POST /activation/ticket` `{ticket}` | Is the ticket still valid (step 2 page load)? |
| `POST /activation/complete` `{ticket,password}` | Sets the password, status → `ACTIVE`, emails a confirmation. |
| `POST /password/forgot` `{email}` | Always 202 `{sentTo:"l•••@email.com",expiresInMinutes}`. `ACTIVE` → reset link; `INVITED` → fresh temporary password; else nothing. Work runs **after** the response so timing reveals nothing. |
| `POST /password/reset/verify` `{token}` | Is the reset link valid? |
| `POST /password/reset` `{token,password}` | Saves, burns the link, **signs out every session**, emails a notice. |

- **Errors** are always `{ error: { code, message, ...details } }`; codes are in `AUTH_ERRORS` (`@dd/shared/auth`), and messages are safe to show.
- **Code layout:** `src/config/env.ts` (Zod-validated settings; production requires Brevo, internal keys and an https `PORTAL_URL`), `src/lib/*` (crypto, db, errors, logger, rate-limit), `src/middleware/*` (client context, auth/RBAC, validation, errors), `src/modules/auth/*` (routes, schemas, service, sessions, events, limits), `src/services/email/*` (Brevo transport + templates), `src/docs/openapi.ts`.

### 9.7 Security rules implemented
- **Passwords:** argon2id (19 MiB, t=2). Policy (shared with the UI): ≥8 chars, a letter and a number, ≤128, no leading/trailing spaces. A new password can't equal the temporary one or any of the last `PASSWORD_HISTORY_COUNT` (5) passwords.
- **Lockout:** `LOGIN_MAX_FAILURES` (5) consecutive wrong passwords lock the account for `LOGIN_LOCK_MINUTES` (15), even for the right password. "n attempts left" shows only when 2 or fewer remain.
- **No account enumeration:** unknown emails get the **same** responses ("Incorrect email or password", then attempts left, then locked, via an in-memory counter) and the same timing (a dummy argon2 verify). Account-specific messages (not activated, disabled, wrong portal) appear **only after the correct password**. "Forgot password" answers identically for every email.
- **Rate limits** (in-memory per process, `modules/auth/limits.ts`; move to Redis before running more than one backend instance): login 30/15 min per IP, activation 15/15 min per IP, forgot 5/15 min per IP plus 3/hour per email (extras silently dropped), token checks 30/15 min per IP.
- **Tokens:** reset links (`RESET_TOKEN_MINUTES`, 30) and activation tickets are random, single-use, stored hashed; issuing a new one voids older ones.
- **Sign-in log:** `AuthEvent` records every attempt and credential change (type, user, typed email, portal, reason, IP, user agent). It's permanent and never contains passwords or tokens. Application logs (pino) never contain personal data; request logs have path only (no query or body).
- **Headers:** helmet with `default-src 'none'`, `Cache-Control: no-store`, `X-Request-Id`; body limit 16 KB; strict Zod schemas (unknown keys rejected). The webapp has the same CSP and headers baseline as the website, plus `X-Robots-Tag: noindex` and `robots.txt` disallow-all.

### 9.8 Email (Brevo)
- `src/services/email/index.ts` posts to Brevo's transactional API (`https://api.brevo.com/v3/smtp/email`) with `BREVO_API_KEY`, sender `MAIL_FROM_EMAIL` / `MAIL_FROM_NAME`, and an optional `MAIL_REPLY_TO`. The sender must be verified in Brevo (Senders, domains & IPs); set up SPF/DKIM for the domain.
- **Development:** with no key (or `MAIL_LOG_ONLY=true`), emails are **printed to the backend console** instead of sent, so every flow can be tested locally. Production refuses to start without Brevo settings.
- **Templates** (`templates.ts`, table-based HTML + plain text, brand colours, all values escaped):
  - `accountInviteEmail`: username, temporary password, expiry, "Activate your account".
  - `passwordResetEmail`: single-use link, expiry.
  - `passwordChangedEmail`: sent after activation or reset, "if this wasn't you…".

### 9.9 Database (`packages/db`)
- Prisma 7 with the `prisma-client` generator → `src/generated/prisma` (gitignored; generated on `pnpm install`), driver adapter `@prisma/adapter-pg`. `createPrismaClient()` in `src/index.ts`. `prisma.config.ts` reads `DATABASE_URL` from `packages/db/.env` or `apps/backend/.env`.
- **Auth tables** (migration `20261116000000_auth`):
  - `User`: email unique and lower-case, name ≤100, role, status, `isMainAdmin`, password + temporary-password hashes, failed count, `lockedUntil`, `lastLoginAt`, `approvedBy`.
  - `Session`
  - `AuthToken`: purpose `PASSWORD_RESET` | `ACTIVATION`.
  - `PasswordHistory`
  - `AuthEvent`
- **Cleanup for the worker (TODO):** delete expired or used `AuthToken` rows and revoked or expired `Session` rows older than about 30 days. **Never delete `AuthEvent`.**
- Workspace packages (`@dd/shared`, `@dd/db`) are TypeScript source: the webapp uses `transpilePackages`, and the backend bundles them with tsup (an ESM bundle with a `createRequire` banner for bundled CommonJS such as `pg`).

### 9.10 Tests and local run
- `pnpm --filter @dd/backend test`:
  - **unit tests:** policy, argon2, tokens, limiter, enumeration parity, session expiry, validation.
  - **HTTP tests:** no DB needed.
  - **DB flow tests** (`tests/auth.flow.test.ts`): invite → activate → login → me → logout, portal rules, lockout parity, forgot → reset (history, single use, sessions revoked), idle expiry, "Request new". They run only with `TEST_DATABASE_URL` set to a throwaway, migrated database, and they wipe its tables.
- **Dev helper:** `pnpm --filter @dd/backend exec tsx --env-file=.env src/scripts/dev-invite.ts <email> STAFF "<Name>"` creates/re-invites a test account and prints its temporary password (refuses in production). It stands in for approvals until they're built.
- **Local run:**
  1. Start PostgreSQL: `pnpm db:up`, or point `DATABASE_URL` in `apps/backend/.env` at the local PostgreSQL 18.
  2. `pnpm db:migrate`
  3. `pnpm admin:bootstrap`: copy the temporary password from the terminal.
  4. `pnpm dev:backend` and `pnpm dev:webapp`.
  5. Open http://localhost:3100/activate.
- **Docker:** `docker/webapp.Dockerfile` (port 3100) and `docker/backend.Dockerfile` (port 4000; entrypoint args `migrate` and `bootstrap-admin`). **Neither image has been built yet** (the Docker daemon wasn't running), so build and test both before the first deploy. Caddy must forward `X-Forwarded-For` to the webapp.

### 9.11 Next steps for the portal
Done since: registration approvals, the admin dashboard and sidebar, and all feature modules (§10). Still open:
- a privacy policy page on the website;
- Redis-backed rate limits before scaling out;
- the token and session cleanup job in the worker.

### 9.12 Status update (Nov 2026): the portal is built
The admin & staff portal (`apps/webapp`) and its API (`apps/backend`) are built end to end from the approved designs. Sections 10.1–10.10 are the reference for working on it. Read them before changing portal code.

---

## 10. Admin & staff portal: build reference (built Nov 2026)

### 10.1 What is built, and what is not
- **Built:** every screen in the supplied designs (Mark attendance, Marks entry, New announcement, Notifications inbox, Payments to review, My profile, Question papers, Reports & exports, Review enrolment change, Review registration, RFID, Setting/Audit log, Staff detail & assignment, Staff, Student fee record, Student profile, Students, Website content, Assignments, Attendance, Class updates, Homework & feedback, Marks entry, My students, Question Paper, Staff Dashboard, Class notices). Also built with no design supplied: admin dashboard, courses, competitions, settings, the staff student page.
- **Real data:** nothing is hard-coded. The dev seed (§10.9) is sample data only. **The real student and staff lists come from the client later**; do not invent real people.
- **Not built here:** the parent/student mobile API endpoints beyond registration intake and signed file links (parent sign-in is a separate piece, see §10.10); the `apps/worker` process (jobs run in the backend, §10.6); Redis; push (FCM) delivery; Docker images for the new code are untested.

### 10.2 Routes
Admin (`/admin/*`, guard `requireAdmin` on every page, sidebar from `components/portal/nav.ts`):

| Route | Design / purpose |
|---|---|
| `/admin` | Dashboard (today at a glance, needs-attention list, fee collection, recent audit) |
| `/admin/approvals` | Tabs: student regs, staff regs, enrolment changes, leave (`?tab=`, `?status=pending\|decided`) |
| `/admin/approvals/registrations/[id]` | Review registration (REG-…), prev/next |
| `/admin/approvals/enrolment/[id]` | Review enrolment change (ENR-…) |
| `/admin/leave` | Redirects to `/admin/approvals?tab=leave` |
| `/admin/students` | Students list (search, grade, course, mode, status, export) |
| `/admin/students/[id]` | Student profile: Overview (edit), Courses, Fees, Attendance, Homework, Marks |
| `/admin/staff`, `/admin/staff/[id]` | Staff list; detail with teaching assignment, timetable, reset password, disable |
| `/admin/courses`, `/admin/competitions` | Course and competition management |
| `/admin/attendance` | Mark attendance (grade / course / date / session) |
| `/admin/homework`, `/admin/class-updates`, `/admin/marks`, `/admin/question-papers`, `/admin/assignments` | Teaching screens, admin scope |
| `/admin/fees`, `/admin/fees/[studentId]` | Monthly fee list; fee record (charges, override, one-time, payments, status, reminders) |
| `/admin/payments` | Payments to review (verify & mark paid / reject) |
| `/admin/reports` | Tabs: attendance, homework, pending dues, fee collection (CSV / Excel) |
| `/admin/announcements`, `/admin/announcements/new` | Announcements list; composer (audiences, filters, schedule, preview) |
| `/admin/notifications` | Inbox |
| `/admin/rfid` | RFID overview, live taps, readers, unknown cards, card coverage |
| `/admin/website` | Website content: gallery (drag order, first 8 on homepage), achievements, testimonials, enquiries (`?tab=`) |
| `/admin/audit` | Audit log (read-only, filters, CSV) |
| `/admin/settings` | Institute settings (attendance times, RFID rules, thresholds, payment details, reminders) |
| `/admin/profile` | My profile: Profile, Security, Notifications (`?tab=`) |

Staff (`/staff/*`, guard `requireStaff`; sidebar from `nav.ts`): `/staff` dashboard, `/staff/students` (+ `[id]` read-only), `/staff/attendance`, `/staff/class-updates`, `/staff/homework`, `/staff/marks`, `/staff/assignments`, `/staff/question-papers`, `/staff/notices` (+ `/new`), `/staff/notifications`, `/staff/profile`. Staff never see admin-only pages; the backend returns 403 and the page redirects to `/denied`.

Other: `/api/files/[id]` (access-checked file stream), `/api/export?src=…` (allow-listed export proxy). Login and activation routes are §9.

### 10.3 Backend API (`/v1`, Swagger at `/docs`)
All routers check the session and role on the server. Admin-only unless noted. Errors are `{ error: { code, message, fields? } }`.

| Module (`src/modules/…`) | Endpoints |
|---|---|
| `meta` | `GET /meta` (courses, competitions, the actor's classes, settings), `GET /meta/counts` (sidebar badges), `GET /meta/search?q=` (⌘K), `GET /meta/class-students` |
| `dashboard` | `GET /dashboard/admin`, `GET /dashboard/staff` |
| `approvals` | `GET /approvals?tab&status`, registrations `GET/POST …/:id/approve\|request-info\|reject`, `POST /approvals/registrations` (admin enters one), enrolment `…/enrolment/:id/approve\|reject`, leave `…/leave/:id/approve\|reject`. `POST /v1/public/registrations` (mobile intake, rate limited, no session). `/v1/leave/mine` (staff own leave) |
| `students` | `GET /students` (+ `/export`), `GET /students/mine` (staff), `GET /students/:id` (+ `/attendance`, `/homework`, `/marks`), `PATCH /students/:id`, `POST/DELETE …/enrolments` |
| `staff` | `GET /staff` (+ `/export`), `GET /staff/:id`, `POST /staff`, `PATCH /staff/:id`, `PUT …/assignment`, `PUT …/timetable`, `POST …/reset-password`, `POST …/status` |
| `courses` | `GET/POST /courses`, `PATCH /courses/:id`, `POST …/archive`; `/competitions` same shape, plus `GET …/:id/registrations` |
| `attendance` | `GET /attendance/sheet`, `PUT /attendance/sheet` (saves changes; corrections audited; parents notified on Absent), `GET /attendance/today` |
| `homework` | `GET/POST /homework`, `GET/DELETE /homework/:id`, `POST /homework/submissions/:id/review`, `GET /homework/report/summary` (+ `/export`); `/class-updates` `GET/POST/DELETE` |
| `assignments` | `GET/POST /assignments`, `DELETE /assignments/:id` (link stops working) |
| `papers` (`/question-papers`) | `GET`, `POST` (upload → awaiting), `POST …/:id/activate`, `…/deactivate`, `DELETE /:id` |
| `marks` (`/tests`) | `GET /tests`, `POST /tests`, `GET /tests/:id`, `PUT /tests/:id/marks`, `POST /tests/:id/visibility` (admin) |
| `fees` | `GET /fees` (+ `/export`), `GET /fees/students/:id?month=`, `POST …/payments`, `…/override`, `…/one-time`, `DELETE /fees/charges/:id`, `POST /fees/records/:id/status`, `POST …/students/:id/reminders`; `/payments` `GET`, `GET/:id`, `POST/:id/verify`, `…/reject` (+ `/export`) |
| `reports` | `GET /reports/attendance`, `/dues`, `/collection` (+ `/export` for each) |
| `announcements` | `GET /announcements/audiences`, `POST …/preview`, `GET/POST /announcements`, `POST …/:id/send`, `DELETE …/:id`; `/notifications` `GET`, `POST …/:id/read`, `POST …/read-all` |
| `rfid` | `GET /rfid/overview`, cards `GET/POST /rfid/cards`, `POST …/cards/:id/disable`, `POST /rfid/unknown/dismiss`, `POST /rfid/manual-tap`, devices `GET/POST`, `…/rotate-key`, `…/disable`, `GET /rfid/scans/export`. **Device endpoints** (no session, `X-Device-Key`): `POST /v1/rfid/device/scans` (batched taps), `POST /v1/rfid/device/heartbeat` |
| `content` | `GET /content/overview`; gallery `GET/POST /content/gallery`, `PATCH/DELETE …/:id`, `POST …/reorder`; achievements, testimonials (CRUD); enquiries `GET`, `POST …/:id/status`. Public: `GET /v1/public/content` (signed image links, cached 5 min). Enquiry intake: `POST /enquiries` or `/v1/enquiries` with `X-Internal-Key` (honeypot `company`) |
| `files` | `POST /files?purpose=` (raw body, `X-File-Name`), `GET /files/:id` (access-checked), `GET /files/:id/link` (signed, expiring), `GET /v1/public/files/:token` |
| `system` | `GET /audit` (+ `/export`), `GET/PUT /settings`, `GET/PATCH /profile`, `PUT /profile/preferences`, `POST /profile/password`, `GET /profile/sessions`, `POST /profile/sessions/revoke-others` |

Auth endpoints (`/v1/auth/*`) are in §9.6.

### 10.4 Data model (`packages/db/prisma/schema.prisma`)
Migrations: `20261116000000_auth` (§9.9), `20261117000000_portal` (all portal tables), `20261117010000_announcement_filters`. Money is whole rupees (`Int`). Calendar days are `@db.Date` read as IST. Readable codes come from `Counter` sequences: `DD-0921` (student), `DD-ST-007` (staff), `REG-0922`, `ENR-0091`.

- **People:** `User` (ADMIN / STAFF, with `designation`, `subject`, `staffCode`, `preferences`), `Student` (code, grade, roll, parent/father/mother, mobile 10 digits, session type, learning mode, ACTIVE/INACTIVE, `feeRemindersEnabled`), `Enrolment` (course link, `endedAt`, `feeOverride`), `Registration`, `EnrolmentChange`, `LeaveRequest`, `TeachingAssignment` (grade + course + subject, timetable `days`/`startTime`/`endTime`/`room`).
- **Academics:** `Course` (category, grades[], subjects[], monthlyFee, isMandatory), `Competition` / `SubCompetition` / `CompetitionRegistration`, `AttendanceRecord` (unique per student × date × session; source RFID / MANUAL / LEAVE; `late`), `ClassUpdate`, `Homework` / `HomeworkSubmission` (`hiddenAt`), `Assignment` / `AssignmentView`, `QuestionPaper` (AWAITING / ACTIVE / DELETED), `Test` / `Mark` (`resultsVisible`).
- **Money:** `FeeRecord` (per student per month, unique; `totalDue`, `paid`, `status`, `statusOverride`), `FeeCharge` (COURSE / OVERRIDE / ONE_TIME / COMPETITION), `FeeEvent` (history, kept), `Payment` (PARENT or ADMIN source; PENDING / VERIFIED / REJECTED), `FeeReminder` (one row per 10 / 20 / last reminder, so each is sent once).
- **Comms:** `Announcement` (kind, audiences[], filters, status DRAFT / SCHEDULED / SENT), `Notification` (USER inbox or PARENT for the app).
- **RFID:** `RfidDevice` (key stored as SHA-256), `RfidCard` (uid `04:A3:7F:12`, ACTIVE / DISABLED / REPLACED), `RfidScan` (every tap, incl. UNKNOWN / REPEAT / DISABLED_CARD; `resolvedAt`).
- **Website:** `GalleryItem` (sortOrder; first 8 `onHomepage`), `Achievement`, `Testimonial`, `Enquiry`.
- **Platform:** `StoredFile` (purpose, sniffed mime, storageKey), `AuditLog` (read-only; area, action, summary, from/to labels, before/after JSON, IP, UA), `Setting` (key/JSON), `Counter`, `JobRun` (job idempotency).

### 10.5 Business rules implemented (scope §5–6 and the designs)
- **Grades:** Pre-KG, LKG, UKG, Grade 1–12. Course eligibility by category (`gradesAllowedFor`): Phonics Pre-KG–2; tuition / olympiad / spell bee Pre-KG–8; subjects Grade 9–12.
- **Mandatory course:** Maths & Science is included and cannot be removed for Grades 9–10.
- **Sessions:** Grade 8 and below = one "Day" entry; Grade 9+ = Morning and Evening.
- **Learning mode:** One-on-one forces Online (`effectiveSessionType`) and locks the session control.
- **Inactive** only when the student has no active enrolments (API returns 409 with the field message).
- **Deregistration window:** days 1–10 of the month only. A request outside the window can be rejected, not approved.
- **Fees:** an active student gets a record per month (`ensureMonth`). Status = PAID / PARTIAL / UNPAID from paid vs total, unless a manual status is set. One-time charges and overrides recalculate the record. Verified payments only count.
- **Reminders:** 10th (all with a balance), 20th and last day (if still unpaid), at 10:00 IST. Exempt students are skipped. Each reminder shows the correct balance.
- **Attendance:** RFID tap → Present (Late after the session cut-off). Repeats within the dedupe window are ignored. Approved leave pre-fills Leave. Changing a saved mark is a correction, written to the audit log. Parents are notified on Absent.
- **Teacher scope:** a teacher sees only students in the grade × course of their assignments (`services/scope.ts`); admin sees all. Staff can post notices only to their own classes.
- **Homework:** given to a class; parents notified; feedback notifies the parent; completed homework is hidden after 1 month (daily job).
- **Assignments:** Grades 9–12 only. Deleting one kills its link (`/api/files/:id` re-checks the owner).
- **Question papers:** hidden until admin activates; admin is alerted on each upload; deleted papers' links return 404.
- **Marks:** visible to parents only after admin publishes; corrections keep old and new values in the audit log; max = the test's `maxMarks`.
- **Announcements:** no filter = all active parents. Filters (course, session type, learning mode) narrow them. Scheduled sends run from the job loop, claimed once.
- **Registrations:** approval creates the student (Active, enrolments, monthly fee record) or the staff account (INVITED, temporary password emailed). Duplicate check by name + mobile.
- **Uploads:** the real type is read from the file's first bytes (not the client's type). Size limits per purpose (photo 2 MB, attachments 5 MB, documents 10 MB).
- **Audit:** every admin action, fee change, marks update and attendance correction writes an `AuditLog` row with the actor's IP and browser.

### 10.6 Background jobs (`src/jobs/index.ts`)
Run inside the backend every minute (`JOBS_ENABLED`, default on). Each daily job runs once per day through a `JobRun` key, so restarts and several instances never double-send. Jobs: scheduled announcements, fee reminders (10th / 20th / last day, 10:00), absentee alert after each session, attendance-not-marked reminder at the deadline (teacher and admin), homework "not completed" report (20:00), daily cleanup (hide old completed homework, expired tokens and sessions), RFID reader offline alert. Move to `apps/worker` with Redis when scaling out.

### 10.7 Architecture patterns (follow these for any new portal feature)
- **BFF:** pages are server components. They call the backend with `api(path, portal)` (`lib/api.ts`), which redirects on session or role errors. Mutations are server actions in `lib/actions.ts` (`call(method, path, body)`), which call `refresh()` on success. The browser never calls the API directly.
- **Guards:** every page starts with `requireAdmin(path)` or `requireStaff(path)` (`lib/portal.ts`). The layouts (`app/(portal)/admin|staff/layout.tsx`) add the shell. The backend is still the real boundary: `adminOnly` / `portalUser` middleware on every router, plus `assertClassAccess` / `assertStudentAccess` in services.
- **Validation:** Zod schemas, `.strict()` on every body, one shared source for rules in `packages/shared` (`domain.ts`: names, mobile, grades, labels, formatINR, IST helpers). The UI imports the same functions, so both sides agree.
- **Lists:** URL-driven filters and pages (`?q=&grade=&page=`), using `FilterSelect` / `SearchBox` / `ParamSegmented` / `Pager`. Server components fetch. Client islands only for interaction.
- **Writes:** `useAction()` runs an action with a pending state, a toast, and inline field errors (`onError → fields`). Session expiry routes to "Session expired".
- **Audit and notify:** `audit(req, { area, action, summary, fromLabel, toLabel, before, after })` and `notifyParents / notifyUsers / notifyAdmins` from `services/`. Both swallow their own errors so a failed notification never undoes an action.
- **Exports:** `sendTable()` writes CSV (BOM, formula-safe) or XLSX (`lib/xlsx.ts`, dependency-free). The `/api/export` proxy allows only listed export paths.
- **Files:** `saveUpload` (magic-byte check, size cap, random storage key), `/api/files/:id` streams with `nosniff` and a sandboxed CSP.

### 10.8 Components and design system
Tokens are in `app/globals.css` `@theme`: the website's brand colours, plus `canvas` (page), `shell`, `frame` (card surround), `field` (input border), `soft` (pill/secondary bg), `line` / `line-2`, `ok-tint` (green chip), `sun-tint` (yellow chip), `sun-soft` (notice), `danger-tint` / `danger-ink`, `info-tint` / `info-ink`, `cream`, `absent`. Font: Outfit.

**Visual rules (match the designs):**
- Cards: white, `rounded-[18px]`, `border-line`, `p-4 sm:p-5`. Headings in `text-[15.5px] font-normal`.
- Primary button: dark ink pill (`btn.dark`), secondary: white outline pill (`btn.white`), `btn.sun` for the one highlighted action on dark panels, `btn.danger` for reject.
- Highlight colour: sun yellow for counts, "attention", and the selected state in decision panels. Brand green = good / paid / present.
- Stat tiles (`StatCard`): white by default; `tone="green" | "sun" | "ink"` for the highlighted one. Icon tile via `iconClass`.
- Pills (`Pill tone=`): green, sun, red, blue, grey, ink, sage, cream.
- Dark decision panels (`bg-ink`) hold the primary actions beside a review (registration, enrolment, payments).

**Shared components:**
- `components/ui/kit.tsx` (server-safe): `cx`, `btn.*`, `PageHeader`, `Card`, `StatCard` / `StatGrid`, `Pill`, `Badge`, `Avatar`, `Person`, `Table` / `th` / `td`, `Empty`, `Notice`, `LinkTabs`, `PillTabs`, `Pager`, `Bar`, `inputBase` / `inputCls` / `textareaCls`, `labelCls`.
- `components/ui/client.tsx`: `ToastProvider`, `useAction`, `ActionButton` (with optional confirm dialog), `Dialog`, `useParamSetter`, `FilterSelect`, `SelectBox`, `SearchBox`, `Segmented`, `ParamSegmented`, `Toggle`, `Chip`, `Field`, `CopyButton`.
- `components/ui/DateFilter.tsx`, `components/ui/MonthFilter.tsx` (URL-bound date / month inputs), `components/ui/shared-state.ts`.
- `components/portal/`: `Shell.tsx` (header + sidebar frame), `ShellClient.tsx` (sidebar groups, user card, mobile drawer, ⌘K palette), `nav.ts` (menu structure), `icons.tsx` (line icons, 24px / 1.7 stroke), `ProfileView.tsx` + `ProfileForms.tsx`.
- `components/teaching/`: `AttendanceSheet` (admin and staff variants), `ClassPicker` / `ClassTabs`, `MarksView` / `MarksClient`, `PapersView` / `PapersClient`, `AssignmentsView` / `AssignmentsClient`, `HomeworkView` / `HomeworkClient`, `ClassUpdatesView` / `ClassUpdatesClient`, `UploadField` (drag-drop, uploads on pick), `MyStudents`.
- `components/comms/`: `Composer` (audiences, template chips, filters, schedule, phone preview), `AnnouncementList`, `Inbox` / `InboxClient`.
- `components/content/`: `WebsiteView`, `WebsiteClient` (gallery drag-reorder, dialogs for achievements and testimonials, enquiry status).
- `lib/format.ts` (`gradeRange`), `lib/date-utils.ts` (client-safe YYYY-MM-DD maths), `lib/portal.ts` (`getMeta`, `classOptions`, `pickFromParams`).

**Gotchas already hit (don't repeat them):**
- **Tailwind class conflicts:** `btn.*` already has `inline-flex`. Adding `hidden` or `sm:hidden` next to it does not hide the element. Wrap it in a `<span className="hidden sm:block">` instead.
- **`btn.*` vs overrides:** a utility passed into `className` overrides the button's own colour and size only when it sits later in the CSS. Prefer a new `btn` variant over overriding. `inputCls` is full-width and fixed-height. Use `inputBase` with your own size.
- **ESLint `react-hooks`:** do not call `setState` synchronously in an effect, and do not call impure functions (`new Date()`) during render. Derive values during render (`shown = q ? results : []`) and set state only in async callbacks. Use `istDate()` from `@dd/shared/domain` for "today".
- **`noUncheckedIndexedAccess`:** `row.field` from `Record<string, …>` is `T | undefined`. Include `undefined` in cell types.
- **Next 16 proxies:** `searchParams` and `params` are Promises (`await`). Server actions have a 11 MB body limit (`next.config.ts`).
- **Dates:** the backend stores `@db.Date` at 00:00 UTC. Always convert with `dbDate()` / `ymd()` (`lib/dates.ts`). Never `new Date("YYYY-MM-DD")` in local time. "Today" is IST (`todayIst()`).
- **Route order:** `/v1/rfid/device` must mount before `/v1/rfid` (admin-only). `/students/mine` must mount before `/students/:id`.
- **Dev stale state:** a dev-server HMR error can show a "1 Issue" overlay or hydration warnings after big edits. Restart `pnpm dev` in `apps/webapp` and re-check. It isn't a code bug if a fresh server renders clean.

**Responsive:** widths 360 / 390 / 768 / 1024 / 1280 / 1440. The shell collapses the sidebar into a drawer below `lg`. Tables scroll inside their card (`overflow-x-auto`), so the page never scrolls sideways. Checked at 1372 (desktop) and 390 (phone) for the main screens. The other widths are still to be checked.

### 10.9 Running locally and sample data
1. `pnpm db:up` → `pnpm db:deploy` (applies all migrations).
2. `pnpm --filter @dd/backend seed:dev`: development-only sample data (refuses in production). Creates **dev-admin@example.test / DevPass123** (ADMIN) and **dev-staff@example.test / DevPass123** (Lakshmi Narayanan, teacher), plus about 20 sample students, courses, a week of attendance, RFID taps, fees, homework, marks, announcements, notifications and audit rows. Run it once; it skips if `Counter 'dev-seed'` exists.
3. `pnpm dev:backend` (port 4000) and `pnpm dev:webapp` (port 3100). Sign in at `http://localhost:3100/login/admin` or `/login/staff`.
4. RFID test: `POST http://localhost:4000/v1/rfid/device/scans` with header `X-Device-Key: dev-gate-1-key-0123456789` and body `{"scans":[{"cardUid":"04a37f99"}]}`.
5. Email in dev prints to the backend console (§9.8).

Verified in this build: all admin and staff routes return 200 with no error boundary; typecheck clean (backend, webapp, shared, db); webapp ESLint clean; backend tests 16 pass (the 6 DB-flow tests need `TEST_DATABASE_URL`); API flows exercised with curl: approvals, payments, attendance corrections, marks correction, announcements, paper upload → activate → delete (link returns 404), RFID tap and assignment, enquiry intake, XLSX export.

**Not yet verified:** full browser click-through of every form (only the screens above were screenshotted at 1372 and 390); the admin and staff notification inbox visuals; 360 / 768 / 1024 / 1280 / 1440 widths; Docker images for the new code.

### 10.10 Open items (client input or later work)
- **Real students and staff:** the client sends the lists later. Do not seed real people.
- **Grade 8 attendance:** the scope doesn't say whether it's one entry per day or two sessions. The code treats Grade 8 as one "Day" session. Confirm with the client.
- **Parent sign-in and app API:** the mobile app needs parent auth (the `PARENT` portal in `SessionPortal` is not yet added). Registration intake, signed file links and the public content feed exist; enrolment-change intake exists as `createEnrolmentChange()` in `approvals/routes.ts` but has no parent-facing route yet.
- **RFID hardware:** the Availo model, firmware and protocol must be verified before the device integration is final (scope §6.4). The `/v1/rfid/device/*` contract is a placeholder until then.
- **Worker and Redis:** jobs run in the backend process. Move them to `apps/worker` (with Redis locks) before running more than one instance. Rate limits are in memory (§9.7).
- **File storage:** uploads go to local disk (`UPLOAD_DIR`). Mount a volume in Docker, or move to object storage (then update `services/files.ts`).
- **Push and email:** in-app notifications exist. FCM push and Brevo emails for every event are partly wired (registration, reminders, reset/activation); the remaining templates should follow the `noticeEmail` helper.
- **Tamil:** the UI toggle and cached auto-translation of user content (scope §6.3) are not built.
- **Designs with no source:** admin dashboard, courses, competitions, settings, and the staff student page were built from the house style, not from designs. Show them to the client for sign-off.
- **Security:** keep `FILE_URL_SECRET` (≥32 chars) and `INTERNAL_API_KEYS` set in production; the backend refuses to start without them.
