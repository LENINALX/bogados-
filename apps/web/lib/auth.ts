import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { encodeLoginOutcome, LoginChallenge, LoginOutcome } from "./auth-errors";
import { sessionError } from "./session-state";

/** URL de la API Nest vista desde el servidor de Next (en Docker puede diferir de la pública). */
const NEST_API_URL = (
  process.env.NEST_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001/api/v1"
).replace(/\/$/, "");

type NestSession = {
  accessToken: string;
  user: { id: string; email: string; name: string; role: Role; tenantId: string };
};
type NestLoginResponse = NestSession | (LoginChallenge & { twoFactorRequired: true });

/** El intento no termina en sesión: la página recibe el motivo en `res.error`. */
function stop(outcome: LoginOutcome): never {
  throw new Error(encodeLoginOutcome(outcome));
}

function headerValue(headers: Record<string, unknown> | undefined, name: string): string | undefined {
  const v = headers?.[name];
  const first = Array.isArray(v) ? v[0] : v;
  return typeof first === "string" ? first : undefined;
}

/** Errores del segundo paso: la API manda `details.code` y, si aplica, los intentos restantes. */
async function codeStepFailure(res: Response): Promise<never> {
  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    details?: { code?: string; remainingAttempts?: number };
  };
  const message = json.error ?? "No pudimos verificar el código.";
  switch (json.details?.code) {
    case "BAD_CODE":
      return stop({ kind: "bad_code", message, remaining: json.details.remainingAttempts });
    case "CODE_EXPIRED":
      return stop({ kind: "code_expired", message });
    default:
      return stop({ kind: "restart", message });
  }
}

/** Emisión y expiración (en segundos) leídas del propio JWT de Nest. */
function jwtTimes(token: string): { iat: number; exp: number } {
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  return {
    iat: typeof payload.iat === "number" ? payload.iat : 0,
    exp: typeof payload.exp === "number" ? payload.exp : 0,
  };
}

export const authOptions: NextAuthOptions = {
  // El límite real lo pone el token de la API: 12 h, o 30 días con «mantener la sesión iniciada»
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
        tenantSlug: { label: "Código de firma", type: "text" },
        remember: { label: "Mantener la sesión iniciada", type: "text" },
        challengeId: { label: "Desafío", type: "text" },
        code: { label: "Código", type: "text" },
      },
      // Nest es la fuente de verdad de las credenciales; su JWT se guarda en la
      // sesión de NextAuth (cookie cifrada) para que sirva en cualquier pestaña.
      async authorize(credentials, req) {
        // Origen real del intento (el navegador), para el registro de accesos de la firma
        const forwarded = headerValue(req?.headers, "x-forwarded-for")?.split(",")[0]?.trim();
        const clientHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (forwarded) clientHeaders["x-client-ip"] = forwarded;
        const userAgent = headerValue(req?.headers, "user-agent");
        if (userAgent) clientHeaders["x-client-user-agent"] = userAgent;

        // Segundo paso: el código de 6 dígitos enviado por email
        const codeStep = Boolean(credentials?.challengeId && credentials?.code);
        if (!codeStep && (!credentials?.email || !credentials?.password || !credentials.tenantSlug)) return null;

        let res: Response;
        try {
          res = await fetch(`${NEST_API_URL}/auth/${codeStep ? "login/verify" : "login"}`, {
            method: "POST",
            headers: clientHeaders,
            body: JSON.stringify(
              codeStep
                ? { challengeId: credentials!.challengeId, code: credentials!.code }
                : {
                    email: credentials!.email,
                    password: credentials!.password,
                    tenantSlug: credentials!.tenantSlug,
                    remember: credentials!.remember === "true",
                  },
            ),
            cache: "no-store",
          });
        } catch {
          stop({ kind: "unavailable" });
        }

        if (res.status === 429) {
          // Cuenta bloqueada por fallos (la API dice cuánto falta) o freno por exceso de peticiones
          const body = (await res.json().catch(() => ({}))) as { details?: { retryAfterSeconds?: number } };
          const retry = body.details?.retryAfterSeconds ?? Number(res.headers.get("retry-after-login"));
          stop({ kind: "locked", retryAfterSeconds: Number.isFinite(retry) && retry > 0 ? retry : undefined });
        }
        if (codeStep && (res.status === 400 || res.status === 401)) await codeStepFailure(res);
        // 400 (datos mal formados) y 401 (credenciales): un único mensaje, con los intentos que quedan
        if (res.status === 400 || res.status === 401) {
          const body = (await res.json().catch(() => ({}))) as { details?: { remainingAttempts?: number } };
          stop({ kind: "invalid", remaining: body.details?.remainingAttempts });
        }
        if (!res.ok) stop({ kind: "unavailable" });

        const json = await res.json();
        const data = (json.data ?? json) as NestLoginResponse;
        if ("twoFactorRequired" in data) {
          const { challengeId, emailHint, expiresAt, resendAvailableAt } = data;
          stop({ kind: "two_factor", challenge: { challengeId, emailHint, expiresAt, resendAvailableAt } });
        }
        const { accessToken, user } = data;
        const { iat, exp } = jwtTimes(accessToken);
        return {
          ...user,
          accessToken,
          accessTokenIssuedAt: iat,
          accessTokenExpires: exp * 1000,
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
        token.accessTokenIssuedAt = user.accessTokenIssuedAt;
        token.accessTokenExpires = user.accessTokenExpires;
      }

      // Se revalida en cada lectura de sesión: un usuario desactivado pierde el
      // acceso al instante y un cambio de rol se aplica sin volver a entrar.
      const current = token.id
        ? await prisma.user.findUnique({
            where: { id: token.id },
            select: { active: true, role: true, name: true, passwordChangedAt: true },
          })
        : null;

      const error = sessionError(current, token);
      if (error || !current) {
        token.error = error ?? "revoked";
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
