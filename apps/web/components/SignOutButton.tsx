"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { clearNestToken } from "@/lib/nest-api";
import { Spinner } from "./ui";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        clearNestToken();
        signOut({ callbackUrl: "/login" });
      }}
      className="btn-secondary btn-sm"
    >
      {pending && <Spinner className="h-3 w-3" />}
      {pending ? "Saliendo…" : "Salir"}
    </button>
  );
}
