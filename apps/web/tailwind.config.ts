import type { Config } from "tailwindcss";

/**
 * Las paletas leen variables CSS (app/globals.css) que cambian con el tema:
 * todo `bg-slate-50`, `text-red-700`, etc. se adapta al modo oscuro sin
 * escribir variantes `dark:` en cada componente.
 */
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (palette: string) => Object.fromEntries(STEPS.map((s) => [s, token(`${palette}-${s}`)]));

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        slate: scale("slate"),
        /** Azul de la firma. 600 = fondos con texto blanco · 700 = texto y enlaces */
        brand: scale("brand"),
        red: scale("red"),
        emerald: scale("emerald"),
        amber: scale("amber"),
        sky: scale("sky"),
        blue: scale("blue"),
        violet: scale("violet"),
        /** Superficies: tarjetas, inputs, menús */
        surface: token("surface"),
        /** Fondo de la aplicación */
        canvas: token("canvas"),
      },
      // `border`/`divide` sin color usan gray-200 por defecto, que no cambia con el tema
      borderColor: { DEFAULT: token("slate-200") },
      transitionTimingFunction: {
        // Curvas de salida suaves (respuesta rápida, asentamiento sin rebote)
        out: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
