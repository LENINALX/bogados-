-- Identidad de la firma: logo, color de marca y datos de contacto (Admin › Ajustes)
ALTER TABLE "Tenant" ADD COLUMN "logoPath" TEXT,
ADD COLUMN "logoMime" TEXT,
ADD COLUMN "logoUpdatedAt" TIMESTAMP(3),
ADD COLUMN "brandColor" TEXT,
ADD COLUMN "contactEmail" TEXT,
ADD COLUMN "contactPhone" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "website" TEXT;
