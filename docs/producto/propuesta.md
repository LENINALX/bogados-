# Bogados: propuesta de producto

> **Bogados vigila los procesos judiciales del despacho, calcula los términos en días hábiles y mantiene informado al cliente, para que ningún abogado pierda un plazo ni pase la tarde contestando «¿cómo va mi caso?».**

| | |
|---|---|
| **Estado** | Propuesta para validar. Las cifras de mercado y de precio son hipótesis. |
| **Versión** | 1.0 · octubre de 2026 |
| **Equipo** | Guzmán Chávez Gabriela Patricia · Mejía Chamorro Marcelo Israel · Plua Acosta Abigail Guadalupe · Suárez Carrera Lenin Alexander · Vélez Briones Gibson Jordan |
| **Asignatura** | Gestión de Proyectos de Software · Carrera de Software · Universidad Laica Eloy Alfaro de Manabí |
| **Documentos relacionados** | [Encuesta a abogados](encuesta-abogados.md) · [Guía de entrevista](guia-entrevista.md) · [Paleta de colores](../paleta-de-colores.md) |

---

## 1. Resumen ejecutivo

Hoy Bogados es un gestor de despacho completo: casos, documentos, mensajes, citas, plazos y portal del cliente. Está bien construido, pero se define por **lo que tiene** y no por **el problema que resuelve**. Esas mismas funciones las ofrecen productos internacionales con años de ventaja, así que con este enfoque no hay una razón clara para que un abogado ecuatoriano cambie su forma de trabajar.

Proponemos centrar el producto en un problema **local, frecuente y caro**: seguir los procesos judiciales en el SATJE, calcular los términos procesales y explicar al cliente cada movimiento. Es un trabajo manual, repetitivo y de alto riesgo, porque un término vencido puede costar el caso, y ninguna herramienta extranjera lo resuelve. El 80 % de lo construido se reutiliza; lo que cambia es el orden de prioridades y el mensaje.

Antes de construir el núcleo vamos a **validarlo**:
- con una entrevista en profundidad a nuestro abogado colaborador;
- con una encuesta estructurada que él y la facultad ayuden a distribuir;
- con una prueba técnica del SATJE.

Hay criterios explícitos para seguir, ajustar o cambiar de rumbo (sección 10).

## 2. El problema

### 2.1 Cómo trabaja hoy un abogado litigante (hipótesis)

1. Lleva entre 20 y 100 procesos activos en distintas judicaturas.
2. Revisa el SATJE **proceso por proceso**, a mano, varias veces por semana, para ver si hay providencias nuevas. También recibe notificaciones en su casillero judicial electrónico.
3. Cuando hay una providencia con término, lo calcula **de cabeza o en el calendario del móvil**, descontando fines de semana y feriados, que a veces se trasladan.
4. Anota el vencimiento en una agenda, un Excel o un grupo de WhatsApp consigo mismo.
5. Sus clientes le escriben por WhatsApp para preguntar «¿cómo va lo mío?», y él tiene que traducir la jerga procesal a lenguaje común, una y otra vez.

### 2.2 Los tres dolores que queremos resolver

| # | Dolor | Por qué importa | Hipótesis a validar |
|---|---|---|---|
| D1 | **Vigilar el SATJE a mano** | Consume tiempo todos los días, y pasar por alto una providencia puede hacer perder un término | Los abogados revisan el SATJE varias veces por semana y dedican a ello más de 2 horas semanales |
| D2 | **Calcular términos en días hábiles** | Un error de cálculo tiene consecuencias graves para el cliente y para el abogado | Calculan los términos sin una herramienta específica y alguna vez se han equivocado o han estado a punto |
| D3 | **Informar al cliente** | Son horas no facturables, interrupciones constantes y clientes ansiosos | Reciben más de 10 consultas de estado a la semana, sobre todo por WhatsApp |

## 3. Cliente objetivo

**Cliente principal:** abogados litigantes independientes y despachos pequeños, de 1 a 10 abogados, en Ecuador, en materias con muchos procesos y clientes particulares: laboral, civil, familia, inquilinato y tránsito.

**Mercado inicial:** Manabí (Manta y Portoviejo), donde el equipo tiene contactos a través de la ULEAM. Después, Guayaquil y Quito.

**Quién usa el producto:**
- **El abogado titular:** decide la compra y necesita control y tranquilidad.
- **El asistente o secretario:** hace la revisión diaria y necesita rapidez.
- **El cliente del despacho:** recibe avisos y necesita entender en qué punto está su caso.

