import { gradeLabel } from "@dd/shared/domain";
import { Router } from "express";
import { db } from "../../lib/db";
import { actor, portalUser } from "../../middleware/auth";
import { parseQuery } from "../../middleware/validate";
import { getSettings } from "../../services/settings";
import { zClass } from "../common";
import { allClasses, classStudentsWhere, staffClasses, visibleStudentsWhere } from "../../services/scope";

/**
 * /v1/meta: data every portal page needs for its selects and the sidebar.
 *  GET /         courses + the actor's classes + display settings
 *  GET /counts   sidebar badges
 *  GET /search   ⌘K search (students the actor can see; staff for admin)
 */
export const metaRouter = Router();

metaRouter.get("/", ...portalUser, async (req, res) => {
  const a = actor(req);
  const [courses, competitions, classes, s] = await Promise.all([
    db().course.findMany({
      where: { archivedAt: null },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: { id: true, name: true, category: true, grades: true, subjects: true, monthlyFee: true, isMandatory: true, published: true },
    }),
    db().competition.findMany({ where: { archivedAt: null }, orderBy: { date: "asc" }, select: { id: true, name: true, grades: true, date: true } }),
    a.isAdmin ? allClasses() : staffClasses(a.id),
    getSettings(),
  ]);
  res.json({
    courses,
    competitions,
    classes,
    settings: { instituteName: s.instituteName, attendanceDeadline: s.attendanceDeadline, attendanceThreshold: s.attendanceThreshold },
  });
});

metaRouter.get("/counts", ...portalUser, async (req, res) => {
  const a = actor(req);
  const unread = await db().notification.count({ where: { userId: a.id, readAt: null } });
  if (!a.isAdmin) {
    const classes = await db().teachingAssignment.findMany({ where: { staffId: a.id }, select: { grade: true, courseId: true } });
    const homeworkToCheck = classes.length
      ? await db().homeworkSubmission.count({
          where: { status: "SUBMITTED", homework: { OR: classes.map((c) => ({ grade: c.grade, courseId: c.courseId })) } },
        })
      : 0;
    res.json({ notifications: unread, homeworkToCheck });
    return;
  }
  const s = await getSettings();
  const offlineSince = new Date(Date.now() - s.rfidOfflineMinutes * 60_000);
  const [registrations, enrolmentChanges, leave, papers, payments, unknownCards, offlineDevices, enquiries] = await Promise.all([
    db().registration.count({ where: { status: { in: ["PENDING", "INFO_REQUESTED"] } } }),
    db().enrolmentChange.count({ where: { status: "PENDING" } }),
    db().leaveRequest.count({ where: { status: "PENDING" } }),
    db().questionPaper.count({ where: { status: "AWAITING" } }),
    db().payment.count({ where: { status: "PENDING" } }),
    db().rfidScan.groupBy({ by: ["cardUid"], where: { result: "UNKNOWN", resolvedAt: null } }).then((g) => g.length),
    db().rfidDevice.count({ where: { disabledAt: null, OR: [{ lastHeartbeatAt: null }, { lastHeartbeatAt: { lt: offlineSince } }] } }),
    db().enquiry.count({ where: { status: "NEW" } }),
  ]);
  res.json({
    notifications: unread,
    approvals: registrations + enrolmentChanges,
    registrations,
    enrolmentChanges,
    leave,
    papers,
    payments,
    rfid: unknownCards + offlineDevices,
    enquiries,
  });
});

metaRouter.get("/search", ...portalUser, async (req, res) => {
  const a = actor(req);
  const q = String(req.query.q ?? "").trim().slice(0, 60);
  if (q.length < 2) {
    res.json({ students: [], staff: [] });
    return;
  }
  const scope = await visibleStudentsWhere(a);
  const students = await db().student.findMany({
    where: {
      AND: [
        scope,
        { OR: [{ name: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }, { mobile: { contains: q } }, { parentName: { contains: q, mode: "insensitive" } }] },
      ],
    },
    take: 8,
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, grade: true, status: true },
  });
  const staff = a.isAdmin
    ? await db().user.findMany({
        where: { role: "STAFF", OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { mobile: { contains: q } }] },
        take: 5,
        select: { id: true, name: true, subject: true, status: true },
      })
    : [];
  res.json({
    students: students.map((s) => ({ ...s, gradeLabel: gradeLabel(s.grade) })),
    staff,
  });
});

/** Students of one class (used by "Student (optional)" pickers). */
metaRouter.get("/class-students", ...portalUser, async (req, res) => {
  const a = actor(req);
  const { grade, courseId } = parseQuery(zClass, req.query);
  const assigned = a.isAdmin ? true : !!(await db().teachingAssignment.findFirst({ where: { staffId: a.id, grade, courseId } }));
  if (!assigned) {
    res.json({ students: [] });
    return;
  }
  const students = await db().student.findMany({
    where: classStudentsWhere({ grade, courseId }),
    orderBy: [{ rollNo: "asc" }, { name: "asc" }],
    select: { id: true, name: true, rollNo: true },
  });
  res.json({ students });
});
