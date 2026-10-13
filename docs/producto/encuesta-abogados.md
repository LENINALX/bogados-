# Encuesta: qué necesita resolver un abogado en Ecuador

Esta encuesta valida las hipótesis de la [propuesta de producto](propuesta.md). No pregunta por la persona (edad, ciudad, años de ejercicio), sino por **la necesidad que la plataforma web debe resolver**: cuánto trabajo genera el seguimiento, qué le duele y qué esperaría que la plataforma hiciera por él. Tiene 33 preguntas y se responde en unos 10 minutos.

- **Para crearla en Google Forms sin copiar nada a mano:** usa el script [`crear-encuesta.gs`](crear-encuesta.gs). Las instrucciones están en la sección 4.
- **Para distribuirla:** hay mensajes listos para enviar en la sección 5.
- **Para interpretar las respuestas:** las reglas de decisión están en la sección 3.

---

## 1. Texto de presentación (descripción del formulario)

> Somos estudiantes de la Universidad Laica Eloy Alfaro de Manabí y estamos desarrollando **Bogados**, una plataforma web para el seguimiento de procesos judiciales, el control de términos y la comunicación con los clientes.
>
> Queremos saber qué necesita resolver en su día a día para que la plataforma haga justo eso. La encuesta dura unos 10 minutos y es **anónima**: no le preguntamos datos personales, solo cómo trabaja y qué le haría falta.
>
> Las respuestas se usarán solo para diseñar la plataforma y para fines académicos. No se compartirán con terceros. ¡Gracias por su tiempo!

## 2. Preguntas

Tipos de pregunta:
- **Única:** una sola opción.
- **Múltiple:** varias opciones (casillas).
- **Escala:** del 1 al 5.
- **Cuadrícula:** varias filas con las mismas columnas.
- **Número** y **texto:** respuesta libre.

Las preguntas marcadas como *opcional* no son obligatorias.

### A. Su carga de trabajo

Solo lo necesario para dimensionar el problema: el volumen de procesos, las materias (qué términos debe soportar la plataforma) y quién más trabaja en el seguimiento (si hacen falta funciones de equipo).

| # | Pregunta | Tipo | Opciones |
|---|---|---|---|
| 1 | ¿Cuántos procesos judiciales activos lleva en este momento? | Única | Ninguno · 1 a 10 · 11 a 30 · 31 a 60 · 61 a 100 · Más de 100 |
| 2 | ¿En qué materias se concentran sus procesos? | Múltiple + «Otra» | Laboral · Civil · Familia, niñez y adolescencia · Penal · Tránsito · Inquilinato · Constitucional · Contencioso administrativo · Tributario · Societario y mercantil |
| 3 | ¿Quién más participa en el seguimiento de sus procesos? | Múltiple | Solo yo · Un asistente o secretario/a · Otros abogados del despacho · Practicantes o pasantes |

### B. Seguimiento de procesos (dolor D1)

| # | Pregunta | Tipo | Opciones |
|---|---|---|---|
| 4 | ¿Cómo se entera de los movimientos de sus procesos? | Múltiple + «Otra» | Consultando el SATJE en la web · Por el casillero judicial electrónico (correo) · Acudiendo a la judicatura · Me avisa mi asistente · Me avisa el cliente u otra parte |
| 5 | ¿Con qué frecuencia revisa el SATJE? | Única | Varias veces al día · Una vez al día · Varias veces por semana · Una vez por semana · Menos de una vez por semana · No lo uso |
| 6 | ¿Cuántas horas a la semana dedica, usted o su equipo, a revisar movimientos de procesos? | Única | Menos de 1 hora · 1 a 2 horas · 3 a 5 horas · 6 a 10 horas · Más de 10 horas |
| 7 | En el último año, ¿cuántas veces se enteró tarde de una providencia o de un movimiento importante? | Única | Nunca · Una vez · 2 a 5 veces · Más de 5 veces · Prefiero no responder |
| 8 | ¿Cuánto problema le supone hoy el seguimiento de sus procesos? | Escala 1–5 | 1 = Ninguno · 5 = Mucho |

### C. Control de términos (dolor D2)

