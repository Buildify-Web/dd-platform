/**
 * DEVELOPMENT ONLY: fills a local database with sample data so every portal screen can be
 * tried. Refuses to run in production. Run once:
 *   pnpm --filter @dd/backend seed:dev
 * Sign in with dev-admin@example.test / dev-staff@example.test (password: DevPass123).
 * The real student and staff lists come from the client later (CLAUDE.md §10).
 */
import type { AttendanceStatus, Grade } from "@dd/db";
import { monthKey, sessionsForGrade } from "@dd/shared/domain";
import { deflateSync } from "node:zlib";
import { env } from "../config/env";
import { nextRegistrationCode, nextEnrolmentChangeCode, nextStudentCode, nextStaffCode } from "../lib/codes";
import { hashPassword, sha256 } from "../lib/crypto";
import { addDays, dbDate, istDayStart, istWeekday, todayIst } from "../lib/dates";
import { crc32 } from "../lib/xlsx";
import { db, disconnectDb } from "../lib/db";
import { ensureMonth, recalc } from "../services/fees";
import { saveUpload } from "../services/files";

const PASSWORD = "DevPass123";

/** A small solid-colour PNG (for sample gallery photos). */
function png(w: number, h: number, [r, g, b]: [number, number, number]) {
  const row = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) row.set([r, g, b], 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const pdf = (title: string) => Buffer.from(`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\n% ${title}\ntrailer<</Root 1 0 R>>\n%%EOF\n`);

const rand = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const rnd = rand(42);

async function main() {
  if (env().NODE_ENV === "production") throw new Error("seed-dev refuses to run in production.");
  if (await db().counter.findUnique({ where: { key: "dev-seed" } })) {
    console.log("Sample data is already loaded (Counter 'dev-seed'). Nothing to do.");
    return;
  }
  const hash = await hashPassword(PASSWORD);

  // ── Accounts ──
  const admin = await db().user.upsert({
    where: { email: "dev-admin@example.test" },
    create: { email: "dev-admin@example.test", name: "Meena Annamalai", role: "ADMIN", status: "ACTIVE", passwordHash: hash, passwordChangedAt: new Date(), designation: "Founder & Director", mobile: "9150485214" },
    update: {},
  });
  const lakshmi = await db().user.upsert({
    where: { email: "dev-staff@example.test" },
    create: { email: "dev-staff@example.test", name: "Lakshmi Narayanan", role: "STAFF", status: "ACTIVE", passwordHash: hash, passwordChangedAt: new Date(), designation: "Teacher", subject: "Maths", mobile: "9412345608", staffCode: await nextStaffCode() },
    update: {},
  });
  const joseph = await db().user.upsert({
    where: { email: "joseph.antony@example.test" },
    create: { email: "joseph.antony@example.test", name: "Joseph Antony", role: "STAFF", status: "ACTIVE", passwordHash: hash, designation: "Teacher", subject: "Physics", mobile: "9312345655", staffCode: await nextStaffCode() },
    update: {},
  });
  await db().user.upsert({
    where: { email: "priya.ramesh@example.test" },
    create: { email: "priya.ramesh@example.test", name: "Priya Ramesh", role: "STAFF", status: "INVITED", designation: "Teacher", subject: "English", mobile: "9876543210", staffCode: await nextStaffCode() },
    update: {},
  });

  // ── Courses ──
  const G = (...g: Grade[]) => g;
  const below8: Grade[] = ["PRE_KG", "LKG", "UKG", "GRADE_1", "GRADE_2", "GRADE_3", "GRADE_4", "GRADE_5", "GRADE_6", "GRADE_7", "GRADE_8"];
  const course = (name: string, category: "TUITION" | "PHONICS" | "OLYMPIAD" | "SPELL_BEE" | "SUBJECT", grades: Grade[], monthlyFee: number, extra: { subjects?: string[]; isMandatory?: boolean } = {}) =>
    db().course.create({ data: { name, category, grades, monthlyFee, subjects: extra.subjects ?? [], isMandatory: extra.isMandatory ?? false } });
  const tuition = await course("Regular tuition", "TUITION", below8, 1500);
  const phonics = await course("Phonics", "PHONICS", G("PRE_KG", "LKG", "UKG", "GRADE_1", "GRADE_2"), 900);
  const mathsOly = await course("Maths Olympiad", "OLYMPIAD", below8.slice(3), 750);
  await course("Science Olympiad", "OLYMPIAD", below8.slice(5), 750);
  const spell = await course("Spell Bee", "SPELL_BEE", below8.slice(3), 600);
  const ms = await course("Maths & Science", "SUBJECT", G("GRADE_9", "GRADE_10"), 2400, { subjects: ["Maths", "Science"], isMandatory: true });
  const tamil = await course("Tamil", "SUBJECT", G("GRADE_9", "GRADE_10"), 900);
  const english = await course("English", "SUBJECT", G("GRADE_9", "GRADE_10"), 900);
  const social = await course("Social", "SUBJECT", G("GRADE_9", "GRADE_10"), 900);
  const physics = await course("Physics", "SUBJECT", G("GRADE_11", "GRADE_12"), 1800);
  const maths12 = await course("Maths", "SUBJECT", G("GRADE_11", "GRADE_12"), 1800);
  for (const n of ["Chemistry", "Computer Science", "Commerce", "Accounts", "Applied Maths", "Economics"]) await course(n, "SUBJECT", G("GRADE_11", "GRADE_12"), 1800);

  // ── Students ──
  type S = [name: string, grade: Grade, parent: string, courses: string[], opts?: { online?: boolean; oneOnOne?: boolean; inactive?: boolean }];
  const list: S[] = [
    ["Madhuri Ishani", "GRADE_9", "Madhuri M.", [ms.id, tamil.id]],
    ["Nila S.", "GRADE_9", "Senthil K.", [ms.id, english.id]],
    ["Divya M.", "GRADE_9", "Murugan D.", [ms.id]],
    ["Gokul R.", "GRADE_9", "Ravi G.", [ms.id]],
    ["Keerthana V.", "GRADE_9", "Vijay K.", [ms.id, english.id]],
    ["Pranav S.", "GRADE_9", "Suresh P.", [ms.id]],
    ["Yamini K.", "GRADE_9", "Kumar Y.", [ms.id, tamil.id]],
    ["Arvind P.", "GRADE_9", "Prakash A.", [ms.id]],
    ["Divya Mohan", "GRADE_10", "Mohan K.", [ms.id, english.id, social.id], { online: true }],
    ["Fathima A.", "GRADE_10", "Abdul K.", [ms.id, social.id]],
    ["Sanjay K.", "GRADE_10", "Kannan S.", [ms.id]],
    ["Meera T.", "GRADE_10", "Thiru M.", [ms.id, english.id]],
    ["Shruthi Balaji", "GRADE_11", "Balaji R.", [physics.id, maths12.id]],
    ["Ravi Shankar", "GRADE_12", "Shankar T.", [], { inactive: true }],
    ["Aadhya Krishnan", "GRADE_4", "Krishnan R.", [tuition.id, spell.id]],
    ["Kavin Raj", "UKG", "Raj P.", [phonics.id], { online: true, oneOnOne: true }],
    ["Nithin Kumar", "GRADE_6", "Suresh Kumar", [tuition.id, mathsOly.id]],
    ["Riya S.", "GRADE_8", "Sundar R.", [tuition.id]],
    ["Arjun Vel", "GRADE_6", "Vel M.", [tuition.id]],
    ["Hari P.", "GRADE_3", "Prakash", [tuition.id]],
  ];
  const students: Awaited<ReturnType<ReturnType<typeof db>["student"]["create"]>>[] = [];
  let roll = 4;
  for (const [name, grade, parent, courses, o = {}] of list) {
    const s = await db().student.create({
      data: {
        code: await nextStudentCode(),
        name,
        grade,
        rollNo: roll,
        parentName: parent,
        fatherName: parent,
        motherName: null,
        mobile: `97${String(10000000 + Math.floor(rnd() * 89999999)).slice(0, 8)}`,
        email: `${name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/\.$/, "")}@example.test`,
        address: "Krishna Swamy St, Chromepet",
        sessionType: o.online || o.oneOnOne ? "ONLINE" : "OFFLINE",
        learningMode: o.oneOnOne ? "ONE_ON_ONE" : "GROUP",
        status: o.inactive ? "INACTIVE" : "ACTIVE",
        joinedAt: new Date(Date.now() - Math.floor(rnd() * 200) * 86_400_000),
        enrolments: { create: courses.map((courseId) => ({ courseId })) },
      },
    });
    roll += 1 + Math.floor(rnd() * 3);
    students.push(s);
  }
  const byName = (n: string) => students.find((s) => s.name === n)!;
  // Sibling concession override (as on the fee record design).
  await db().enrolment.updateMany({ where: { studentId: byName("Madhuri Ishani").id, courseId: tamil.id }, data: { feeOverride: 600, overrideReason: "sibling concession" } });

  // ── Teaching assignments + timetable (every weekday) ──
  const weekdays = [1, 2, 3, 4, 5, 6];
  await db().teachingAssignment.createMany({
    data: [
      { staffId: lakshmi.id, grade: "GRADE_10", courseId: ms.id, subject: "Maths", days: weekdays, startTime: "16:30", endTime: "17:30", room: "Room 1" },
      { staffId: lakshmi.id, grade: "GRADE_9", courseId: ms.id, subject: "Maths", days: weekdays, startTime: "17:30", endTime: "18:30", room: "Room 2" },
      { staffId: lakshmi.id, grade: "GRADE_9", courseId: ms.id, subject: "Science", days: weekdays, startTime: "18:30", endTime: "19:30", room: "Room 2" },
      { staffId: joseph.id, grade: "GRADE_11", courseId: physics.id, subject: "", days: weekdays, startTime: "17:00", endTime: "18:00", room: "Lab" },
      { staffId: joseph.id, grade: "GRADE_12", courseId: physics.id, subject: "", days: weekdays, startTime: "18:00", endTime: "19:00", room: "Lab" },
    ],
  });

  // ── Attendance: last 7 days ──
  const today = todayIst();
  for (let d = 7; d >= 1; d--) {
    const day = addDays(today, -d);
    for (const s of students.filter((x) => x.status === "ACTIVE")) {
      for (const session of sessionsForGrade(s.grade)) {
        const r = rnd();
        const status: AttendanceStatus = s.name === "Gokul R." ? (r < 0.5 ? "ABSENT" : "PRESENT") : r < 0.9 ? "PRESENT" : r < 0.97 ? "ABSENT" : "LEAVE";
        await db().attendanceRecord.create({ data: { studentId: s.id, date: dbDate(day), session, status, source: status === "PRESENT" && r < 0.7 ? "RFID" : "MANUAL", markedById: lakshmi.id, markedByName: "Lakshmi N.", rfidAt: status === "PRESENT" ? new Date(istDayStart(day).getTime() + (session === "MORNING" ? 8 : 17) * 3_600_000) : null } });
      }
    }
  }

  // ── RFID: readers, cards, today's taps ──
  const gate1 = await db().rfidDevice.create({ data: { name: "Gate 1 reader", location: "Main entrance", keyHash: sha256("dev-gate-1-key-0123456789"), lastHeartbeatAt: new Date(), lastTapAt: new Date(Date.now() - 60_000) } });
  await db().rfidDevice.create({ data: { name: "Gate 2 reader", location: "Side entrance", keyHash: sha256("dev-gate-2-key-0123456789"), lastHeartbeatAt: new Date(istDayStart(addDays(today, -1)).getTime() + (18 * 60 + 41) * 60_000), lastTapAt: new Date(istDayStart(addDays(today, -1)).getTime() + (18 * 60 + 41) * 60_000) } });
  const office = await db().rfidDevice.create({ data: { name: "Office desk reader", location: "Front office", keyHash: sha256("dev-office-key-0123456789"), lastHeartbeatAt: new Date(), lastTapAt: new Date(Date.now() - 4 * 60_000) } });
  const hex = () => Math.floor(rnd() * 256).toString(16).padStart(2, "0").toUpperCase();
  for (const s of students.filter((x) => x.status === "ACTIVE" && !["Madhuri Ishani", "Kavin Raj", "Meera T."].includes(x.name))) {
    const uid = `04:${hex()}:${hex()}:${hex()}`;
    await db().rfidCard.create({ data: { uid, studentId: s.id } });
    if (rnd() < 0.8) {
      const t = new Date(istDayStart(today).getTime() + (7 * 60 + 30 + Math.floor(rnd() * 90)) * 60_000);
      if (t < new Date()) await db().rfidScan.create({ data: { deviceId: rnd() < 0.85 ? gate1.id : office.id, cardUid: uid, scannedAt: t, result: "PRESENT", studentId: s.id, session: sessionsForGrade(s.grade)[0] } });
    }
  }
  await db().rfidCard.create({ data: { uid: "5C:11:90:AF", staffId: lakshmi.id } });
  for (const [uid, m] of [["04:A3:7F:12", 16 * 60 + 42], ["04:9C:11:E0", 16 * 60 + 38], ["04:1B:5D:77", 8 * 60 + 21]] as const) {
    const t = new Date(istDayStart(today).getTime() + m * 60_000);
    if (t < new Date()) await db().rfidScan.create({ data: { deviceId: gate1.id, cardUid: uid, scannedAt: t, result: "UNKNOWN" } });
  }

  // ── Fees ──
  const prev = addDays(`${monthKey()}-01`, -1).slice(0, 7);
  await ensureMonth(prev);
  await ensureMonth(monthKey());
  const records = await db().feeRecord.findMany({ include: { student: true } });
  for (const r of records) {
    const roll2 = rnd();
    const full = r.month === prev ? roll2 < 0.85 : roll2 < 0.45;
    const part = !full && roll2 < (r.month === prev ? 0.95 : 0.7);
    if (!full && !part) continue;
    const amount = full ? r.totalDue : Math.round(r.totalDue / 2 / 50) * 50;
    await db().payment.create({ data: { studentId: r.studentId, recordId: r.id, amount, method: rnd() < 0.5 ? "CASH" : "GPAY", reference: rnd() < 0.5 ? null : `${3900 + Math.floor(rnd() * 99)} ${1000 + Math.floor(rnd() * 8999)} ${1000 + Math.floor(rnd() * 8999)}`, paidOn: dbDate(r.month === prev ? `${prev}-08` : addDays(today, -Math.floor(rnd() * 5))), source: "ADMIN", status: "VERIFIED", reviewedAt: new Date(), reviewedById: admin.id } });
    await db().feeEvent.create({ data: { recordId: r.id, text: "Payment recorded", actor: "Admin", amount, kind: "payment" } });
    await recalc(r.id);
  }
  const pending: [string, number, "GPAY" | "BANK_TRANSFER", string, string][] = [
    ["Madhuri Ishani", 1800, "GPAY", "4021 7733 8831", "Madhuri"],
    ["Divya Mohan", 3300, "BANK_TRANSFER", "IMPS 6612904", "Mohan K."],
    ["Gokul R.", 2700, "GPAY", "3998 1102 4470", "Ramesh G."],
    ["Kavin Raj", 1500, "GPAY", "3990 5521 0098", "Priya Raj"],
    ["Nithin Kumar", 750, "BANK_TRANSFER", "NEFT N3091", "Suresh Kumar"],
    ["Hari P.", 750, "GPAY", "3971 2280 6615", "Prakash"],
  ];
  for (const [n, amount, method, reference, parent] of pending)
    await db().payment.create({ data: { studentId: byName(n).id, amount, method, reference, paidOn: dbDate(today), source: "PARENT", status: "PENDING", submittedByName: parent, submittedAt: new Date(Date.now() - Math.floor(rnd() * 3) * 86_400_000 - 3_600_000) } });

  // ── Approvals ──
  await db().registration.create({
    data: { code: await nextRegistrationCode(), type: "STUDENT", data: { studentName: "Ayesha Irfan", grade: "GRADE_9", fatherName: "Mohammed Irfan", motherName: "Salma I.", mobile: "97123456", email: "irfan.family@example.test", address: "", courseIds: [ms.id, tamil.id], learningMode: "GROUP", sessionType: "ONLINE" }, submittedAt: new Date(Date.now() - 86_400_000) },
  });
  await db().registration.create({
    data: { code: await nextRegistrationCode(), type: "STUDENT", data: { studentName: "Tharun Kumar", grade: "GRADE_5", fatherName: "Kumar S.", motherName: "Latha K.", mobile: "9845012345", email: "tharun.parent@example.test", address: "Hasthinapuram, Chennai", courseIds: [tuition.id, mathsOly.id], learningMode: "GROUP", sessionType: "OFFLINE" } },
  });
  await db().registration.create({
    data: { code: await nextRegistrationCode(), type: "STAFF", data: { name: "Kowsalya Devi", mobile: "9840011223", email: "kowsalya.devi@example.test", address: "Chromepet", subject: "English" } },
  });
  await db().enrolmentChange.create({
    data: { code: await nextEnrolmentChangeCode(), studentId: byName("Divya Mohan").id, addCourseIds: [tamil.id], removeCourseIds: [social.id], requestedAt: new Date(`${monthKey()}-03T10:00:00+05:30`) },
  });
  await db().leaveRequest.create({ data: { kind: "STUDENT", studentId: byName("Keerthana V.").id, fromDate: dbDate(today), toDate: dbDate(today), reason: "Family function", status: "APPROVED", reviewedById: admin.id, reviewedAt: new Date() } });
  await db().leaveRequest.create({ data: { kind: "STAFF", staffId: lakshmi.id, fromDate: dbDate(addDays(today, 5)), toDate: dbDate(addDays(today, 6)), reason: "Personal work" } });
  await db().leaveRequest.create({ data: { kind: "STUDENT", studentId: byName("Nila S.").id, fromDate: dbDate(addDays(today, 2)), toDate: dbDate(addDays(today, 2)), reason: "Medical appointment" } });

  // ── Homework, class updates, marks ──
  const g9 = await db().student.findMany({ where: { grade: "GRADE_9", status: "ACTIVE" } });
  const hw = [
    { title: "Ex 4.2 · Q1–10", given: -2, due: (5 - istWeekday() + 7) % 7 || 7 },
    { title: "Worksheet · Linear graphs", given: -4, due: 0 },
    { title: "Revision · Ch 1–3", given: 0, due: 7 },
  ];
  for (const [i, h] of hw.entries()) {
    const row = await db().homework.create({ data: { grade: "GRADE_9", courseId: ms.id, subject: "Maths", title: h.title, givenOn: dbDate(addDays(today, h.given)), dueOn: dbDate(addDays(today, h.due)), createdById: lakshmi.id } });
    for (const s of g9) {
      const r = rnd();
      if ((i === 0 && r < 0.75) || (i === 1 && r < 0.9) || (i === 2 && r < 0.12))
        await db().homeworkSubmission.create({ data: { homeworkId: row.id, studentId: s.id, text: "Answers attached", status: i === 1 ? "CHECKED" : r < 0.3 ? "CHECKED" : "SUBMITTED", checkedById: lakshmi.id, submittedAt: new Date(Date.now() - Math.floor(rnd() * 20) * 3_600_000) } });
    }
  }
  for (const [grade, subject, text, days] of [
    ["GRADE_10", "Maths", "Trigonometric ratios. Homework: Ex 8.1", -1],
    ["GRADE_9", "Maths", "Quadratic equations. Homework: Ex 4.2", -1],
    ["GRADE_9", "Science", "Light: reflection. No homework", -3],
  ] as const)
    await db().classUpdate.create({ data: { staffId: lakshmi.id, authorName: lakshmi.name, grade, courseId: ms.id, subject, text, date: dbDate(addDays(today, days)), createdAt: new Date(Date.now() + days * 86_400_000) } });

  const ut2 = await db().test.create({ data: { name: "Unit Test 2", grade: "GRADE_9", courseId: ms.id, subject: "Maths", maxMarks: 50, heldOn: dbDate(addDays(today, -30)), createdById: lakshmi.id, resultsVisible: true, createdAt: new Date(Date.now() - 30 * 86_400_000) } });
  const ut3 = await db().test.create({ data: { name: "Unit Test 3", grade: "GRADE_9", courseId: ms.id, subject: "Maths", maxMarks: 50, heldOn: dbDate(addDays(today, -1)), createdById: lakshmi.id } });
  for (const s of g9) {
    await db().mark.create({ data: { testId: ut2.id, studentId: s.id, score: 30 + Math.floor(rnd() * 18), updatedById: lakshmi.id, updatedByName: "Lakshmi N." } });
    if (s.name !== "Keerthana V.") await db().mark.create({ data: { testId: ut3.id, studentId: s.id, score: 34 + Math.floor(rnd() * 16), updatedById: lakshmi.id, updatedByName: "Lakshmi N." } });
  }

  // ── Files: question papers, assignments, gallery ──
  for (const [title, grade, subject, staff] of [
    ["Unit test 3", "GRADE_10", "Maths", lakshmi],
    ["Mid-term", "GRADE_9", "Science", lakshmi],
    ["Test 2", "GRADE_11", "Physics", joseph],
  ] as const) {
    const f = await saveUpload(pdf(title), "QUESTION_PAPER", `${subject}-${title}.pdf`, staff.id);
    await db().questionPaper.create({ data: { title, grade, courseId: grade === "GRADE_11" ? physics.id : ms.id, subject: grade === "GRADE_11" ? "" : subject, fileId: f.id, uploadedById: staff.id } });
  }
  for (const [title, grade, subject] of [
    ["Trigonometry worksheet", "GRADE_10", "Maths"],
    ["Quadratic equations practice", "GRADE_9", "Maths"],
    ["Light: reflection diagram", "GRADE_9", "Science"],
  ] as const) {
    const f = await saveUpload(subject === "Science" ? png(40, 30, [220, 232, 207]) : pdf(title), "ASSIGNMENT", `${title}.${subject === "Science" ? "png" : "pdf"}`, lakshmi.id);
    await db().assignment.create({ data: { title, grade, courseId: ms.id, subject, fileId: f.id, createdById: lakshmi.id } });
  }
  const colours: [number, number, number][] = [[220, 232, 207], [43, 112, 16], [246, 201, 14], [226, 228, 220]];
  const photos: [string, "EVENTS" | "COMPETITIONS" | "CLASSROOM" | "CAMPUS" | "ACHIEVEMENTS", number][] = [
    ["Science expo", "EVENTS", -45],
    ["Annual day 2026", "EVENTS", -24],
    ["Phonics class", "CLASSROOM", -50],
    ["Spell Bee winners", "COMPETITIONS", -30],
    ["Olympiad prep", "COMPETITIONS", -58],
    ["Independence day", "EVENTS", -94],
    ["Library corner", "CAMPUS", -108],
    ["Grade 10 toppers", "ACHIEVEMENTS", -180],
  ];
  for (const [i, [title, album, days]] of photos.entries()) {
    const f = await saveUpload(png(64, 48, colours[i % 4]!), "GALLERY", `${title}.png`, admin.id);
    await db().galleryItem.create({ data: { title, album, takenOn: dbDate(addDays(today, days)), fileId: f.id, sortOrder: i, onHomepage: i < 3 } });
  }
  await db().achievement.create({ data: { title: "Leaders of the Change award", studentName: "Meena Annamalai", detail: "Star Education Awards 2026", year: 2026 } });
  await db().testimonial.create({ data: { author: "Christy Sandra Fernando B", role: "Parent", quote: "Wonderful teachers who care about every child.", rating: 5 } });
  await db().enquiry.createMany({
    data: [
      { name: "Lavanya R", mobile: "9840123456", email: "lavanya@example.test", grade: "Grade 7", interests: ["Regular tuition"], message: "Do you have evening batches for Grade 7?", source: "website" },
      { name: "Karthik S", mobile: "9840654321", grade: "Grade 11", interests: ["Physics"], message: "Fees for Physics and Chemistry for Grade 11?", source: "website" },
    ],
  });

  // ── Competition, announcement, notifications, audit ──
  await db().competition.create({
    data: { name: "Science Olympiad · Level 1", date: dbDate(addDays(today, 18)), grades: below8.slice(5), registrationFee: 250, transportFee: 300, subCompetitions: { create: [{ name: "Written test", fee: 250 }, { name: "Model exhibition", fee: 150, sortOrder: 1 }] } },
  });
  await db().announcement.create({
    data: { kind: "ANNOUNCEMENT", title: "Diwali holidays · 10–12 Nov", message: "The centre will be closed 10–12 Nov for Diwali. Classes resume Thursday 13 Nov.", audiences: ["ALL_PARENTS", "ALL_STAFF"], audienceLabel: "All parents, All staff", recipientCount: 22, channels: ["PUSH", "IN_APP"], status: "SENT", sentAt: new Date(Date.now() - 2 * 86_400_000), createdById: admin.id, senderLabel: "Dynamic Donalds" },
  });
  const n = (userId: string, category: "APPROVALS" | "PAYMENTS" | "SYSTEM" | "ADMIN" | "CLASSES", title: string, body: string, actionLabel: string, href: string, hoursAgo: number, urgent = false, read = false) =>
    db().notification.create({ data: { recipientType: "USER", userId, category, title, body, actionLabel, href, urgent, readAt: read ? new Date() : null, createdAt: new Date(Date.now() - hoursAgo * 3_600_000) } });
  const reg = await db().registration.findFirst({ where: { type: "STUDENT" } });
  await n(admin.id, "APPROVALS", "New parent registration", "Mohammed Irfan registered with 1 student. Review details.", "Review", `/admin/approvals/registrations/${reg!.id}`, 1, true);
  await n(admin.id, "PAYMENTS", "GPay payment submitted", "₹1,800 for Madhuri Ishani · UTR 4021…8831", "Verify", "/admin/payments", 1.2, true);
  await n(admin.id, "APPROVALS", "Leave request", "Lakshmi Narayanan requested leave.", "Open", "/admin/leave", 2);
  await n(admin.id, "SYSTEM", "RFID device offline", "Gate 2 reader stopped sending scans at 6:41 PM.", "Check", "/admin/rfid", 20, false, true);
  await n(admin.id, "APPROVALS", "Course enrolment change", "Mohan K. asked to change courses for Divya Mohan.", "Review", "/admin/approvals?tab=enrolment", 26, false, true);
  await n(admin.id, "PAYMENTS", "Bank transfer submitted", "₹3,300 for Divya Mohan · IMPS 6612904", "Verify", "/admin/payments", 30, false, true);
  await n(lakshmi.id, "ADMIN", "Diwali holidays · 10–12 Nov", "Centre closed. Share homework before Saturday.", "Open", "/staff/notifications", 1);
  await n(lakshmi.id, "CLASSES", "New student in Grade 9 · Maths", "Madhuri Ishani was approved and assigned to your class.", "View", "/staff/students", 2);
  await n(lakshmi.id, "CLASSES", "Update due", "Grade 10 · Maths class update not posted yesterday.", "Post", "/staff/class-updates", 22, false, true);
  await db().auditLog.createMany({
    data: [
      { area: "FEES", action: "payment.verify", summary: "verified a GPay payment for Madhuri Ishani", actorId: admin.id, actorName: admin.name, actorRole: "Owner", fromLabel: "Unpaid", toLabel: "Paid partially · ₹1,750", ipAddress: "49.37.12.8", userAgent: "Mozilla/5.0 Chrome/140" },
      { area: "ATTENDANCE", action: "attendance.mark", summary: "marked attendance for Grade 9 · Morning", actorId: lakshmi.id, actorName: lakshmi.name, actorRole: "Staff", ipAddress: "49.37.12.9", userAgent: "Mozilla/5.0 Chrome/140" },
      { area: "MARKS", action: "marks.correct", summary: "corrected Unit Test 3 marks for Sanjay K.", actorId: admin.id, actorName: admin.name, actorRole: "Owner", fromLabel: "33 / 50", toLabel: "35 / 50", ipAddress: "49.37.12.8", userAgent: "Mozilla/5.0 Chrome/140", createdAt: new Date(Date.now() - 86_400_000) },
    ],
  });

  await db().counter.create({ data: { key: "dev-seed", value: 1 } });
  console.log(`\nSample data loaded.\n  Admin: dev-admin@example.test / ${PASSWORD}  →  http://localhost:3100/login/admin\n  Staff: dev-staff@example.test / ${PASSWORD}  →  http://localhost:3100/login/staff\n  RFID test key (Gate 1): dev-gate-1-key-0123456789\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
