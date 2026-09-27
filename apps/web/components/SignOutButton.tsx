"use client";

import { signOut } from "next-auth/react";
import { clearNestToken } from "@/lib/nest-api";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        clearNestToken();
        signOut({ callbackUrl: "/login" });
      }}
      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
      Salir
    </button>
  );
}
