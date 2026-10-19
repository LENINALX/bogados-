"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, MailCheck, RotateCw } from "lucide-react";
import type { LoginChallenge } from "@/lib/auth-errors";
import { nestPublicFetch, NestApiError } from "@/lib/nest-api";
import { FormMessage, Spinner } from "../ui";

const LENGTH = 6;

/** «9:05» */
function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/**
 * Segundo paso del acceso. `onVerify` intenta entrar con el código; devuelve un mensaje
 * de error (y si hay que volver al primer paso) o nada si la sesión se abrió.
 */
export function LoginCodeStep({
  challenge: initial,
  onVerify,
  onRestart,
}: {
  challenge: LoginChallenge;
  onVerify: (challengeId: string, code: string) => Promise<{ message: string; restart?: boolean } | null>;
  onRestart: (message?: string) => void;
}) {
  const [challenge, setChallenge] = useState(initial);
  const [digits, setDigits] = useState<string[]>(() => Array(LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const now = useNow(true);

  const expiresIn = new Date(challenge.expiresAt).getTime() - now;
  const resendIn = new Date(challenge.resendAvailableAt).getTime() - now;
  const expired = expiresIn <= 0;

  useEffect(() => boxes.current[0]?.focus(), []);

  function shake() {
    const form = formRef.current;
    if (!form) return;
    form.classList.remove("auth-shake");
    void form.offsetWidth;
    form.classList.add("auth-shake");
  }

  const submit = useCallback(
    async (code: string) => {
      if (code.length !== LENGTH || verifying) return;
      setVerifying(true);
      setError(null);
      setNotice(null);
      const failure = await onVerify(challenge.challengeId, code);
      if (!failure) {
        // Confirmación en verde mientras se navega (la navegación ya está en marcha: no añade espera)
        setVerified(true);
        return;
      }
      setVerifying(false);
      if (failure.restart) {
        onRestart(failure.message);
        return;
      }
      setError(failure.message);
      setDigits(Array(LENGTH).fill(""));
      shake();
      boxes.current[0]?.focus();
    },
    [challenge.challengeId, onRestart, onVerify, verifying],
  );

  /** Escribe desde la casilla `from`: un dígito o un código pegado entero. */
  function fill(from: number, raw: string) {
    const incoming = raw.replace(/\D/g, "");
    if (!incoming) return;
    const next = [...digits];
    // Pegar o autocompletar el código entero lo coloca desde la primera casilla
    const start = incoming.length >= LENGTH ? 0 : from;
    for (let i = 0; i < incoming.length && start + i < LENGTH; i++) next[start + i] = incoming[i];
    setDigits(next);
    setError(null);
    const filled = next.join("");
    if (filled.length === LENGTH && !next.includes("")) {
      boxes.current[LENGTH - 1]?.blur();
      void submit(filled);
    } else {
      boxes.current[Math.min(start + incoming.length, LENGTH - 1)]?.focus();
    }
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      const next = [...digits];
      next[i - 1] = "";
      setDigits(next);
      boxes.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      boxes.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < LENGTH - 1) {
      e.preventDefault();
      boxes.current[i + 1]?.focus();
    }
  }

  async function resend() {
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      const next = await nestPublicFetch<LoginChallenge>("/auth/login/resend", { challengeId: challenge.challengeId });
      setChallenge(next);
      setDigits(Array(LENGTH).fill(""));
      setNotice(`Te enviamos un código nuevo a ${next.emailHint}. El anterior ya no sirve.`);
      boxes.current[0]?.focus();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No pudimos reenviar el código.";
      // Desafío caducado o agotado: hay que volver a poner la contraseña
      if (err instanceof NestApiError && err.status === 401) onRestart(message);
      else setError(message);
    } finally {
      setResending(false);
    }
  }

  const code = digits.join("");

  return (
    <div>
      <div className="mb-6 flex items-center gap-3" aria-hidden>
        <span className="flex gap-1">
          <span className="h-1 w-6 rounded-full bg-brand-600" />
          <span className="h-1 w-6 rounded-full bg-brand-600" />
        </span>
        <span className="text-xs font-medium text-slate-500">Paso 2 de 2 · código de verificación</span>
      </div>
      <p className="sr-only">Paso 2 de 2: código de verificación.</p>
      <div className="mb-6 flex items-start gap-3 rounded-[0.625rem] border border-slate-900/[0.1] bg-surface p-3.5">
        <MailCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brand-700" aria-hidden />
        <p className="text-sm leading-relaxed text-slate-700">
          Enviamos un código de 6 dígitos a <span className="font-medium text-slate-900">{challenge.emailHint}</span>.
          Escríbelo para entrar.
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <FormMessage type="error">{error}</FormMessage>
        </div>
      )}
      {notice && !error && (
        <div className="mb-4">
          <FormMessage type="success">{notice}</FormMessage>
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          void submit(code);
        }}
      >
        <fieldset disabled={verifying}>
          <legend className="label mb-2">Código de acceso</legend>
          <div className="flex justify-between gap-2" role="group" aria-label="Código de 6 dígitos">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  boxes.current[i] = el;
                }}
                value={d}
                onChange={(e) => fill(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                onPaste={(e) => {
                  e.preventDefault();
                  fill(i, e.clipboardData.getData("text"));
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                // El sistema (iOS, Android, gestores de contraseñas) puede ofrecer el código del correo
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={i === 0 ? LENGTH : 1}
                aria-label={`Dígito ${i + 1} de ${LENGTH}`}
                aria-invalid={error ? true : undefined}
                className={`input otp-box min-w-0 flex-1 ${d ? "has-digit" : ""} ${verified ? "is-success" : ""}`}
                style={verified ? { transitionDelay: `${i * 30}ms` } : undefined}
              />
            ))}
          </div>
        </fieldset>

        <p
          className={`mt-3 flex items-center gap-1.5 text-[13px] ${
            verified ? "font-medium text-emerald-700" : expired ? "text-red-600" : "text-slate-500"
          }`}
          aria-live="polite"
        >
          {verified ? (
            <>
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Código correcto. Entrando…
            </>
          ) : expired ? (
            "El código ha caducado. Pide uno nuevo."
          ) : (
            `El código caduca en ${clock(expiresIn)}.`
          )}
        </p>

        <button
          type="submit"
          disabled={verifying || code.length !== LENGTH || expired}
          className="btn-primary mt-5 w-full"
        >
          {verifying && <Spinner />}
          {verifying ? "Verificando…" : "Verificar y entrar"}
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <button
          type="button"
          onClick={() => onRestart()}
          className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Usar otra cuenta
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={resending || resendIn > 0 || verifying}
          className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline disabled:text-slate-400 disabled:no-underline"
        >
          {resending ? <Spinner className="h-3.5 w-3.5" /> : <RotateCw className="h-3.5 w-3.5" aria-hidden />}
          {resendIn > 0 ? `Reenviar código en ${Math.ceil(resendIn / 1000)} s` : "Reenviar código"}
        </button>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        ¿No te llega? Revisa la carpeta de correo no deseado. Si no intentaste entrar, cambia tu contraseña.
      </p>
    </div>
  );
}
