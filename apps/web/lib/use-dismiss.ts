"use client";

import { RefObject, useEffect } from "react";

/** Cierra un menú/popover al pulsar fuera o con Escape (devuelve el foco al disparador). */
export function useDismiss(
  open: boolean,
  ref: RefObject<HTMLElement>,
  onClose: () => void,
  trigger?: RefObject<HTMLElement>,
) {
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        trigger?.current?.focus();
      }
    }
    // pointerdown: responde en el press, no al soltar
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, ref, onClose, trigger]);
}
