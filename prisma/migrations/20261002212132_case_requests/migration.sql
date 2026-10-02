-- CreateEnum
CREATE TYPE "CaseRequestState" AS ENUM ('pendiente', 'aplazada', 'aceptada', 'rechazada');

-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "decidedById" TEXT,
ADD COLUMN     "decisionReason" TEXT,
ADD COLUMN     "requestState" "CaseRequestState";

-- CreateIndex
CREATE INDEX "Case_tenantId_requestState_idx" ON "Case"("tenantId", "requestState");
