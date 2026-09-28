import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { API_UNAVAILABLE, TOO_MANY_ATTEMPTS } from "./auth-errors";

/** URL de la API Nest vista desde el servidor de Next (en Docker puede diferir de la pública). */
const NEST_API_URL = (
  process.env.NEST_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001/api/v1"
).replace(/\/$/, "");

type NestLoginResponse = {
  accessToken: string;
  user: { id: string; email: string; name: string; role: Role; tenantId: string };
};

/** Fecha de expiración (ms) leída del propio JWT de Nest. */
function jwtExpiresAt(token: string): number {
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
        tenantSlug: { label: "Código de firma", type: "text" },
      },
      // Nest es la fuente de verdad de las credenciales; su JWT se guarda en la
      // sesión de NextAuth (cookie cifrada) para que sirva en cualquier pestaña.
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials.tenantSlug) return null;

        let res: Response;
        try {
          res = await fetch(`${NEST_API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              tenantSlug: credentials.tenantSlug,
            }),
            cache: "no-store",
          });
        } catch {
          throw new Error(API_UNAVAILABLE);
        }

        // 400 (datos mal formados) y 401 (credenciales) → "CredentialsSignin"
        if (res.status === 400 || res.status === 401) return null;
        if (res.status === 429) throw new Error(TOO_MANY_ATTEMPTS);
        if (!res.ok) throw new Error(API_UNAVAILABLE);

        const json = await res.json();
        const { accessToken, user } = (json.data ?? json) as NestLoginResponse;
        return {
          ...user,
          accessToken,
          accessTokenExpires: jwtExpiresAt(accessToken),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.accessToken = user.accessToken;
        token.accessTokenExpires = user.accessTokenExpires;
      }

      // Se revalida en cada lectura de sesión: un usuario desactivado pierde el
      // acceso al instante y un cambio de rol se aplica sin volver a entrar.
      const current = token.id
        ? await prisma.user.findUnique({
            where: { id: token.id },
            select: { active: true, role: true, name: true },
          })
        : null;

      if (!current?.active) {
        token.error = "revoked";
      } else if (!token.accessToken || Date.now() >= (token.accessTokenExpires ?? 0)) {
        token.error = "expired";
      } else {
        token.role = current.role;
        token.name = current.name;
        delete token.error;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.tenantId = token.tenantId;
      }
      if (token.error) {
        session.error = token.error;
      } else {
        session.accessToken = token.accessToken;
      }
      return session;
    },
  },
};
