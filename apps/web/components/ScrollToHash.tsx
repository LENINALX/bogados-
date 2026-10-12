"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Lleva hasta `#id` cuando la URL lo pide. Next 14 no siempre desplaza hasta el ancla al
 * llegar desde otra página (p. ej. de /agenda a /dashboard?status=abierto#casos).
 * Se repite al cambiar los filtros; con movimiento reducido el salto es directo.
 */
export function ScrollToHash({ id }: { id: string }) {
  const query = useSearchParams().toString();
  useEffect(() => {
    if (window.location.hash !== `#${id}`) return;
    const el = document.getElementById(id);
    if (!el) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" }));
  }, [id, query]);
  return null;
}