| # | Pregunta | Tipo | Opciones |
|---|---|---|---|
| 9 | ¿Cómo calcula y registra los términos y plazos? | Múltiple + «Otra» | De memoria · Agenda o calendario en papel · Hoja de Excel o Google Sheets · Calendario del móvil o del ordenador · Un software de gestión legal · Lo hace mi asistente |
| 10 | ¿Ha tenido dudas o errores al calcular un término (días hábiles, feriados, traslados)? | Única | Nunca · He tenido dudas, pero no errores · Me equivoqué alguna vez, sin consecuencias · Me equivoqué alguna vez, con consecuencias · Prefiero no responder |
| 11 | Si un sistema le **propusiera** la fecha de vencimiento de un término y usted la confirmara, ¿cuánto confiaría en él? | Escala 1–5 | 1 = Nada · 5 = Totalmente |
| 12 | ¿Cuánto problema le supone hoy el control de términos? | Escala 1–5 | 1 = Ninguno · 5 = Mucho |

### D. Comunicación con los clientes (dolor D3)

| # | Pregunta | Tipo | Opciones |
|---|---|---|---|
| 13 | ¿Cuántas consultas del tipo «¿cómo va mi caso?» recibe a la semana? | Única | 0 a 5 · 6 a 10 · 11 a 20 · 21 a 40 · Más de 40 |
| 14 | ¿Por qué medios le hacen esas consultas? | Múltiple + «Otra» | WhatsApp · Llamada telefónica · En persona · Correo electrónico · Redes sociales |
| 15 | ¿Cuánto tiempo a la semana dedica a informar a sus clientes sobre el estado de sus casos? | Única | Menos de 1 hora · 1 a 2 horas · 3 a 5 horas · Más de 5 horas |
| 16 | ¿Cuánto problema le supone mantener informados a sus clientes? | Escala 1–5 | 1 = Ninguno · 5 = Mucho |

### E. Lo que esperaría de la plataforma

Descripción de la sección: *«Estas respuestas deciden qué hace la plataforma y qué ve al entrar.»*

| # | Pregunta | Tipo | Opciones |
|---|---|---|---|
| 17 | ¿Qué le gustaría que la plataforma hiciera por usted automáticamente? | Múltiple + «Otra», **máximo 3** | Avisarme cuando hay un movimiento en mis procesos · Calcular el vencimiento de los términos · Recordarme los vencimientos antes de que lleguen · Avisar a mis clientes del avance de su caso · Organizar los documentos de cada caso · Agendar citas con mis clientes · Preparar borradores de escritos · Emitir facturas electrónicas (SRI) |
| 18 | Al abrir la plataforma cada mañana, ¿qué necesitaría ver primero? | Múltiple, **máximo 3** | Los términos que vencen hoy y esta semana · Los movimientos nuevos en mis procesos · Las citas del día · Los mensajes de mis clientes · Las tareas pendientes del equipo · Un resumen de mis casos por estado |
| 19 | ¿Desde dónde usaría más la plataforma? | Única | Desde el ordenador · Desde el móvil · Desde ambos por igual |
| 20 | ¿Qué herramientas usa hoy para gestionar su trabajo? | Múltiple + «Otra» | Excel o Google Sheets · Carpetas de Word o en el ordenador · Agenda en papel · Google Calendar u Outlook · Un software de gestión legal · Ninguna en particular |
| 21 | Si usa un software de gestión legal, ¿cuál es y qué le falta? | Texto largo (*opcional*) | |
| 22 | Si sus clientes recibieran avisos automáticos sobre sus casos, ¿por qué canal los preferiría? | Única | WhatsApp · Correo electrónico · SMS · Que lo consulten en un portal web · Prefiero no enviar avisos automáticos |
| 23 | ¿Qué le preocuparía de usar un sistema en la nube para sus casos? | Múltiple + «Otra» | La confidencialidad de la información · Que el sistema no esté disponible cuando lo necesito · El costo · Aprender a usarlo · Que mis datos se usen para otros fines · Nada en particular |
| 24 | ¿Qué importancia tendría para usted cada una de estas funciones? | Cuadrícula | **Filas:** Vigilar automáticamente mis procesos en el SATJE · Calcular términos en días hábiles con los feriados · Avisar automáticamente a mis clientes · Portal donde el cliente vea su caso y documentos · Agenda de citas con mis clientes · Gestión de documentos del caso · Facturación electrónica (SRI) · Plantillas de escritos · Estadísticas del despacho · App para el móvil<br>**Columnas:** Nada importante · Poco importante · Importante · Imprescindible |

