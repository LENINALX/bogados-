# Paleta de colores de Bogados

Bogados usa una paleta cálida y sobria, con tonos de papel, tinta y verde pino. Esta guía explica qué color usar en cada caso y cómo aplicarlo en el código, en tema claro y oscuro.

## Colores base

| Color | Hex | RGB | Rol |
|---|---|---|---|
| **Pergamino** | `#F4EFE4` | 244 239 228 | Fondo de las páginas (`canvas`) |
| **Marfil** | `#FCFAF5` | 252 250 245 | Superficies: tarjetas, paneles, menús e inputs (`surface`) |
| **Tinta** | `#171511` | 23 21 17 | Texto principal, riel de navegación y sombras |
| **Pino** | `#1F3D38` | 31 61 56 | Color de la marca: botones principales, enlaces y gráficas |
| **Arcilla** | `#9C4A3C` | 156 74 60 | Acento de la web pública (botón «Acceder») y errores |
| **Salvia** | `#3F6B56` | 63 107 86 | Éxito, confirmaciones y estado «Abierto» |

Hay tres tonos derivados, armonizados con la paleta, para los estados que la base no cubre:

| Color | Hex | Rol |
|---|---|---|
| **Ocre** | `#A87A2A` | Avisos, «pendiente», «ingreso» |
| **Pizarra** | `#3F5F7A` | Información, «en pausa», «confirmada» |
| **Ciruela** | `#6A4C6B` | Reserva (escala `violet`) |

## Cómo se usa en el código

Ningún componente lleva colores escritos a mano. Todos usan **tokens CSS** definidos en [`apps/web/app/globals.css`](../apps/web/app/globals.css), que [`tailwind.config.ts`](../apps/web/tailwind.config.ts) convierte en clases.

Las escalas conservan los nombres de Tailwind para no tener que reescribir componentes, pero sus tonos son los de la paleta:

| Clase de Tailwind | Color real | Para qué |
|---|---|---|
| `slate-*` | Neutros de Tinta a Marfil | Texto, bordes, fondos suaves |
| `brand-*` | Pino | Marca, acciones principales, enlaces |
| `red-*` | Arcilla | Errores, vencidos, eliminar |
| `emerald-*` | Salvia | Éxito, completado |
| `amber-*` | Ocre | Avisos, pendientes |
| `sky-*`, `blue-*` | Pizarra | Información |
| `violet-*` | Ciruela | Reserva |
| `canvas` | Pergamino | Fondo de la página |
| `surface` | Marfil | Tarjetas y paneles |
| `shell` | Pergamino oscurecido | Fondo de la app donde flotan los paneles |
| `rail` | Tinta | Riel de navegación y barra inferior del móvil |
| `accent` | Arcilla | Botón `.btn-accent` de la web pública |
| `accent-light` | Arcilla aclarada (`#D6917A`) | Texto de acento sobre fondos oscuros (portada, login) |
| `accent-ink` | Marfil | Texto sobre el botón de acento |

### Reglas de uso

- **Texto:** `text-slate-900` para el principal y `text-slate-500` para el secundario. `text-slate-400` solo en iconos, marcadores y placeholders, nunca en texto que haya que leer.
- **Enlaces y acciones:** `text-brand-700` para enlaces y `.btn-primary` (fondo `brand-600`) para la acción principal de cada pantalla. Solo puede haber una acción principal por zona.
- **Acento (Arcilla):** solo en la web pública, para la llamada a la acción («Acceder», «Iniciar sesión») y para detalles como el subrayado del titular. Dentro de la app, Arcilla significa error o peligro, así que no la uses como decoración.
- **Estados:** usa siempre la misma pareja de fondo suave y texto oscuro, por ejemplo `bg-emerald-100 text-emerald-800` o `bg-red-100 text-red-800`. Todas las parejas cumplen 4.5:1 en ambos temas.
- **Fondos oscuros fijos:** la portada, el panel del login y la banda de seguridad usan pino casi negro (`#0B1311`, `#0F1A17`) en los dos temas. Sobre ellos, el acento va en `text-accent-light`.
- **Nunca escribas un hex nuevo en un componente.** Si falta un tono, se añade a la paleta y se documenta aquí.

