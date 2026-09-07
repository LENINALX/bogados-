import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function requireApiSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }
  return { session };
}

export async function requireApiRole(...roles: Role[]) {
  const result = await requireApiSession();
  if ("error" in result && result.error) return result;
  const { session } = result as { session: NonNullable<Awaited<ReturnType<typeof getServerSession>>> };
  if (!session?.user || !roles.includes(session.user.role)) {
    return { error: NextResponse.json({ error: "Sin permiso" }, { status: 403 }) };
  }
  return { session };
}