### F. Precio

Descripción de la sección: *«No hay respuestas correctas: queremos saber qué le parecería razonable. Los precios son mensuales, en dólares y por abogado.»*

| # | Pregunta | Tipo | Opciones |
|---|---|---|---|
| 25 | ¿Pagaría una suscripción mensual por una herramienta que resolviera lo que más le preocupa de lo anterior? | Única | Sí · Depende del precio · No |
| 26 | ¿A qué precio mensual le parecería **tan barata** que dudaría de su calidad? | Número | |
| 27 | ¿A qué precio mensual le parecería **una buena compra**? | Número | |
| 28 | ¿A qué precio mensual empezaría a parecerle **cara**, aunque todavía la consideraría? | Número | |
| 29 | ¿A qué precio mensual sería **tan cara** que no la consideraría? | Número | |

### G. Cierre

| # | Pregunta | Tipo | Opciones |
|---|---|---|---|
| 30 | ¿Qué es lo que más tiempo le hace perder en su trabajo diario? | Texto largo (*opcional*) | |
| 31 | Si la plataforma pudiera resolver una sola cosa de su trabajo, ¿cuál sería? | Texto largo (*opcional*) | |
| 32 | ¿Le gustaría participar en una prueba gratuita de Bogados o en una entrevista de 30 minutos? | Única | Sí, en la prueba gratuita · Sí, en una entrevista · En ambas · No, gracias |
| 33 | Si respondió que sí, déjenos su nombre y su WhatsApp o correo | Texto corto (*opcional*). Ayuda: «Solo lo usaremos para contactarle sobre la prueba o la entrevista.» | |

## 3. Cómo interpretar las respuestas

### Segmentos

Analiza primero **todas** las respuestas y después solo el **cliente objetivo**: quienes llevan **11 o más procesos activos** (P1). Si los dos grupos dan resultados distintos, manda el del cliente objetivo.

P3 indica si la plataforma debe priorizar el trabajo en equipo: si la mayoría responde «Solo yo», el MVP se diseña para un abogado individual.

### Umbrales por hipótesis

| Hipótesis | Se confirma si… | Si no se confirma |
|---|---|---|
| **D1: vigilar el SATJE duele** | ≥ 60 % revisa el SATJE varias veces por semana o más (P5) **y** (≥ 50 % dedica 3 horas o más a la semana (P6) **o** ≥ 40 % se enteró tarde al menos una vez (P7)) **y** la media de P8 es ≥ 3,5 | La vigilancia automática deja de ser el núcleo; pasa a ser una función más |
| **D2: calcular términos duele** | ≥ 50 % calcula sin software (P9) **y** ≥ 40 % ha tenido dudas o errores (P10) **y** la media de P12 es ≥ 3,5 | El asistente de términos baja de prioridad |
| **Confianza en el asistente** | La media de P11 es ≥ 3,5 | El asistente debe mostrar siempre cómo calculó la fecha (días contados, feriados descontados) para ganar confianza |
| **D3: informar al cliente duele** | ≥ 50 % recibe 11 o más consultas a la semana (P13) **y** la media de P16 es ≥ 3,5 | Los avisos al cliente pasan a ser un complemento |

### Decisiones de la plataforma

