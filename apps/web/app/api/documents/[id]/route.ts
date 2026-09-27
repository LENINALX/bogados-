/** LEGACY — preferir NestJS apps/api en NEXT_PUBLIC_API_URL (/api/v1/...). */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api/auth-guard";
import { isStaff } from "@/lib/permissions";
import { readFile } from "@/lib/storage/local";
import { getAccessibleCase } from "@/lib/case-access";
import { Role } from "@prisma/client";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const auth = await requireApiSession();
  if ("error" in auth && auth.error) return auth.error;
  const { session } = auth as { session: { user: { id: string; role: Role; tenantId: string } } };

  const doc = await prisma.document.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const c = await getAccessibleCase(doc.caseId, session.user);
  if (!c) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  if (!isStaff(session.user.role) && !doc.sharedWithClient) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const data = await readFile(doc.storagePath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
        "Content-Length": String(doc.sizeBytes),
      },
    });
  } catch {
    return NextResponse.json({ error: "Archivo no disponible" }, { status: 404 });
  }
}
