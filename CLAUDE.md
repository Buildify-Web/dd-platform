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
