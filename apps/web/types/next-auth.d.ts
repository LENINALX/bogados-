import { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

/** revoked: usuario desactivado · expired: el JWT de la API Nest caducó o falta */
type SessionError = "revoked" | "expired";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      tenantId: string;
    };
    /** JWT de la API Nest; ausente si hay `error`. */
    accessToken?: string;
    error?: SessionError;
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: Role;
    tenantId: string;
    accessToken: string;
    accessTokenExpires: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    tenantId: string;
    accessToken?: string;
    accessTokenExpires?: number;
    error?: SessionError;
  }
}
