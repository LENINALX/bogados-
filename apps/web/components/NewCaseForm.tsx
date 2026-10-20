"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CASE_STATUSES, CASE_STATUS_LABELS } from "@bogados/shared";
import { nestFetch } from "@/lib/nest-api";
import { PROCESS_NUMBER_EXAMPLE, normalizeProcessNumber } from "@/lib/process-number";
import { LIMITS, Schema, clean, rules } from "@/lib/validation";
import { errorMessage } from "./ui";
import { CharCount, FieldError, INVALID_INPUT, countId, fieldA11y } from "./form/FieldError";
import { useFieldErrors } from "./form/useFieldErrors";

type Option = { id: string; name: string; email?: string };
type ClientMode = "none" | "existing" | "new";
type Field = "title" | "matterType" | "processNumber" | "description" | "clientName" | "clientEmail" | "clientPassword";

const ORDER: readonly Field[] = ["title", "matterType", "processNumber", "description", "clientName", "clientEmail", "clientPassword"];

const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const label = "block text-sm font-medium text-slate-700";

export function NewCaseForm({
  lawyers,
  clients,
  canPickLawyer,
  currentUserId,
}: {
  lawyers: Option[];
  clients: Option[];
  canPickLawyer: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [clientMode, setClientMode] = useState<ClientMode>(clients.length ? "existing" : "none");
  const [manualPassword, setManualPassword] = useState(false);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema: Schema<Field> = {
    title: [
      rules.required("Escribe el título del caso."),
      rules.minLength(LIMITS.caseTitle.min, `El título debe tener al menos ${LIMITS.caseTitle.min} caracteres.`),
      rules.maxLength(LIMITS.caseTitle.max),
    ],
    matterType: [rules.maxLength(LIMITS.matterType)],
    processNumber: [rules.processNumber()],
    description: [rules.maxLength(LIMITS.caseDescription)],
    ...(clientMode === "new"
      ? {
          clientName: [
            rules.required("Escribe el nombre del cliente."),
            rules.minLength(LIMITS.personName.min, `El nombre debe tener al menos ${LIMITS.personName.min} caracteres.`),
            rules.maxLength(LIMITS.personName.max),
          ],
          clientEmail: [rules.required("Escribe el email del cliente."), rules.email()],
          ...(manualPassword ? { clientPassword: [rules.newPassword()] } : {}),
        }
      : {}),
  };
  const v = useFieldErrors<Field>(schema, ORDER);
  const { errors } = v;

  /** Props de validación de un campo no controlado */
  const field = (name: Field, ...extra: (string | false | undefined)[]) => ({
    id: name,
    name,
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => v.blur(name, e.target.value),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => v.change(name, e.target.value),
    ...fieldA11y(name, errors[name], ...extra),
  });
  const cls = (name: Field, base = input) => `${base} ${errors[name] ? INVALID_INPUT : ""}`;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const fd = new FormData(e.currentTarget);
    const raw = (k: string) => String(fd.get(k) ?? "");
    const str = (k: string) => clean(raw(k));
    setError(null);

    const values = Object.fromEntries(ORDER.map((k) => [k, k === "clientPassword" ? raw(k) : str(k)])) as Record<Field, string>;
    if (!v.submit(values)) return;

    setLoading(true);
    let clientCreated = false;
    try {
      // Validado arriba: un número de proceso mal escrito no llega a crear un cliente huérfano
      const processNumber = normalizeProcessNumber(values.processNumber);

      let clientId: string | undefined;
      let invitationFailed = false;
      if (clientMode === "existing") clientId = str("clientId") || undefined;
      if (clientMode === "new") {
        const created = await nestFetch<{ id: string; invitationSent: boolean }>("/auth/register-client", {
          method: "POST",
          body: JSON.stringify({
            name: values.clientName,
            email: values.clientEmail,
            // Sin contraseña, la API envía una invitación por email
            password: manualPassword ? values.clientPassword : undefined,
          }),
        });
        clientCreated = true;
        clientId = created.id;
        invitationFailed = !manualPassword && !created.invitationSent;
      }

      const created = await nestFetch<{ id: string }>("/cases", {
        method: "POST",
        body: JSON.stringify({
          title: values.title,
          matterType: values.matterType || undefined,
          processNumber: processNumber ?? undefined,
          description: values.description || undefined,
          status: str("status") || undefined,
          lawyerId: canPickLawyer ? str("lawyerId") || undefined : undefined,
          clientId,
        }),
      });
      // El caso se crea igualmente; la página del caso avisa de que falta la invitación
      router.push(`/casos/${created.id}${invitationFailed ? "?aviso=invitacion" : ""}`);
      router.refresh();
    } catch (err) {
      const text = errorMessage(err, "No se pudo crear el caso.");
      setLoading(false);
      if (!clientCreated && /email ya registrado/i.test(text)) {
        v.set("clientEmail", "Ya hay un usuario con ese email en tu firma. Elige «Cliente existente» o usa otro email.");
      } else if (/número de proceso/i.test(text)) {
        v.set("processNumber", text);
      } else {
        setError(
          clientCreated
            ? `${text} El cliente ya quedó creado: elígelo en «Cliente existente» al reintentar.`
            : text,
        );
      }
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <section className="space-y-4 card p-5">
        <h2 className="text-sm font-semibold text-slate-800">Datos del caso</h2>
        <div>
          <label className={label} htmlFor="title">Título *</label>
          <input
            {...field("title")}
            required
            maxLength={LIMITS.caseTitle.max}
            className={cls("title")}
            placeholder="Ej. Demanda laboral — Pérez vs. ACME"
          />
          <FieldError id="title" error={errors.title} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="matterType">Materia</label>
            <input
              {...field("matterType")}
              maxLength={LIMITS.matterType}
              className={cls("matterType")}
              placeholder="Laboral, Civil, Penal…"
            />
            <FieldError id="matterType" error={errors.matterType} />
          </div>
          <div>
            <label className={label} htmlFor="status">Estado inicial</label>
            <select id="status" name="status" defaultValue="intake" className={input}>
              {CASE_STATUSES.map((s) => (
                <option key={s} value={s}>{CASE_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={label} htmlFor="processNumber">Número de proceso (SATJE)</label>
          <input
            {...field("processNumber", "processNumber-help")}
            maxLength={LIMITS.processNumberInput}
            autoComplete="off"
            spellCheck={false}
            className={`${cls("processNumber")} font-mono tracking-wide sm:max-w-xs`}
            placeholder={PROCESS_NUMBER_EXAMPLE}
          />
          <FieldError id="processNumber" error={errors.processNumber} />
          <p id="processNumber-help" className="mt-1 text-xs text-slate-500">
            Opcional. Si el caso aún no está en la Función Judicial, lo puedes vincular más tarde desde la ficha.
          </p>
        </div>
        <div>
          <label className={label} htmlFor="description">Descripción</label>
          <textarea
            {...field("description", countId("description", description.length, LIMITS.caseDescription))}
            onChange={(e) => {
              setDescription(e.target.value);
              v.change("description", e.target.value);
            }}
            rows={4}
            maxLength={LIMITS.caseDescription}
            className={cls("description")}
          />
          <FieldError id="description" error={errors.description} />
          <CharCount id="description" length={description.length} max={LIMITS.caseDescription} className="mt-1 text-right" />
        </div>
        {canPickLawyer && (
          <div>
            <label className={label} htmlFor="lawyerId">Abogado responsable</label>
            <select id="lawyerId" name="lawyerId" defaultValue={currentUserId} className={input}>
              {lawyers.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section className="space-y-4 card p-5">
        <h2 className="text-sm font-semibold text-slate-800">Cliente</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {(
            [
              ["existing", "Cliente existente"],
              ["new", "Invitar cliente nuevo"],
              ["none", "Sin cliente por ahora"],
            ] as [ClientMode, string][]
          ).map(([mode, text]) => (
            <label key={mode} className="flex items-center gap-2">
              <input
                type="radio"
                name="clientMode"
                checked={clientMode === mode}
                onChange={() => setClientMode(mode)}
                disabled={mode === "existing" && clients.length === 0}
              />
              {text}
            </label>
          ))}
        </div>

        {clientMode === "existing" && (
          <select name="clientId" required className={input} aria-label="Cliente">
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.email}
              </option>
            ))}
          </select>
        )}

        {clientMode === "new" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="clientName">Nombre *</label>
              <input
                {...field("clientName")}
                required
                maxLength={LIMITS.personName.max}
                autoComplete="off"
                className={cls("clientName")}
              />
              <FieldError id="clientName" error={errors.clientName} />
            </div>
            <div>
              <label className={label} htmlFor="clientEmail">Email *</label>
              <input
                {...field("clientEmail")}
                type="email"
                required
                maxLength={LIMITS.email}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className={cls("clientEmail")}
              />
              <FieldError id="clientEmail" error={errors.clientEmail} />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2">
              <input
                type="checkbox"
                checked={manualPassword}
                onChange={(e) => setManualPassword(e.target.checked)}
              />
              Asignar una contraseña temporal en lugar de enviar invitación por email
            </label>
            {manualPassword ? (
              <div>
                <label className={label} htmlFor="clientPassword">Contraseña temporal *</label>
                <input
                  {...field("clientPassword", !errors.clientPassword && "clientPassword-hint")}
                  type="password"
                  required
                  maxLength={LIMITS.password.max}
                  className={cls("clientPassword")}
                  autoComplete="new-password"
                />
                <FieldError id="clientPassword" error={errors.clientPassword} />
                {!errors.clientPassword && (
                  <p id="clientPassword-hint" className="mt-1 text-xs text-slate-500">
                    Entre {LIMITS.password.min} y {LIMITS.password.max} caracteres. Compártela con el cliente para que acceda al portal.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 sm:col-span-2">
                El cliente recibirá un email con un enlace (válido 7 días) para activar su acceso al portal.
              </p>
            )}
          </div>
        )}
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading || undefined}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {loading ? "Creando…" : "Crear caso"}
        </button>
      </div>
    </form>
  );
}