## Escalas generadas

Cada escala sale de su color base:
- **Tema claro:** los tonos claros (50–500) mezclan el color con Marfil, el 600 es el color base y los oscuros (700–950) lo mezclan con Tinta.
- **Tema oscuro:** los tonos se invierten sobre un fondo de Tinta, de modo que el 50 es el más oscuro y el 900 el más claro.

| Escala | Tema | 50 | 100 | 200 | 400 | 500 | 600 | 700 | 800 | 900 |
|---|---|---|---|---|---|---|---|---|---|---|
| Neutros (Tinta → Marfil) | claro | `#F5F3EE` | `#EDEBE6` | `#E1DFDA` | `#8A8883` | `#696763` | `#53514C` | `#403E3A` | `#2E2C28` | `#171511` |
| Neutros (Tinta → Marfil) | oscuro | `#161411` | `#211F1C` | `#2E2C28` | `#7A7770` | `#9B9790` | `#B8B4AB` | `#CECAC0` | `#E0DBD1` | `#F4EFE4` |
| Pino (marca) | claro | `#EFEFEA` | `#DFE1DC` | `#C5CBC6` | `#6A7D78` | `#3E5752` | `#1F3D38` | `#1F3D38` | `#1C2F2A` | `#1B2B26` |
| Pino (marca) | oscuro | `#1C1E1B` | `#1E231F` | `#222925` | `#2D3D39` | `#5B6E68` | `#2E5A51` | `#93C2B2` | `#386A60` | `#F8F4EC` |
| Arcilla | claro | `#F6EFEA` | `#F0E3DD` | `#E4CEC7` | `#BD867B` | `#A96356` | `#9C4A3C` | `#7F3E33` | `#64342A` | `#4F2B23` |
| Arcilla | oscuro | `#2B1D18` | `#36211B` | `#442620` | `#6E382D` | `#AC685A` | `#BC8578` | `#CCA598` | `#DBC1B5` | `#E7D6CB` |
| Salvia | claro | `#F1F1EB` | `#E3E7E0` | `#CDD6CD` | `#7F9C8C` | `#597F6C` | `#3F6B56` | `#365847` | `#2E4739` | `#28392E` |
| Salvia | oscuro | `#1D221C` | `#202922` | `#243228` | `#314D3F` | `#608370` | `#809B89` | `#A3B4A4` | `#C1CABC` | `#D9DBCF` |
| Ocre | claro | `#F7F2E9` | `#F1E9DB` | `#E7DAC2` | `#C5A66F` | `#B48C46` | `#A87A2A` | `#886424` | `#6B5020` | `#543F1C` |
| Ocre | oscuro | `#2D2415` | `#392C17` | `#48371A` | `#765722` | `#B68F4B` | `#C3A46D` | `#D2BA90` | `#DFCEB0` | `#E9DDC8` |
| Pizarra | claro | `#F1F1EE` | `#E3E6E5` | `#CDD3D6` | `#7F94A4` | `#59758B` | `#3F5F7A` | `#364F63` | `#2E404E` | `#28343D` |
| Pizarra | oscuro | `#1D2022` | `#20262A` | `#242E35` | `#314656` | `#60798D` | `#8093A0` | `#A3AEB4` | `#C1C7C6` | `#D9D9D4` |

**Excepción en el Pino.** En el tema claro, el 600 (fondos) y el 700 (texto) son el mismo Pino. En el oscuro se separan:
- el 600 es un Pino aclarado (`#2E5A51`), que lleva texto blanco encima;
- el 700 es un verde claro (`#93C2B2`), que se lee sobre el fondo oscuro.

