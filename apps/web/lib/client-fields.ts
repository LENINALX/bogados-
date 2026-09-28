import { Prisma } from "@prisma/client";

/**
 * Campos que se envían a componentes de cliente. Todo lo que no esté aquí
 * (storagePath, tenantId, ids internos…) se queda en el servidor.
 */
export const documentFields = {
  id: true,
  fileName: true,
  sizeBytes: true,
  sharedWithClient: true,
  createdAt: true,
  uploadedBy: { select: { name: true } },
} satisfies Prisma.DocumentSelect;

export const messageFields = {
  id: true,
  body: true,
  createdAt: true,
  sender: { select: { id: true, name: true, role: true } },
} satisfies Prisma.MessageSelect;
