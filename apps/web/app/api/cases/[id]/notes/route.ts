import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api/auth-guard";
import { getAccessibleCase } from "@/lib/case-access";
import { Role } from "@prisma/client";
import { z } from "zod";

type Ctx = { params: { id: string } };

const noteSchema = z.object({
  body: z.string().min(1).max(5000),
  isInternal: z.boolean().default(true),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await requireApiRole("ADMIN", "ABOGADO");
  if ("error" in auth && auth.error) return auth.error;
  const { session } = auth as { session: { user: { id: string; role: Role; tenantId: string } } };

  const c = await getAccessibleCase(params.id, session.user);
  if (!c) return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const note = await prisma.caseNote.create({
    data: {
      tenantId: session.user.tenantId,
      caseId: c.id,
      authorId: session.user.id,
      body: parsed.data.body,
      isInternal: parsed.data.isInternal,
    },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ note }, { status: 201 });
}