| Pregunta | Qué decide |
|---|---|
| **P17**: qué debe hacer sola | Las 3 opciones más elegidas son el núcleo del MVP. Si no coinciden con D1–D3, se revisa la propuesta |
| **P18**: qué ver al entrar | El contenido y el orden del **panel de inicio**: lo más elegido va arriba |
| **P19**: ordenador o móvil | Si gana el móvil, el diseño del MVP empieza por la pantalla del móvil (*mobile first*) |
| **P22**: canal de aviso | Gana la opción mayoritaria. Si es WhatsApp, hay que presupuestar la API de WhatsApp Business |
| **P23**: preocupaciones | Las 2 más elegidas deben responderse en la portada y en la demostración (por ejemplo, confidencialidad → explicar el aislamiento por firma) |
| **P24**: importancia de funciones | Confirma P17. Si una función fuera del núcleo, como la facturación SRI, sale como «Imprescindible» para la mayoría, se revisa la hoja de ruta |
| **P25**: disposición a pagar | Si menos del 50 % responde «Sí» o «Depende del precio», se replantea el modelo (por ejemplo, pago por proceso vigilado) |

Con **menos de 15 respuestas**, toma los resultados como **orientativos** y da más peso a la entrevista con el abogado colaborador. Las respuestas abiertas (P21, P30 y P31) son las más valiosas cuando la muestra es pequeña: léelas todas y agrúpalas por temas.

### Precio (método Van Westendorp)

Las preguntas 26 a 29 permiten estimar un rango de precio aceptable:
1. Ordena las respuestas de cada pregunta y calcula, para cada precio, el porcentaje de personas que lo considera «tan barato», «barato», «caro» o «demasiado caro».
2. El **rango aceptable** está entre el punto donde se cruzan las curvas de «barato» y «demasiado caro», y el punto donde se cruzan las de «tan barato» y «caro».

Con pocas respuestas, una aproximación válida es usar la **mediana de P27** como precio de referencia y la **mediana de P28** como techo.

## 4. Crear la encuesta en Google Forms

1. Entra en [script.google.com](https://script.google.com) con la cuenta de Google del equipo y crea un **Proyecto nuevo**.
2. Borra el contenido, pega el de [`crear-encuesta.gs`](crear-encuesta.gs) y guarda.
3. Elige la función `crearEncuestaBogados` y pulsa **Ejecutar**. La primera vez, Google pedirá permiso para crear formularios y hojas de cálculo en tu cuenta.
4. En el **Registro de ejecución** aparecerán tres enlaces:
   - el formulario para responder, que es el que se comparte;
   - el formulario para editar;
   - la hoja de cálculo donde llegan las respuestas.
5. Revisa el formulario antes de compartirlo. Puedes cambiar cualquier texto desde el editor de Google Forms.

## 5. Distribución

Con pocos contactos, la clave es el **muestreo por referidos**: cada abogado que responde reenvía la encuesta a colegas.

1. **El abogado colaborador** la responde primero y la reenvía a 5–10 colegas, con su nombre como referencia.
2. **Docentes de la Facultad de Derecho de la ULEAM** que ejercen: pídeles que la compartan en sus grupos.
3. **El colegio de abogados de la provincia** y los grupos de abogados en Facebook, WhatsApp y LinkedIn.
4. **Recordatorio a los 4 o 5 días** a quienes no hayan respondido.

**Mensaje para WhatsApp** (para que lo reenvíe el abogado colaborador):

> Hola, [nombre]. Te escribo porque unos estudiantes de la ULEAM están creando una herramienta para que los abogados no tengamos que revisar el SATJE a mano ni calcular términos de cabeza. Me pidieron ayuda para saber cómo trabajamos. Son 10 minutos y es anónima: [enlace]. Si la puedes reenviar a otros colegas, mejor. ¡Gracias!

**Mensaje para correo o LinkedIn:**

> Asunto: 10 minutos para mejorar cómo gestionamos los procesos judiciales
>
> Estimado/a abogado/a:
>
> Somos estudiantes de la Universidad Laica Eloy Alfaro de Manabí y estamos desarrollando Bogados, una herramienta para el seguimiento de procesos en el SATJE, el control de términos y la comunicación con los clientes.
>
> Nos ayudaría mucho conocer su experiencia en esta encuesta anónima de 10 minutos: [enlace]
>
> Si le interesa, al final puede apuntarse a una prueba gratuita. Muchas gracias por su tiempo.
>
> Equipo Bogados

**Sesgo a tener en cuenta:** los referidos suelen parecerse al abogado que los recomienda (misma ciudad, misma materia). Indica siempre cuántas respuestas hay y de qué perfiles al presentar los resultados.
