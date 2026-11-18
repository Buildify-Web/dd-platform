"use server";

import { AUTH_ERRORS } from "@dd/shared/auth";
import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { backend, type Method } from "./backend";
import { SESSION_COOKIE } from "./cookies";

/**
 * Every portal mutation, as a server action (BFF). Each one checks its ids, forwards to the
 * backend with the session token, and refreshes the page data on success. The backend is
 * the security boundary: it re-checks the session, role, class scope and the full body
 * (strict Zod schemas) on every call. Results are shaped for the UI, never raw records.
 */
export type ActionError = { code: string; message: string; fields?: Record<string, string> };
export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: ActionError };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id = (v: unknown) => {
  if (typeof v !== "string" || !UUID.test(v)) throw new Error("Invalid id");
  return v;
};
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

async function call<T = unknown>(method: Method, path: string, body?: unknown, opts: { refresh?: boolean } = {}): Promise<ActionResult<T>> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { ok: false, error: { code: AUTH_ERRORS.UNAUTHENTICATED, message: "Please sign in again." } };
  const res = await backend<T>(path, { method, body, token });
  if (!res.ok) {
    return { ok: false, error: { code: res.error.code, message: res.error.message, fields: isObj(res.error.fields) ? (res.error.fields as Record<string, string>) : undefined } };
  }
  if (opts.refresh !== false) refresh();
  return { ok: true, data: res.data };
}

// ── Shared ──
export async function markNotificationRead(nid: string) {
  return call("POST", `/v1/notifications/${id(nid)}/read`);
}
export async function markAllNotificationsRead() {
  return call("POST", "/v1/notifications/read-all");
}
export async function searchPortal(q: string) {
  return call<{ students: { id: string; name: string; code: string; gradeLabel: string; status: string }[]; staff: { id: string; name: string; subject: string | null }[] }>(
    "GET",
    `/v1/meta/search?q=${encodeURIComponent(String(q).slice(0, 60))}`,
    undefined,
    { refresh: false },
  );
}
export async function classStudents(grade: string, courseId: string) {
  return call<{ students: { id: string; name: string; rollNo: number | null }[] }>(
    "GET",
    `/v1/meta/class-students?grade=${encodeURIComponent(grade)}&courseId=${id(courseId)}`,
    undefined,
    { refresh: false },
  );
}

const PURPOSES = ["AVATAR", "STUDENT_PHOTO", "HOMEWORK", "ASSIGNMENT", "QUESTION_PAPER", "PAYMENT_PROOF", "ANNOUNCEMENT", "GALLERY", "ACHIEVEMENT"] as const;

/** Uploads one file (FormData: file, purpose). Returns its id for the next action. */
export async function uploadFile(fd: FormData): Promise<ActionResult<{ id: string; name: string; size: number; mimeType: string }>> {
  const file = fd.get("file");
  const purpose = String(fd.get("purpose") ?? "");
  if (!(file instanceof File) || !file.size) return { ok: false, error: { code: "VALIDATION_ERROR", message: "Choose a file." } };
  if (!(PURPOSES as readonly string[]).includes(purpose)) return { ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid upload." } };
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: { code: "FILE_TOO_LARGE", message: "File is too large. Max 10 MB." } };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { ok: false, error: { code: AUTH_ERRORS.UNAUTHENTICATED, message: "Please sign in again." } };
  const res = await backend<{ id: string; name: string; size: number; mimeType: string }>(`/v1/files?purpose=${purpose}`, {
    method: "POST",
    token,
    raw: { data: await file.arrayBuffer(), type: file.type, name: file.name },
    timeoutMs: 60_000,
  });
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: { code: res.error.code, message: res.error.message } };
}

/** A signed, expiring public link to a file (for "Copy link"). */
export async function fileLink(fileId: string): Promise<ActionResult<{ url: string }>> {
  const r = await call<{ path: string }>("GET", `/v1/files/${id(fileId)}/link`, undefined, { refresh: false });
  if (!r.ok) return r;
  const base = (process.env.PUBLIC_API_URL || process.env.BACKEND_API_URL || "http://localhost:4000").replace(/\/$/, "");
  return { ok: true, data: { url: `${base}${r.data.path}` } };
}

