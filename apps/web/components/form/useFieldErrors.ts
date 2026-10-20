"use client";

import { useState } from "react";
import { Errors, Schema, firstError, validate } from "@/lib/validation";

/**
 * Errores por campo con el mismo comportamiento que el registro:
 * - al salir de un campo se comprueba (`blur`),
 * - al escribir solo se recalcula si ya mostraba un error, para que desaparezca al corregirlo (`change`),
 * - al enviar se comprueban todos y el foco va al primero con error (`submit`).
 * `idOf` traduce el nombre del campo al id del elemento que recibe el foco.
 */
export function useFieldErrors<K extends string>(
  schema: Schema<K>,
  order: readonly K[],
  idOf: (key: K) => string = (key) => key,
) {
  const [errors, setErrors] = useState<Errors<K>>({});

  const one = (key: K, value: string) =>
    validate({ [key]: value } as Record<K, string>, { [key]: schema[key] } as Schema<K>)[key];

  const focus = (key: K) => {
    // Tras pintar el error, para que el lector de pantalla lea la descripción ya enlazada
    requestAnimationFrame(() => document.getElementById(idOf(key))?.focus());
  };

  return {
    errors,
    blur(key: K, value: string) {
      const error = one(key, value);
      setErrors((prev) => (prev[key] === error ? prev : { ...prev, [key]: error }));
    },
    change(key: K, value: string) {
      if (!errors[key]) return;
      const error = one(key, value);
      setErrors((prev) => ({ ...prev, [key]: error }));
    },
    /** Valida todo: devuelve true si se puede enviar. */
    submit(values: Record<K, string>): boolean {
      const found = validate(values, schema);
      setErrors(found);
      const first = firstError(found, order);
      if (first) focus(first);
      return !first;
    },
    /** Error que llega del servidor y se puede atribuir a un campo. */
    set(key: K, message: string) {
      setErrors((prev) => ({ ...prev, [key]: message }));
      focus(key);
    },
    reset() {
      setErrors({});
    },
  };
}
