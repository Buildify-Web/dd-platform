-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('PRE_KG', 'LKG', 'UKG', 'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GRADE_6', 'GRADE_7', 'GRADE_8', 'GRADE_9', 'GRADE_10', 'GRADE_11', 'GRADE_12');

-- CreateEnum
CREATE TYPE "CourseCategory" AS ENUM ('TUITION', 'PHONICS', 'OLYMPIAD', 'SPELL_BEE', 'SUBJECT', 'OTHER');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('OFFLINE', 'ONLINE');

-- CreateEnum
CREATE TYPE "LearningMode" AS ENUM ('GROUP', 'ONE_ON_ONE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'INFO_REQUESTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RegistrationType" AS ENUM ('STUDENT', 'STAFF');

-- CreateEnum
CREATE TYPE "LeaveFor" AS ENUM ('STUDENT', 'STAFF');

-- CreateEnum
CREATE TYPE "AttendanceSession" AS ENUM ('DAY', 'MORNING', 'EVENING');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LEAVE', 'NA');

-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('RFID', 'MANUAL', 'LEAVE');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'CHECKED', 'REDO');

-- CreateEnum
CREATE TYPE "PaperStatus" AS ENUM ('AWAITING', 'ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "FeeStatus" AS ENUM ('PAID', 'PARTIAL', 'UNPAID');

-- CreateEnum
CREATE TYPE "FeeChargeType" AS ENUM ('COURSE', 'OVERRIDE', 'ONE_TIME', 'COMPETITION');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'GPAY', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('PARENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "AnnouncementKind" AS ENUM ('ANNOUNCEMENT', 'CLASS_NOTICE');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('APPROVALS', 'PAYMENTS', 'SYSTEM', 'ADMIN', 'CLASSES', 'ATTENDANCE', 'HOMEWORK', 'MARKS', 'FEES', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('USER', 'PARENT');

-- CreateEnum
CREATE TYPE "RfidCardStatus" AS ENUM ('ACTIVE', 'DISABLED', 'REPLACED');

-- CreateEnum
CREATE TYPE "RfidScanResult" AS ENUM ('PRESENT', 'LATE', 'REPEAT', 'UNKNOWN', 'DISABLED_CARD', 'STAFF');

-- CreateEnum
CREATE TYPE "GalleryAlbum" AS ENUM ('EVENTS', 'COMPETITIONS', 'CLASSROOM', 'CAMPUS', 'ACHIEVEMENTS', 'CELEBRATIONS', 'TEAM');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'READ', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FilePurpose" AS ENUM ('AVATAR', 'STUDENT_PHOTO', 'HOMEWORK', 'ASSIGNMENT', 'QUESTION_PAPER', 'PAYMENT_PROOF', 'ANNOUNCEMENT', 'GALLERY', 'ACHIEVEMENT');

-- CreateEnum
CREATE TYPE "AuditArea" AS ENUM ('FEES', 'APPROVALS', 'ATTENDANCE', 'MARKS', 'COURSES', 'PAPERS', 'STAFF', 'STUDENTS', 'HOMEWORK', 'ANNOUNCEMENTS', 'RFID', 'CONTENT', 'SETTINGS', 'ACCOUNT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" VARCHAR(200),
ADD COLUMN     "avatarFileId" UUID,
ADD COLUMN     "designation" VARCHAR(100),
ADD COLUMN     "preferences" JSONB,
ADD COLUMN     "staffCode" VARCHAR(20),
ADD COLUMN     "subject" VARCHAR(60);

-- CreateTable
CREATE TABLE "Course" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" "CourseCategory" NOT NULL DEFAULT 'OTHER',
    "grades" "Grade"[],
    "subjects" TEXT[],
    "monthlyFee" INTEGER NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "date" DATE NOT NULL,
    "grades" "Grade"[],
    "registrationFee" INTEGER NOT NULL,
    "transportFee" INTEGER NOT NULL DEFAULT 0,
    "description" VARCHAR(500),
    "published" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubCompetition" (
    "id" UUID NOT NULL,
    "competitionId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "fee" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SubCompetition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionRegistration" (
    "id" UUID NOT NULL,
    "competitionId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "subCompetitionIds" UUID[],
    "transport" BOOLEAN NOT NULL DEFAULT false,
    "total" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitionRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "grade" "Grade" NOT NULL,
    "rollNo" INTEGER,
    "parentName" VARCHAR(100),
    "fatherName" VARCHAR(100),
    "motherName" VARCHAR(100),
    "mobile" VARCHAR(10) NOT NULL,
    "email" VARCHAR(254),
    "address" VARCHAR(200),
    "sessionType" "SessionType" NOT NULL DEFAULT 'OFFLINE',
    "learningMode" "LearningMode" NOT NULL DEFAULT 'GROUP',
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "photoFileId" UUID,
    "feeRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "registrationId" UUID,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrolment" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "feeOverride" INTEGER,
    "overrideReason" VARCHAR(120),

    CONSTRAINT "Enrolment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "type" "RegistrationType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "data" JSONB NOT NULL,
    "photoFileId" UUID,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" UUID,
    "decisionNote" VARCHAR(500),
    "staffUserId" UUID,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrolmentChange" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "studentId" UUID NOT NULL,
    "addCourseIds" UUID[],
    "removeCourseIds" UUID[],
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" VARCHAR(500),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" UUID,

    CONSTRAINT "EnrolmentChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingAssignment" (
    "id" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "grade" "Grade" NOT NULL,
    "courseId" UUID NOT NULL,
    "subject" VARCHAR(60) NOT NULL DEFAULT '',
    "days" INTEGER[],
    "startTime" VARCHAR(5),
    "endTime" VARCHAR(5),
    "room" VARCHAR(30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeachingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" UUID NOT NULL,
    "kind" "LeaveFor" NOT NULL,
    "studentId" UUID,
    "staffId" UUID,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "sessions" "AttendanceSession"[],
    "reason" VARCHAR(500) NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" UUID,
    "decisionNote" VARCHAR(500),

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "session" "AttendanceSession" NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "source" "AttendanceSource" NOT NULL,
    "rfidAt" TIMESTAMP(3),
    "late" BOOLEAN NOT NULL DEFAULT false,
    "markedById" UUID,
    "markedByName" VARCHAR(100),
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassUpdate" (
    "id" UUID NOT NULL,
    "staffId" UUID,
    "authorName" VARCHAR(100) NOT NULL,
    "grade" "Grade" NOT NULL,
    "courseId" UUID NOT NULL,
    "subject" VARCHAR(60) NOT NULL DEFAULT '',
    "studentId" UUID,
    "text" VARCHAR(500) NOT NULL,
    "homework" VARCHAR(500),
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Homework" (
    "id" UUID NOT NULL,
    "grade" "Grade" NOT NULL,
    "courseId" UUID NOT NULL,
    "subject" VARCHAR(60) NOT NULL DEFAULT '',
    "title" VARCHAR(120) NOT NULL,
    "details" VARCHAR(500),
    "givenOn" DATE NOT NULL,
    "dueOn" DATE NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Homework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkSubmission" (
    "id" UUID NOT NULL,
    "homeworkId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "text" VARCHAR(500),
    "imageFileId" UUID,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "feedback" VARCHAR(500),
    "checkedById" UUID,
    "checkedAt" TIMESTAMP(3),
    "hiddenAt" TIMESTAMP(3),

    CONSTRAINT "HomeworkSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "grade" "Grade" NOT NULL,
    "courseId" UUID NOT NULL,
    "subject" VARCHAR(60) NOT NULL DEFAULT '',
    "studentId" UUID,
    "fileId" UUID NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentView" (
    "assignmentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "firstOpenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentView_pkey" PRIMARY KEY ("assignmentId","studentId")
);

-- CreateTable
CREATE TABLE "QuestionPaper" (
    "id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "grade" "Grade" NOT NULL,
    "courseId" UUID,
    "subject" VARCHAR(60) NOT NULL DEFAULT '',
    "studentId" UUID,
    "fileId" UUID NOT NULL,
    "status" "PaperStatus" NOT NULL DEFAULT 'AWAITING',
    "uploadedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "activatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,

    CONSTRAINT "QuestionPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Test" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "grade" "Grade" NOT NULL,
    "courseId" UUID NOT NULL,
    "subject" VARCHAR(60) NOT NULL DEFAULT '',
    "maxMarks" INTEGER NOT NULL,
    "heldOn" DATE,
    "resultsVisible" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mark" (
    "id" UUID NOT NULL,
    "testId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "updatedById" UUID,
    "updatedByName" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeRecord" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "totalDue" INTEGER NOT NULL,
    "paid" INTEGER NOT NULL DEFAULT 0,
    "status" "FeeStatus" NOT NULL DEFAULT 'UNPAID',
    "statusOverride" "FeeStatus",
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeCharge" (
    "id" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "type" "FeeChargeType" NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "detail" VARCHAR(200),
    "amount" INTEGER NOT NULL,
    "courseId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeEvent" (
    "id" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "text" VARCHAR(200) NOT NULL,
    "actor" VARCHAR(100) NOT NULL,
    "amount" INTEGER,
    "kind" VARCHAR(30) NOT NULL,

    CONSTRAINT "FeeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "recordId" UUID,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" VARCHAR(60),
    "paidOn" DATE NOT NULL,
    "source" "PaymentSource" NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedByName" VARCHAR(100),
    "screenshotFileId" UUID,
    "note" VARCHAR(500),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" UUID,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeReminder" (
    "id" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "kind" VARCHAR(10) NOT NULL,
    "amount" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" UUID NOT NULL,
    "kind" "AnnouncementKind" NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "audiences" TEXT[],
    "audienceLabel" VARCHAR(200) NOT NULL,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "channels" TEXT[],
    "attachmentFileId" UUID,
    "status" "AnnouncementStatus" NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdById" UUID,
    "senderLabel" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "recipientType" "RecipientType" NOT NULL,
    "userId" UUID,
    "studentId" UUID,
    "category" "NotificationCategory" NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "actionLabel" VARCHAR(20),
    "href" VARCHAR(200),
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfidDevice" (
    "id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "location" VARCHAR(100),
    "keyHash" VARCHAR(64) NOT NULL,
    "lastHeartbeatAt" TIMESTAMP(3),
    "lastTapAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RfidDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfidCard" (
    "id" UUID NOT NULL,
    "uid" VARCHAR(32) NOT NULL,
    "studentId" UUID,
    "staffId" UUID,
    "status" "RfidCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabledAt" TIMESTAMP(3),

    CONSTRAINT "RfidCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfidScan" (
    "id" UUID NOT NULL,
    "deviceId" UUID,
    "cardUid" VARCHAR(32) NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" "RfidScanResult" NOT NULL,
    "studentId" UUID,
    "staffId" UUID,
    "session" "AttendanceSession",
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" UUID,

    CONSTRAINT "RfidScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "album" "GalleryAlbum" NOT NULL,
    "takenOn" DATE,
    "fileId" UUID NOT NULL,
    "onHomepage" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "studentName" VARCHAR(100),
    "detail" VARCHAR(300),
    "year" INTEGER,
    "fileId" UUID,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" UUID NOT NULL,
    "author" VARCHAR(100) NOT NULL,
    "role" VARCHAR(60),
    "quote" VARCHAR(1000) NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "mobile" VARCHAR(10) NOT NULL,
    "email" VARCHAR(254),
    "grade" VARCHAR(20),
    "interests" TEXT[],
    "message" VARCHAR(500) NOT NULL,
    "source" VARCHAR(30) NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" UUID NOT NULL,
    "purpose" "FilePurpose" NOT NULL,
    "originalName" VARCHAR(200) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" VARCHAR(200) NOT NULL,
    "uploadedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "area" "AuditArea" NOT NULL,
    "action" VARCHAR(60) NOT NULL,
    "summary" VARCHAR(300) NOT NULL,
    "actorId" UUID,
    "actorName" VARCHAR(100) NOT NULL,
    "actorRole" VARCHAR(20) NOT NULL,
    "entityType" VARCHAR(40),
    "entityId" VARCHAR(64),
    "fromLabel" VARCHAR(80),
    "toLabel" VARCHAR(80),
    "before" JSONB,
    "after" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" VARCHAR(60) NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Counter" (
    "key" VARCHAR(40) NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "JobRun" (
    "key" VARCHAR(120) NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionRegistration_competitionId_studentId_key" ON "CompetitionRegistration"("competitionId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_code_key" ON "Student"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Student_registrationId_key" ON "Student"("registrationId");

-- CreateIndex
CREATE INDEX "Student_grade_status_idx" ON "Student"("grade", "status");

-- CreateIndex
CREATE INDEX "Student_name_idx" ON "Student"("name");

-- CreateIndex
CREATE INDEX "Enrolment_studentId_endedAt_idx" ON "Enrolment"("studentId", "endedAt");

-- CreateIndex
CREATE INDEX "Enrolment_courseId_endedAt_idx" ON "Enrolment"("courseId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_code_key" ON "Registration"("code");

-- CreateIndex
CREATE INDEX "Registration_status_type_submittedAt_idx" ON "Registration"("status", "type", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnrolmentChange_code_key" ON "EnrolmentChange"("code");

-- CreateIndex
CREATE INDEX "EnrolmentChange_status_requestedAt_idx" ON "EnrolmentChange"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "TeachingAssignment_grade_courseId_idx" ON "TeachingAssignment"("grade", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingAssignment_staffId_grade_courseId_subject_key" ON "TeachingAssignment"("staffId", "grade", "courseId", "subject");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_fromDate_idx" ON "LeaveRequest"("status", "fromDate");

-- CreateIndex
CREATE INDEX "LeaveRequest_studentId_fromDate_idx" ON "LeaveRequest"("studentId", "fromDate");

-- CreateIndex
CREATE INDEX "AttendanceRecord_date_session_idx" ON "AttendanceRecord"("date", "session");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_studentId_date_session_key" ON "AttendanceRecord"("studentId", "date", "session");

-- CreateIndex
CREATE INDEX "ClassUpdate_grade_courseId_date_idx" ON "ClassUpdate"("grade", "courseId", "date");

-- CreateIndex
CREATE INDEX "ClassUpdate_staffId_date_idx" ON "ClassUpdate"("staffId", "date");

-- CreateIndex
CREATE INDEX "Homework_grade_courseId_dueOn_idx" ON "Homework"("grade", "courseId", "dueOn");

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkSubmission_homeworkId_studentId_key" ON "HomeworkSubmission"("homeworkId", "studentId");

-- CreateIndex
CREATE INDEX "Assignment_grade_courseId_createdAt_idx" ON "Assignment"("grade", "courseId", "createdAt");

-- CreateIndex
CREATE INDEX "QuestionPaper_status_createdAt_idx" ON "QuestionPaper"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Test_grade_courseId_createdAt_idx" ON "Test"("grade", "courseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Mark_testId_studentId_key" ON "Mark"("testId", "studentId");

-- CreateIndex
CREATE INDEX "FeeRecord_month_status_idx" ON "FeeRecord"("month", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FeeRecord_studentId_month_key" ON "FeeRecord"("studentId", "month");

-- CreateIndex
CREATE INDEX "Payment_status_submittedAt_idx" ON "Payment"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "Payment_studentId_submittedAt_idx" ON "Payment"("studentId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeeReminder_recordId_kind_key" ON "FeeReminder"("recordId", "kind");

-- CreateIndex
CREATE INDEX "Announcement_status_scheduledFor_idx" ON "Announcement"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "Announcement_createdAt_idx" ON "Announcement"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_studentId_createdAt_idx" ON "Notification"("studentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RfidDevice_keyHash_key" ON "RfidDevice"("keyHash");

-- CreateIndex
CREATE INDEX "RfidCard_uid_status_idx" ON "RfidCard"("uid", "status");

-- CreateIndex
CREATE INDEX "RfidScan_scannedAt_idx" ON "RfidScan"("scannedAt");

-- CreateIndex
CREATE INDEX "RfidScan_cardUid_scannedAt_idx" ON "RfidScan"("cardUid", "scannedAt");

-- CreateIndex
CREATE INDEX "RfidScan_result_resolvedAt_idx" ON "RfidScan"("result", "resolvedAt");

-- CreateIndex
CREATE INDEX "Enquiry_status_createdAt_idx" ON "Enquiry"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoredFile_storageKey_key" ON "StoredFile"("storageKey");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_area_createdAt_idx" ON "AuditLog"("area", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "User_staffCode_key" ON "User"("staffCode");

-- AddForeignKey
ALTER TABLE "SubCompetition" ADD CONSTRAINT "SubCompetition_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionRegistration" ADD CONSTRAINT "CompetitionRegistration_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionRegistration" ADD CONSTRAINT "CompetitionRegistration_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrolment" ADD CONSTRAINT "Enrolment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrolment" ADD CONSTRAINT "Enrolment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrolmentChange" ADD CONSTRAINT "EnrolmentChange_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassUpdate" ADD CONSTRAINT "ClassUpdate_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassUpdate" ADD CONSTRAINT "ClassUpdate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassUpdate" ADD CONSTRAINT "ClassUpdate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentView" ADD CONSTRAINT "AssignmentView_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentView" ADD CONSTRAINT "AssignmentView_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeRecord" ADD CONSTRAINT "FeeRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeCharge" ADD CONSTRAINT "FeeCharge_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "FeeRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeEvent" ADD CONSTRAINT "FeeEvent_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "FeeRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "FeeRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeReminder" ADD CONSTRAINT "FeeReminder_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "FeeRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfidCard" ADD CONSTRAINT "RfidCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfidCard" ADD CONSTRAINT "RfidCard_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfidScan" ADD CONSTRAINT "RfidScan_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "RfidDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfidScan" ADD CONSTRAINT "RfidScan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

