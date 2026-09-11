import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api/auth-guard";
import { Role } from "@prisma/client";
import { z } from "zod";

type Ctx = { params: { id: string } };

async function assertCaseParticipant(
  caseId: string,
  user: { id: string; role: Role; tenantId: string }
) {
  const c = await prisma.case.findFirst({
    where: { id: caseId, tenantId: user.tenantId },
  });
  if (!c) return null;
  if (user.role === "ADMIN") return c;
  if (user.role === "ABOGADO" && c.lawyerId === user.id) return c;
  if (user.role === "CLIENTE" && c.clientId === user.id) return c;
  return null;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const auth = await requireApiSession();
  if ("error" in auth && auth.error) return auth.error;
  const { session } = auth as { session: { user: { id: string; role: Role; tenantId: string } } };

  const c = await assertCaseParticipant(params.id, session.user);
  if (!c) return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: { caseId: c.id, tenantId: session.user.tenantId },
    include: { sender: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages });
}

const msgSchema = z.object({
  body: z.string().min(1).max(4000),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await requireApiSession();
  if ("error" in auth && auth.error) return auth.error;
  const { session } = auth as { session: { user: { id: string; role: Role; tenantId: string } } };

  const c = await assertCaseParticipant(params.id, session.user);
  if (!c) return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = msgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      tenantId: session.user.tenantId,
      caseId: c.id,
      senderId: session.user.id,
      body: parsed.data.body,
    },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });

  return NextResponse.json({ message }, { status: 201 });
}
