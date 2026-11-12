-- Actividad de la firma que no pertenece a un caso (usuarios, citas, ajustes)
ALTER TABLE "ActivityEvent" ALTER COLUMN "caseId" DROP NOT NULL;

-- Registro global para el admin: por fecha y por persona
CREATE INDEX "ActivityEvent_tenantId_createdAt_idx" ON "ActivityEvent"("tenantId", "createdAt");
CREATE INDEX "ActivityEvent_tenantId_actorId_createdAt_idx" ON "ActivityEvent"("tenantId", "actorId", "createdAt");
