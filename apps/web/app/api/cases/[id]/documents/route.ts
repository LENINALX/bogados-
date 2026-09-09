import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api/auth-guard";
import { isStaff } from "@/lib/permissions";
import { saveFile } from "@/lib/storage/local";
import { Role } from "@prisma/client";

type Ctx = { params: { id: string } };

async function assertCaseAccess(
  caseId: string,
  user: { id: string; role: Role; tenantId: string }
) {
  const c = await prisma.case.findFirst({
    where: { id: caseId, tenantId: user.tenantId },
  });
  if (!c) return null;
  if (user.role === "CLIENTE" && c.clientId !== user.id) return null;
  if (user.role === "ABOGADO" && c.lawyerId !== user.id) return null;
  return c;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const auth = await requireApiSession();
  if ("error" in auth && auth.error) return auth.error;
  const { session } = auth as { session: { user: { id: string; role: Role; tenantId: string } } };

  const c = await assertCaseAccess(params.id, session.user);
  if (!c) return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });

  const where: { caseId: string; tenantId: string; sharedWithClient?: boolean } = {
    caseId: c.id,
    tenantId: session.user.tenantId,
  };
  if (!isStaff(session.user.role)) {
    where.sharedWithClient = true;
  }

  const documents = await prisma.document.findMany({
    where,
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await requireApiSession();
  if ("error" in auth && auth.error) return auth.error;
  const { session } = auth as { session: { user: { id: string; role: Role; tenantId: string } } };

  const c = await assertCaseAccess(params.id, session.user);
  if (!c) return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }

  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: "Archivo demasiado grande (máx. 10 MB)" }, { status: 400 });
  }

  let sharedWithClient = form.get("sharedWithClient") === "true";
  // Cliente siempre sube como compartido; no puede marcar interno
  if (session.user.role === "CLIENTE") sharedWithClient = true;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { storagePath } = await saveFile(session.user.tenantId, c.id, file.name, buffer);

  const doc = await prisma.document.create({
    data: {
      tenantId: session.user.tenantId,
      caseId: c.id,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      storagePath,
      sharedWithClient,
      uploadedById: session.user.id,
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}