// ── Account ──
export async function updateProfile(body: Record<string, unknown>) {
  return call("PATCH", "/v1/profile", body);
}
export async function changePassword(body: { currentPassword: string; newPassword: string }) {
  return call("POST", "/v1/profile/password", body);
}
export async function savePreferences(prefs: Record<string, boolean>) {
  return call("PUT", "/v1/profile/preferences", prefs);
}
export async function revokeOtherSessions() {
  return call("POST", "/v1/profile/sessions/revoke-others");
}
export async function requestLeave(body: { fromDate: string; toDate: string; reason: string }) {
  return call("POST", "/v1/leave/mine", body);
}

// ── Approvals ──
export async function approveRegistration(rid: string, data: Record<string, unknown>, photoFileId?: string) {
  return call<{ studentId?: string; staffId?: string }>("POST", `/v1/approvals/registrations/${id(rid)}/approve`, { data, ...(photoFileId ? { photoFileId: id(photoFileId) } : {}) });
}
export async function requestRegistrationInfo(rid: string, note: string) {
  return call("POST", `/v1/approvals/registrations/${id(rid)}/request-info`, { note });
}
/** Teacher who handles a student for one course. Pass staffId null to clear it. */
export async function allocateStudent(courseId: string, studentId: string, staffId: string | null) {
  return call<{ allocation: { staffId: string; staffName: string } | null }>("PUT", `/v1/courses/${id(courseId)}/allocations`, { studentId: id(studentId), staffId: staffId ? id(staffId) : null });
}
export async function rejectRegistration(rid: string, note: string) {
  return call("POST", `/v1/approvals/registrations/${id(rid)}/reject`, note ? { note } : {});
}
export async function createRegistration(body: { type: "STUDENT" | "STAFF"; data: Record<string, unknown> }) {
  return call<{ id: string; code: string }>("POST", "/v1/approvals/registrations", body);
}
export async function decideEnrolmentChange(cid: string, approve: boolean, note: string) {
  return call("POST", `/v1/approvals/enrolment/${id(cid)}/${approve ? "approve" : "reject"}`, note ? { note } : {});
}
export async function decideLeave(lid: string, approve: boolean, note = "") {
  return call("POST", `/v1/approvals/leave/${id(lid)}/${approve ? "approve" : "reject"}`, note ? { note } : {});
}

// ── Students ──
export async function updateStudent(sid: string, body: Record<string, unknown>) {
  return call("PATCH", `/v1/students/${id(sid)}`, body);
}
export async function deleteStudent(sid: string) {
  return call("DELETE", `/v1/students/${id(sid)}`);
}
export async function addEnrolment(sid: string, courseId: string) {
  return call("POST", `/v1/students/${id(sid)}/enrolments`, { courseId: id(courseId) });
}
export async function removeEnrolment(sid: string, enrolmentId: string) {
  return call("DELETE", `/v1/students/${id(sid)}/enrolments/${id(enrolmentId)}`);
}

// ── Staff ──
/** Grade by grade: for each grade the courses taught (subjects [] = the whole course). */
export async function saveAssignment(sid: string, body: { selection: { grade: string; courseId: string; subjects: string[] }[] }) {
  return call("PUT", `/v1/staff/${id(sid)}/assignment`, body);
}
/** Teacher: propose the courses they teach. The admin approves before it takes effect. */
export async function submitTeachingRequest(selection: { grade: string; courseId: string; subjects: string[] }[]) {
  return call("PUT", "/v1/me/teaching/request", { selection });
}
export async function cancelTeachingRequest() {
  return call("DELETE", "/v1/me/teaching/request");
}
/** Admin: approve or reject a teacher's proposed change. A rejection needs a note for the teacher. */
export async function decideTeachingChange(rid: string, approve: boolean, note = "") {
  return call("POST", `/v1/approvals/teaching/${id(rid)}/${approve ? "approve" : "reject"}`, approve ? {} : { note });
}
export async function saveTimetable(sid: string, rows: { key: string; days: number[]; startTime: string; endTime: string; room: string }[]) {
  return call("PUT", `/v1/staff/${id(sid)}/timetable`, { rows });
}
export async function resetStaffPassword(sid: string) {
  return call<{ sentTo: string }>("POST", `/v1/staff/${id(sid)}/reset-password`);
}
export async function setStaffStatus(sid: string, status: "ACTIVE" | "DISABLED") {
  return call("POST", `/v1/staff/${id(sid)}/status`, { status });
}
export async function deleteStaff(sid: string) {
  return call("DELETE", `/v1/staff/${id(sid)}`);
}
export async function createStaff(body: Record<string, unknown>) {
  return call<{ id: string }>("POST", "/v1/staff", body);
}
export async function updateStaff(sid: string, body: Record<string, unknown>) {
  return call("PATCH", `/v1/staff/${id(sid)}`, body);
}

