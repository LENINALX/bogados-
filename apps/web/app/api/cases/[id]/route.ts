import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession, requireApiRole } from "@/lib/api/auth-guard";
import { CaseStatus, Role } from "@prisma/client";
import { isStaff } from "@/lib/permissions";
import { getAccessibleCase } from "@/lib/case-access";
import { z } from "zod";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const auth = await requireApiSession();
  if ("error" in auth && auth.error) return auth.error;
  const { session } = auth as {
    session: { user: { id: string; role: Role; tenantId: string } };
  };

  const base = await getAccessibleCase(params.id, session.user);
  if (!base) return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });

  const c = await prisma.case.findFirst({
    where: { id: base.id },
    include: {
      lawyer: { select: { id: true, name: true, email: true } },
      client: { select: { id: true, name: true, email: true } },
      notes: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!c) return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });

  if (!isStaff(session.user.role)) {
    c.notes = c.notes.filter((n) => !n.isInternal);
  }

  return NextResponse.json({ case: c });
}

const updateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  matterType: z.string().max(100).optional().nullable(),
  status: z.nativeEnum(CaseStatus).optional(),
  lawyerId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireApiRole("ADMIN", "ABOGADO");
  if ("error" in auth && auth.error) return auth.error;
  const { session } = auth as {
    session: { user: { id: string; role: Role; tenantId: string } };
  };

  const existing = await getAccessibleCase(params.id, session.user);
  if (!existing) return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const data = parsed.data;
  // Solo admin puede reasignar abogado/cliente
  if (session.user.role !== "ADMIN") {
    delete (data as { lawyerId?: unknown }).lawyerId;
    delete (data as { clientId?: unknown }).clientId;
  }

  const updated = await prisma.case.update({
    where: { id: existing.id },
    data: {
      ...data,
      closedAt:
        data.status === "cerrado"
          ? new Date()
          : data.status
            ? null
            : undefined,
    },
    include: {
      lawyer: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ case: updated });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const auth = await requireApiRole("ADMIN");
  if ("error" in auth && auth.error) return auth.error;
  const { session } = auth as { session: { user: { tenantId: string; role: Role; id: string } } };

  const existing = await getAccessibleCase(params.id, session.user);
  if (!existing) return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });

  await prisma.case.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
