-- CreateTable
CREATE TABLE "TeachingChangeRequest" (
    "id" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "rows" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" UUID,
    "decisionNote" VARCHAR(500),

    CONSTRAINT "TeachingChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeachingChangeRequest_staffId_status_idx" ON "TeachingChangeRequest"("staffId", "status");

-- CreateIndex
CREATE INDEX "TeachingChangeRequest_status_submittedAt_idx" ON "TeachingChangeRequest"("status", "submittedAt");

-- AddForeignKey
ALTER TABLE "TeachingChangeRequest" ADD CONSTRAINT "TeachingChangeRequest_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
