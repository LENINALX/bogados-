-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('pendiente', 'confirmada', 'cancelada', 'completada');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "appointmentMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Guayaquil';

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "caseId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'pendiente',
    "reason" TEXT,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Availability_tenantId_lawyerId_idx" ON "Availability"("tenantId", "lawyerId");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_lawyerId_startsAt_idx" ON "Appointment"("tenantId", "lawyerId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_clientId_startsAt_idx" ON "Appointment"("tenantId", "clientId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_status_startsAt_idx" ON "Appointment"("status", "startsAt");

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Integridad (Prisma no modela CHECK; se mantienen al migrar)
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_range_check" CHECK ("weekday" BETWEEN 0 AND 6 AND "startMin" >= 0 AND "endMin" <= 1440 AND "startMin" < "endMin");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_range_check" CHECK ("startsAt" < "endsAt");