**Fuera del objetivo inicial:** grandes estudios jurídicos con sistemas propios, departamentos legales de empresas y notarías.

## 4. Propuesta de valor

| Para el abogado | Para el despacho | Para el cliente |
|---|---|---|
| No vuelve a revisar el SATJE proceso por proceso | Visibilidad de todos los procesos y vencimientos del equipo | Sabe cómo va su caso sin tener que llamar |
| Los términos se calculan con el calendario de feriados aplicado | Menos riesgo de responsabilidad profesional | Recibe explicaciones en lenguaje claro |
| Menos interrupciones de los clientes | Una imagen más profesional ante los clientes | Tiene a mano sus documentos y citas |

## 5. La solución

### 5.1 El núcleo, lo que hace que alguien pague

1. **Vigilancia de procesos.** El abogado vincula el número de proceso a un caso. Bogados consulta periódicamente la información pública del SATJE y registra cada movimiento nuevo en la línea de tiempo del caso.
2. **Asistente de términos.** Cuando hay una providencia nueva, Bogados propone una tarea con su fecha de vencimiento calculada en días hábiles, por ejemplo: «Contestar en 3 días hábiles: vence el jueves 23». El abogado la **confirma o corrige**; nunca se crea sola. El calendario de feriados nacionales y locales lo mantiene el administrador.
3. **Aviso al cliente.** El abogado elige qué movimientos se comunican. El cliente recibe un email (y WhatsApp en una fase posterior) con una explicación clara del movimiento y del siguiente paso.

### 5.2 Lo que ya existe y cómo encaja

| Módulo actual | Papel en el nuevo enfoque | Prioridad |
|---|---|---|
| Casos, roles, multi-tenant, seguridad | Base del producto. No cambia | Mantener |
| Tareas y plazos | Se alimentan del asistente de términos | Ampliar |
| Línea de tiempo del caso | Recibe los movimientos del SATJE | Ampliar |
| Notificaciones y emails | Canal del aviso al cliente | Ampliar |
| Portal del cliente | Ficha que abre el enlace del aviso, no un lugar al que el cliente tenga que ir a mirar | Simplificar |
| Documentos y mensajes | Apoyo; se mantienen | Mantener |
| Citas y solicitud de caso | Captación de clientes nuevos (fase 3) | Congelar |
| Estadísticas | Se reorientan a «procesos vigilados» y «términos a tiempo» | Congelar |

### 5.3 Fuera de alcance por ahora

Facturación electrónica del SRI, firma electrónica, redacción de escritos con IA, app nativa e integración con calendarios externos. Son valiosas, pero no validan el núcleo.

## 6. Diferenciación

| | Gestores de despacho internacionales | Excel + WhatsApp + SATJE | **Bogados** |
|---|---|---|---|
| Conoce el SATJE y los términos ecuatorianos | ✗ | Manual | ✓ |
| Calendario de feriados de Ecuador | ✗ | Manual | ✓ |
| Avisos al cliente en lenguaje claro | Parcial | Manual | ✓ |
| Precio en USD pensado para despachos pequeños | Alto | Gratis, pero cuesta tiempo | Accesible |
| Datos aislados por firma y documentos privados | ✓ | ✗ | ✓ |

La ventaja defendible es **el conocimiento procesal local** convertido en producto: los términos, los feriados y los tipos de providencia. No depende del diseño ni del número de funciones.

## 7. Modelo de negocio (hipótesis)

| Plan | Para quién | Precio orientativo | Incluye |
|---|---|---|---|
| **Individual** | Abogado independiente | 15–25 USD/mes | Hasta 50 procesos vigilados, avisos por email |
| **Despacho** | 2–10 abogados | 12–20 USD/mes por abogado | Procesos ilimitados, equipo, panel del despacho |
| **Prueba** | Todos | 30 días gratis | Todo el plan Despacho |

El precio se ajustará con las preguntas de sensibilidad al precio de la encuesta (Van Westendorp). Para los primeros despachos piloto, el acceso es gratuito durante el piloto a cambio de feedback.

## 8. Métricas

**Métrica principal (North Star): procesos vigilados activos.** Mide la adopción real del núcleo.