// ── Courses & competitions ──
export async function saveCourse(cid: string | null, body: Record<string, unknown>) {
  return cid ? call("PATCH", `/v1/courses/${id(cid)}`, body) : call("POST", "/v1/courses", body);
}
export async function archiveCourse(cid: string, archived: boolean) {
  return call("POST", `/v1/courses/${id(cid)}/archive`, { archived });
}
export async function saveCompetition(cid: string | null, body: Record<string, unknown>) {
  return cid ? call("PATCH", `/v1/competitions/${id(cid)}`, body) : call<{ notified: number }>("POST", "/v1/competitions", body);
}
export async function archiveCompetition(cid: string, archived: boolean) {
  return call("POST", `/v1/competitions/${id(cid)}/archive`, { archived });
}

// ── Teaching ──
export async function saveAttendance(body: { date: string; grade: string; courseId?: string; session: string; entries: { studentId: string; status: string }[] }) {
  return call<{ saved: number; corrections: number }>("PUT", "/v1/attendance/sheet", body);
}
export async function createHomework(body: Record<string, unknown>) {
  return call<{ id: string }>("POST", "/v1/homework", body);
}
export async function deleteHomework(hid: string) {
  return call("DELETE", `/v1/homework/${id(hid)}`);
}
export async function reviewSubmission(subId: string, status: "CHECKED" | "REDO", feedback: string) {
  return call("POST", `/v1/homework/submissions/${id(subId)}/review`, { status, feedback });
}
export async function postClassUpdate(body: Record<string, unknown>) {
  return call<{ notified: number }>("POST", "/v1/class-updates", body);
}
export async function deleteClassUpdate(uid: string) {
  return call("DELETE", `/v1/class-updates/${id(uid)}`);
}
export async function createAssignment(body: Record<string, unknown>) {
  return call("POST", "/v1/assignments", body);
}
export async function deleteAssignment(aid: string) {
  return call("DELETE", `/v1/assignments/${id(aid)}`);
}
export async function uploadPaper(body: Record<string, unknown>) {
  return call("POST", "/v1/question-papers", body);
}
export async function activatePaper(pid: string) {
  return call("POST", `/v1/question-papers/${id(pid)}/activate`);
}
export async function deactivatePaper(pid: string) {
  return call("POST", `/v1/question-papers/${id(pid)}/deactivate`);
}
export async function deletePaper(pid: string) {
  return call("DELETE", `/v1/question-papers/${id(pid)}`);
}
export async function createTest(body: Record<string, unknown>) {
  return call<{ id: string }>("POST", "/v1/tests", body);
}
export async function saveMarks(testId: string, entries: { studentId: string; score: number | null }[]) {
  return call<{ saved: number }>("PUT", `/v1/tests/${id(testId)}/marks`, { entries });
}
export async function setResultsVisible(testId: string, visible: boolean) {
  return call("POST", `/v1/tests/${id(testId)}/visibility`, { visible });
}

