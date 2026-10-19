"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { nestFetch } from "@/lib/nest-api";
import { LoginEvent } from "@/lib/login-events";
import { FormMessage, Spinner, errorMessage } from "@/components/ui";
import { TwoFactorCard } from "./TwoFactorCard";
import { PasswordCard } from "./PasswordCard";
import { LoginActivityCard } from "./LoginActivityCard";

/** Respuesta de GET /auth/security */
export type SecurityInfo = {
  twoFactorEnabled: boolean;
  twoFactorRequiredByFirm: boolean;
  lastLoginAt: string | null;
  recent: LoginEvent[];
};

/** Seguridad de la cuenta propia: verificación en dos pasos, contraseña y últimos accesos. */
export function AccountSecurity({ timeZone }: { timeZone: string }) {
  const [data, setData] = useState<SecurityInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setData(await nestFetch<SecurityInfo>("/auth/security"));
    } catch (err) {
      setLoadError(errorMessage(err, "No se pudo cargar la seguridad de tu cuenta."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) {
    if (loadError) {
      return (
        <div className="card card-body max-w-xl space-y-3">
          <FormMessage type="error">{loadError}</FormMessage>
          <button type="button" onClick={load} disabled={loading} className="btn-secondary btn-sm">
            {loading ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
            Reintentar
          </button>
        </div>
      );
    }
    return <SecuritySkeleton />;
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-6">
        <TwoFactorCard
          enabled={data.twoFactorEnabled}
          requiredByFirm={data.twoFactorRequiredByFirm}
          onChange={(twoFactorEnabled) => setData((d) => (d ? { ...d, twoFactorEnabled } : d))}
        />
        <PasswordCard />
      </div>
      <div className="min-w-0">
        <LoginActivityCard events={data.recent} lastLoginAt={data.lastLoginAt} timeZone={timeZone} />
      </div>
    </div>
  );
}

function SecuritySkeleton() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2" aria-busy="true">
      <p role="status" className="sr-only">
        Cargando la seguridad de tu cuenta…
      </p>
      <div className="space-y-6">
        {[3, 5].map((lines, i) => (
          <div key={i} className="card">
            <div className="card-header">
              <div className="skeleton h-4 w-44" />
              <div className="skeleton h-5 w-20 rounded-full" />
            </div>
            <div className="card-body space-y-3">
              {Array.from({ length: lines }, (_, j) => (
                <div key={j} className={`skeleton h-3.5 ${j === lines - 1 ? "w-1/3" : "w-full"}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header">
          <div className="skeleton h-4 w-36" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 sm:px-5">
              <div className="skeleton h-4 w-4 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 w-2/3" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