| Métrica | Qué indica | Meta del piloto |
|---|---|---|
| Procesos vinculados por despacho | Adopción | ≥ 20 por despacho |
| Movimientos detectados sin revisar el SATJE a mano | Valor de D1 | ≥ 80 % de los movimientos reales |
| Términos propuestos que el abogado acepta sin corregir | Precisión de D2 | ≥ 90 % |
| Avisos al cliente enviados | Valor de D3 | ≥ 1 por proceso y mes |
| Despachos que siguen usándolo a las 4 semanas | Retención | ≥ 2 de 3 |

## 9. Riesgos y mitigación

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| El SATJE no se puede consultar de forma automática y estable (captcha, límites, cambios en la web) | Alto | Media | Prueba técnica antes de construir. Plan B: el abogado pega o reenvía la notificación del casillero electrónico y Bogados la interpreta |
| Un cálculo de término incorrecto | Alto | Media | El término siempre lo confirma el abogado, con un aviso claro. Calendario de feriados editable y pruebas automáticas del cálculo |
| Protección de datos (LOPDP) y secreto profesional | Alto | Baja | Bogados es encargado del tratamiento; contrato con el despacho; consentimiento del cliente para los avisos; datos aislados por firma (ya implementado) |
| Pocos abogados disponibles para validar | Medio | Alta | Abogado colaborador + muestreo por referidos + facultad de Derecho (ver plan de validación) |
| Coste de la API de WhatsApp Business | Medio | Media | Empezar por email; WhatsApp solo si la encuesta lo exige |

## 10. Plan de validación con un solo abogado

Tener un único abogado no bloquea la validación. Cambia el método: **profundidad con uno, amplitud con la encuesta**.

| Paso | Qué | Con quién | Resultado |
|---|---|---|---|
| 1 | **Entrevista en profundidad** (60 min) siguiendo la [guía](guia-entrevista.md), incluida la observación de cómo revisa el SATJE | Nuestro abogado colaborador | Flujo real, dolores concretos y ejemplos de providencias |
| 2 | **Encuesta** ([preguntas](encuesta-abogados.md)), distribuida por referidos: el abogado colaborador la reenvía a 5–10 colegas y cada respondiente puede reenviarla | Colegas del abogado colaborador | Datos de 15–30 abogados |
| 3 | **Amplificar la encuesta** | Docentes de la Facultad de Derecho de la ULEAM que ejercen, el colegio de abogados de la provincia, grupos de abogados en Facebook, WhatsApp y LinkedIn | Más respuestas y contactos para el piloto |
| 4 | **Prueba técnica del SATJE**, en paralelo | Equipo | Saber si la vigilancia automática es viable y legítima, o pasar al plan B |
| 5 | **Prototipo navegable** del núcleo, mostrado al abogado colaborador | Abogado colaborador | Confirmar que el flujo resuelve su caso real |

### Criterios de decisión

| Resultado | Decisión |
|---|---|
| D1 y D2 confirmados (ver umbrales en la encuesta) y el SATJE es viable | **Seguir:** construir el MVP del núcleo |
| D1 y D2 confirmados, pero el SATJE no es viable | **Ajustar:** MVP con el plan B (pegar o reenviar la notificación) |
| Solo se confirma D3 | **Cambiar de foco:** comunicación con el cliente como núcleo |
| No se confirma ningún dolor | **Replantear:** usar las respuestas abiertas para encontrar el problema real |

Con menos de 15 respuestas, los resultados se toman como **orientativos** y pesa más la entrevista y la observación.

## 11. Hoja de ruta

| Fase | Duración | Objetivo | Criterio de salida |
|---|---|---|---|
| **0. Validación** | 2–3 semanas | Entrevista, encuesta y prueba técnica del SATJE | Decisión según la sección 10 |
| **1. MVP del núcleo** | 6 semanas | Vincular proceso, detectar movimientos, asistente de términos, aviso por email | Funciona con los procesos reales del abogado colaborador |
| **2. Piloto** | 4 semanas | 3 despachos usándolo en su trabajo real | Metas de la sección 8 |
| **3. Crecimiento** | Siguiente semestre | Página pública del despacho, captación con solicitud de caso y citas, WhatsApp | Primeros despachos de pago |

## 12. Decisiones pendientes

1. Canal del aviso al cliente: email, WhatsApp o ambos. Depende de la encuesta (pregunta 22).
2. Viabilidad técnica de la consulta automática del SATJE. Depende de la prueba técnica.
3. Precio final. Depende de las preguntas de precio de la encuesta.
4. Primeras materias que soportará el asistente de términos. Dependen de las materias más frecuentes en las respuestas.
