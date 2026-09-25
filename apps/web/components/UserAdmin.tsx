"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABELS, USER_ROLES, UserRole } from "@bogados/shared";
import { nestFetch } from "@/lib/nest-api";

const input = "rounded-lg border border-slate-300 px-3 py-2 text-sm";

export function InviteUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setLoading(true);
    setError(null);
    setDone(null);
    try {
      const user = await nestFetch<{ name: string; email: string }>("/users", {
        method: "POST",
        body: JSON.stringify({
          name: String(fd.get("name")).trim(),
          email: String(fd.get("email")).trim(),
          role: fd.get("role"),
          password: String(fd.get("password")),
        }),
      });
      form.reset();
      setDone(`${user.name} (${user.email}) creado. Comparte la contraseña temporal.`);
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
        className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900"
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
      <div className="grid gap-2 sm:grid-cols-4">
        <input name="name" required minLength={2} maxLength={120} placeholder="Nombre" className={input} />
        <input name="email" type="email" required placeholder="Email" className={input} />
        <select name="role" defaultValue="ABOGADO" className={input} aria-label="Rol">
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        <input
          name="password"
          required
          minLength={6}
          placeholder="Contraseña temporal"
          autoComplete="off"
          className={input}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Creando…" : "Crear usuario"}
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

  async function patch(data: Partial<typeof current>) {
    const prev = current;
    setCurrent({ ...current, ...data });
    setPending(true);
    setError(null);
    try {
      await nestFetch(`/users/${userId}`, { method: "PATCH", body: JSON.stringify(data) });
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
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
