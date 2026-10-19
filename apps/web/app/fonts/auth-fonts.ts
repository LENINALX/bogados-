import localFont from "next/font/local";

/*
 * Tipografía de las pantallas de acceso, alojada en el proyecto (licencia SIL OFL 1.1, ver los
 * .txt de esta carpeta): así la compilación no depende de descargarla de Google Fonts.
 * Origen: paquetes Fontsource @fontsource-variable/source-serif-4@5.1.0 y @fontsource/ibm-plex-sans@5.1.0.
 */
export const authDisplay = localFont({
  src: [
    { path: "./source-serif-4-latin-wght-normal.woff2", weight: "200 900", style: "normal" },
    { path: "./source-serif-4-latin-wght-italic.woff2", weight: "200 900", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

export const authSans = localFont({
  src: [
    { path: "./ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-auth",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});