### Superficies

| Token | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F4EFE4` (Pergamino) | `#161411` |
| `surface` | `#FCFAF5` (Marfil) | `#1F1C18` |
| `shell` | `#E9E4D9` | `#0F0E0B` |
| `rail` | `#171511` (Tinta) | `#2A2620` |
| `raised` (píldora activa) | `#FCFAF5` | `#2C2823` |

## Gráficas

Las gráficas usan tonos medios fijos, que sirven en los dos temas: tienen al menos 3:1 tanto sobre Marfil como sobre la superficie oscura. Cada color va siempre con el mismo estado y nunca depende del orden.

| Estado del caso | Color | Texto dentro |
|---|---|---|
| Ingreso | `#B8862E` (Ocre) | Tinta |
| Abierto | `#4A7A63` (Salvia) | blanco |
| En pausa | `#4F7391` (Pizarra) | blanco |
| Cerrado | `#7A746A` (gris Tinta) | blanco |

| Estado de la cita | Color | Texto dentro |
|---|---|---|
| Pendiente | `#B8862E` (Ocre) | Tinta |
| Confirmada | `#4F7391` (Pizarra) | blanco |
| Completada | `#4A7A63` (Salvia) | blanco |
| Cancelada | `#B05646` (Arcilla) | blanco |

Estos valores están en [`apps/web/lib/viz.ts`](../apps/web/lib/viz.ts) y en [`apps/web/components/DashboardCharts.tsx`](../apps/web/components/DashboardCharts.tsx).

## Contraste (WCAG 2.1)

Todas las parejas de uso habitual cumplen AA: 4.5:1 para el texto normal y 3:1 para iconos y texto grande.

| Tema | Pareja | Contraste | |
|---|---|---|---|
| Claro | Texto principal (slate-900) sobre fondo | 15.9:1 | ✅ |
| Claro | Texto secundario (slate-500) sobre fondo | 4.92:1 | ✅ |
| Claro | Texto secundario (slate-500) sobre superficie | 5.41:1 | ✅ |
| Claro | Iconos (slate-400) sobre superficie | 3.39:1 | ✅ |
| Claro | Enlaces (brand-700) sobre fondo | 10.27:1 | ✅ |
| Claro | Blanco sobre botón primario (brand-600) | 11.78:1 | ✅ |
| Claro | Error: red-700 sobre red-50 | 6.99:1 | ✅ |
| Claro | Insignias 800 sobre 100 (Arcilla, Salvia, Ocre, Pizarra) | 6.24–8.53:1 | ✅ |
| Oscuro | Texto principal (slate-900) sobre fondo | 16.03:1 | ✅ |
| Oscuro | Texto secundario (slate-500) sobre fondo | 6.32:1 | ✅ |
| Oscuro | Iconos (slate-400) sobre superficie | 3.8:1 | ✅ |
| Oscuro | Enlaces (brand-700) sobre fondo | 9.28:1 | ✅ |
| Oscuro | Blanco sobre botón primario (brand-600) | 7.79:1 | ✅ |
| Oscuro | Insignias 800 sobre 100 | 8.79–8.93:1 | ✅ |
| Ambos | Marfil sobre botón de acento (Arcilla) | 5.82:1 | ✅ |
| Ambos | Acento claro sobre fondo de la portada | 7.34:1 | ✅ |

## Cómo cambiar un color

1. Edita los tokens en `apps/web/app/globals.css`. Hay tres bloques: claro, oscuro por sistema y oscuro forzado. Los dos oscuros deben ser iguales.
2. Comprueba el contraste de las parejas de la tabla anterior. Cualquier comprobador WCAG sirve.
3. Si añades un token nuevo, regístralo en `tailwind.config.ts` y documéntalo aquí.
4. Después de tocar `tailwind.config.ts`, reinicia el servidor de desarrollo, porque no recarga esa configuración solo.
