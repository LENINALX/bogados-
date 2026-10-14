-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "processNumber" TEXT;

-- AlterTable
ALTER TABLE "CaseTask" ADD COLUMN     "notifiedOn" DATE,
ADD COLUMN     "termDays" INTEGER;

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_tenantId_date_key" ON "Holiday"("tenantId", "date");

-- CreateIndex
CREATE INDEX "Case_tenantId_processNumber_idx" ON "Case"("tenantId", "processNumber");

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

