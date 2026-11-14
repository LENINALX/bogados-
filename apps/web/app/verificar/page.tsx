"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { nestPublicFetch } from "@/lib/nest-api";
import { rememberFirm } from "@/lib/firm-memory";
import { AuthShell } from "@/components/AuthShell";
import { FormMessage, Spinner, errorMessage } from "@/components/ui";

type Verified = { email: string; tenantSlug: string; tenantName: string };

/** Enlace del correo de confirmación al registrar una firma: activa la cuenta y lleva al acceso. */
function VerifyEmail() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [invalid, setInvalid] = useState<string | null>(null);
  // El enlace es de un solo uso: en desarrollo React monta dos veces y la segunda llamada fallaría
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token || token.length < 20 || token.length > 200) {
      setInvalid(token ? "El enlace no es válido o ha caducado." : "Falta el enlace. Ábrelo desde el email que recibiste.");
      return;
    }
    nestPublicFetch<Verified>("/auth/verify-email", { token })
      .then((res) => {
        rememberFirm({ slug: res.tenantSlug, name: res.tenantName });
        router.replace(`/login?${new URLSearchParams({ ok: "verified", firma: res.tenantSlug, email: res.email })}`);
      })
      .catch((err) => setInvalid(errorMessage(err, "El enlace no es válido o ha caducado.")));
  }, [token, router]);

  if (invalid) {
    return (
      <AuthShell title="Enlace no válido">
        <FormMessage type="error">{invalid}</FormMessage>
        <p className="mt-4 text-sm text-slate-600">
          El enlace de confirmación caduca en 24 horas y solo se puede usar una vez. Si ya lo usaste, tu cuenta está
          activa: inicia sesión. Si caducó, intenta iniciar sesión y te enviaremos uno nuevo.
        </p>
        <Link href="/login" className="btn-primary mt-6 w-full">
          Ir a iniciar sesión
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Confirmando tu email…">
      <p className="flex items-center gap-2 text-sm text-slate-600" role="status">
        <Spinner className="h-4 w-4" /> Un momento, estamos activando tu cuenta.
      </p>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  // Suspense: useSearchParams lo exige en el build de producción
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}
