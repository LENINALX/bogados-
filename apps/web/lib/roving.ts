import type { KeyboardEvent } from "react";

const NEXT = ["ArrowRight", "ArrowDown"];
const PREV = ["ArrowLeft", "ArrowUp"];

/**
 * Teclado de un grupo de opciones (`role="radiogroup"` con hijos `role="radio"`), patrón WAI-ARIA:
 * flechas para moverse (y elegir), Inicio/Fin para ir al primero/último. Solo la opción elegida
 * (o la primera) está en el orden de tabulación: `tabIndex={rovingTabIndex(...)}`.
 */
export function onRadioGroupKeyDown(e: KeyboardEvent<HTMLElement>) {
  if (![...NEXT, ...PREV, "Home", "End"].includes(e.key)) return;
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])'));
  const current = items.indexOf(document.activeElement as HTMLElement);
  if (current < 0 || items.length === 0) return;
  e.preventDefault();
  let next = current;
  if (e.key === "Home") next = 0;
  else if (e.key === "End") next = items.length - 1;
  else next = (current + (NEXT.includes(e.key) ? 1 : -1) + items.length) % items.length;
  items[next].focus();
  items[next].click();
}

/** 0 para la opción elegida (o la primera si no hay ninguna), -1 para el resto. */
export function rovingTabIndex(checked: boolean, index: number, anyChecked: boolean): 0 | -1 {
  return checked || (!anyChecked && index === 0) ? 0 : -1;
}