// ── Fees & payments ──
export async function recordPayment(studentId: string, body: Record<string, unknown>) {
  return call<{ status: string; balance: number }>("POST", `/v1/fees/students/${id(studentId)}/payments`, body);
}
export async function overrideFee(studentId: string, body: Record<string, unknown>) {
  return call("POST", `/v1/fees/students/${id(studentId)}/override`, body);
}
export async function addOneTimeCharge(studentId: string, body: Record<string, unknown>) {
  return call("POST", `/v1/fees/students/${id(studentId)}/one-time`, body);
}
export async function removeCharge(chargeId: string) {
  return call("DELETE", `/v1/fees/charges/${id(chargeId)}`);
}
export async function setFeeStatus(recordId: string, status: "PAID" | "PARTIAL" | "UNPAID" | null) {
  return call("POST", `/v1/fees/records/${id(recordId)}/status`, { status });
}
export async function setFeeReminders(studentId: string, enabled: boolean) {
  return call("POST", `/v1/fees/students/${id(studentId)}/reminders`, { enabled });
}
export async function verifyPayment(pid: string, recordId: string | null, note: string) {
  return call<{ status: string; balance: number }>("POST", `/v1/payments/${id(pid)}/verify`, { ...(recordId ? { recordId: id(recordId) } : {}), note });
}
export async function rejectPayment(pid: string, note: string) {
  return call("POST", `/v1/payments/${id(pid)}/reject`, { note });
}

// ── Communication ──
export async function previewAudience(body: { audiences: string[]; filters: Record<string, string> }) {
  return call<{ parents: number; staff: number; label: string }>("POST", "/v1/announcements/preview", body, { refresh: false });
}
export async function createAnnouncement(body: Record<string, unknown>) {
  return call<{ id: string; status: string; recipients: number }>("POST", "/v1/announcements", body);
}
export async function sendAnnouncement(aid: string) {
  return call<{ recipients: number }>("POST", `/v1/announcements/${id(aid)}/send`);
}
export async function deleteAnnouncement(aid: string) {
  return call("DELETE", `/v1/announcements/${id(aid)}`);
}

// ── RFID ──
export async function assignCard(body: { uid: string; studentId?: string; staffId?: string }) {
  return call<{ uid: string; applied: number }>("POST", "/v1/rfid/cards", body);
}
export async function disableCard(cardId: string) {
  return call("POST", `/v1/rfid/cards/${id(cardId)}/disable`);
}
export async function dismissUnknownCard(uid: string) {
  return call("POST", "/v1/rfid/unknown/dismiss", { uid: String(uid).slice(0, 40) });
}
export async function createDevice(body: { name: string; location: string }) {
  return call<{ id: string; key: string }>("POST", "/v1/rfid/devices", body);
}
export async function rotateDeviceKey(did: string) {
  return call<{ key: string }>("POST", `/v1/rfid/devices/${id(did)}/rotate-key`);
}
export async function setDeviceDisabled(did: string, disabled: boolean) {
  return call("POST", `/v1/rfid/devices/${id(did)}/disable`, { disabled });
}

// ── Website content ──
export async function addGalleryPhotos(body: { title: string; album: string; takenOn?: string; fileIds: string[] }) {
  return call("POST", "/v1/content/gallery", body);
}
export async function updateGalleryItem(gid: string, body: Record<string, unknown>) {
  return call("PATCH", `/v1/content/gallery/${id(gid)}`, body);
}
export async function reorderGallery(ids: string[]) {
  return call("POST", "/v1/content/gallery/reorder", { ids: ids.map(id) });
}
export async function deleteGalleryItem(gid: string) {
  return call("DELETE", `/v1/content/gallery/${id(gid)}`);
}
export async function saveAchievement(aid: string | null, body: Record<string, unknown>) {
  return aid ? call("PATCH", `/v1/content/achievements/${id(aid)}`, body) : call("POST", "/v1/content/achievements", body);
}
export async function deleteAchievement(aid: string) {
  return call("DELETE", `/v1/content/achievements/${id(aid)}`);
}
export async function saveTestimonial(tid: string | null, body: Record<string, unknown>) {
  return tid ? call("PATCH", `/v1/content/testimonials/${id(tid)}`, body) : call("POST", "/v1/content/testimonials", body);
}
export async function deleteTestimonial(tid: string) {
  return call("DELETE", `/v1/content/testimonials/${id(tid)}`);
}
export async function setEnquiryStatus(eid: string, status: "NEW" | "READ" | "ARCHIVED") {
  return call("POST", `/v1/content/enquiries/${id(eid)}/status`, { status });
}
export async function deleteEnquiry(eid: string) {
  return call("DELETE", `/v1/content/enquiries/${id(eid)}`);
}

// ── Settings ──
export async function saveSettings(body: Record<string, unknown>) {
  return call("PUT", "/v1/settings", body);
}
