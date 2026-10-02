"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABELS, USER_ROLES, UserRole } from "@bogados/shared";
import { nestFetch } from "@/lib/nest-api";
import { useToast } from "./Toaster";

const input = "rounded-lg border border-slate-300 px-3 py-2 text-sm";

/** Mensaje tras crear un usuario o cliente, según cómo recibirá el acceso. */
export function createdUserMessage(
  user: { name: string; email: string; invitationSent: boolean },
  manualPassword: boolean,
) {
  if (manualPassword) return `${user.name} creado. Comparte con él/ella la contraseña temporal.`;
  if (user.invitationSent) return `Invitación enviada a ${user.email}.`;
  return `${user.name} creado, pero no se pudo enviar el email. Usa «Reenviar invitación».`;
}

export function InviteUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    setDone(null);
    if (manual && String(fd.get("password")) !== String(fd.get("passwordConfirm"))) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const user = await nestFetch<{ name: string; email: string; invitationSent: boolean }>("/users", {
        method: "POST",
        body: JSON.stringify({
          name: String(fd.get("name")).trim(),
          email: String(fd.get("email")).trim(),
          role: fd.get("role"),
          // Sin contraseña, la API envía una invitación por email
          password: manual ? String(fd.get("password")) : undefined,
        }),
      });
      form.reset();
      setDone(createdUserMessage(user, manual));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el usuario.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
      >
        + Invitar usuario
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full space-y-3 card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800">Invitar usuario</span>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:text-slate-800">
          Cerrar
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <input name="name" required minLength={2} maxLength={120} placeholder="Nombre" className={input} />
        <input name="email" type="email" required placeholder="Email" className={input} />
        <select name="role" defaultValue="ABOGADO" className={input} aria-label="Rol">
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />
        Asignar una contraseña temporal en lugar de enviar invitación por email
      </label>
      {manual ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Contraseña temporal"
            autoComplete="new-password"
            className={input}
          />
          <input
            name="passwordConfirm"
            type="password"
            required
            minLength={6}
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            className={input}
          />
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Recibirá un email con un enlace (válido 7 días) para elegir su contraseña.
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Creando…" : manual ? "Crear usuario" : "Enviar invitación"}
        </button>
        {done && <span className="text-sm text-emerald-700">{done}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

export function UserRowControls({
  userId,
  role,
  active,
  isSelf,
}: {
  userId: string;
  role: UserRole;
  active: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState({ role, active });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function resendInvite() {
    setPending(true);
    setError(null);
    try {
      await nestFetch(`/users/${userId}/invite`, { method: "POST" });
      toast("success", "Invitación enviada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la invitación.");
    } finally {
      setPending(false);
    }
  }

  async function patch(data: Partial<typeof current>) {
    const prev = current;
    setCurrent({ ...current, ...data });
    setPending(true);
    setError(null);
    try {
      await nestFetch(`/users/${userId}`, { method: "PATCH", body: JSON.stringify(data) });
      toast(
        "success",
        data.active === undefined ? "Rol actualizado" : data.active ? "Usuario activado" : "Usuario desactivado",
      );
      router.refresh();
    } catch (err) {
      setCurrent(prev);
      setError(err instanceof Error ? err.message : "No se pudo actualizar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <select
          value={current.role}
          disabled={pending || isSelf}
          onChange={(e) => patch({ role: e.target.value as UserRole })}
          aria-label="Rol"
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-50"
        >
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending || isSelf}
          onClick={() => {
            if (current.active && !confirm("¿Desactivar este usuario? No podrá iniciar sesión.")) return;
            patch({ active: !current.active });
          }}
          className={`w-24 rounded-lg px-2 py-1 text-xs font-semibold disabled:opacity-40 ${
            current.active
              ? "border border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-700"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}
        >
          {current.active ? "Desactivar" : "Activar"}
        </button>
      </div>
      {!isSelf && current.active && (
        <button
          type="button"
          disabled={pending}
          onClick={resendInvite}
          title="Envía un enlace para que elija una contraseña nueva"
          className="text-xs font-medium text-brand-700 hover:underline disabled:opacity-40"
        >
          Reenviar invitación
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
