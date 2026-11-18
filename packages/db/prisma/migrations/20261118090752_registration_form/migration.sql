-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterEnum
ALTER TYPE "FilePurpose" ADD VALUE 'SCHOOL_ID_CARD';

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "dateOfBirth" DATE,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "schoolIdCardFileId" UUID,
ADD COLUMN     "schoolName" VARCHAR(120);

-- CreateTable
CREATE TABLE "StudentAllocation" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentAllocation_courseId_idx" ON "StudentAllocation"("courseId");

-- CreateIndex
CREATE INDEX "StudentAllocation_staffId_idx" ON "StudentAllocation"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAllocation_studentId_courseId_key" ON "StudentAllocation"("studentId", "courseId");

-- AddForeignKey
ALTER TABLE "StudentAllocation" ADD CONSTRAINT "StudentAllocation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAllocation" ADD CONSTRAINT "StudentAllocation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAllocation" ADD CONSTRAINT "StudentAllocation_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
