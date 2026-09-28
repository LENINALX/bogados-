import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

/** Sesión válida o null. Una sesión revocada o caducada cuenta como ausente. */
export async function getSession() {
  const session = await getServerSession(authOptions);
  return session?.user && !session.error ? session : null;
}

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.error) redirect(`/login?error=${session.error}`);
  return session;
}

export async function requireRole(...roles: Role[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    redirect("/login?error=forbidden");
  }
  return session;
}
