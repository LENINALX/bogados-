import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession, requireApiRole } from "@/lib/api/auth-guard";
import { CaseStatus } from "@prisma/client";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  matterType: z.string().max(100).optional(),
  status: z.nativeEnum(CaseStatus).optional(),
  lawyerId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth && auth.error) return auth.error;
  const { session } = auth as { session: { user: { id: string; role: string; tenantId: string } } };
  const { tenantId, role, id: userId } = session.user;

  const status = req.nextUrl.searchParams.get("status") as CaseStatus | null;
  const q = req.nextUrl.searchParams.get("q")?.trim();

  const where: Record<string, unknown> = { tenantId };
  if (status) where.status = status;
  if (role === "CLIENTE") where.clientId = userId;
  else if (role === "ABOGADO") where.lawyerId = userId;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const cases = await prisma.case.findMany({
    where,
    include: {
      lawyer: { select: { id: true, name: true, email: true } },
      client: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ cases });
}

export async function POST(req: NextRequest) {
  const auth = await requireApiRole("ADMIN", "ABOGADO");
  if ("error" in auth && auth.error) return auth.error;
  const { session } = auth as { session: { user: { id: string; role: string; tenantId: string } } };

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const lawyerId =
    session.user.role === "ABOGADO" ? session.user.id : data.lawyerId ?? session.user.id;

  const created = await prisma.case.create({
    data: {
      tenantId: session.user.tenantId,
      title: data.title,
      description: data.description,
      matterType: data.matterType,
      status: data.status ?? "intake",
      lawyerId,
      clientId: data.clientId ?? null,
    },
    include: {
      lawyer: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ case: created }, { status: 201 });
}
