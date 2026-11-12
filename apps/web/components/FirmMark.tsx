"use client";

import { useState } from "react";
import { firmLogoUrl, firmMonogram } from "@/lib/firm-branding";

/**
 * Logo de la firma o, si no tiene (o no carga), su monograma sobre su color de marca.
 * El logo se muestra entero sobre un fondo claro: muchos logos no son cuadrados.
 */
export function FirmMark({
  name,
  slug,
  logoVersion,
  brandColor,
  size = 32,
  className = "",
}: {
  name: string;
  slug: string;
  logoVersion?: number | null;
  brandColor?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (logoVersion && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- imagen servida por la API, sin optimizar
      <img
        src={firmLogoUrl(slug, logoVersion)}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={`shrink-0 rounded-md bg-white object-contain p-0.5 ring-1 ring-slate-900/10 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-md bg-brand-700 font-semibold tracking-wide text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4), ...(brandColor ? { backgroundColor: brandColor } : {}) }}
    >
      {firmMonogram(name)}
    </span>
  );
}
