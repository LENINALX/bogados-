import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api/auth-guard";
import { isStaff } from "@/lib/permissions";
import { readFile } from "@/lib/storage/local";
import { Role } from "@prisma/client";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const auth = await requireApiSession();
  if ("error" in auth && auth.error) return auth.error;
  const { session } = auth as { session: { user: { id: string; role: Role; tenantId: string } } };

  const doc = await prisma.document.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { case: true },
  });
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const c = doc.case;
  if (session.user.role === "CLIENTE") {
    if (c.clientId !== session.user.id || !doc.sharedWithClient) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
  } else if (session.user.role === "ABOGADO" && c.lawyerId !== session.user.id) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  } else if (!isStaff(session.user.role) && !doc.sharedWithClient) {
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
