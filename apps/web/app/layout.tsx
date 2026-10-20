import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { themeInitScript } from "@/lib/theme";
import { fontDisplay, fontSans } from "./fonts";

export const metadata: Metadata = {
  title: "Bogados — Gestión legal",
  description: "Plataforma de gestión de casos legales para firmas de abogados",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe4" },
    { media: "(prefers-color-scheme: dark)", color: "#161411" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme lo pone el script antes de hidratar: el atributo puede diferir del HTML del servidor
    <html lang="es" suppressHydrationWarning className={`${fontSans.variable} ${fontDisplay.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
