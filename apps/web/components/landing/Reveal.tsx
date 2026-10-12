"use client";

import { ElementType, ReactNode, useEffect, useRef, useState } from "react";

/**
 * Aparece al entrar en pantalla (una sola vez). El estilo vive en `.reveal` (globals.css):
 * sin JavaScript el contenido se ve igual, y con movimiento reducido solo hay fundido.
 */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className = "",
  variant = "rise",
}: {
  children: ReactNode;
  as?: ElementType;
  /** Escalonado en ms para elementos hermanos */
  delay?: number;
  className?: string;
  /** rise = sube, aparece y se enfoca · line = se dibuja de izquierda a derecha */
  variant?: "rise" | "line";
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  // Tras aparecer se quita el retraso escalonado, para que no afecte al hover
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shown || !delay) return;
    const t = setTimeout(() => setSettled(true), delay + 1200);
    return () => clearTimeout(t);
  }, [shown, delay]);

  return (
    <Tag
      ref={ref}
      data-shown={shown}
      className={`${variant === "line" ? "reveal-line" : "reveal"} ${className}`}
      style={delay && !settled ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
