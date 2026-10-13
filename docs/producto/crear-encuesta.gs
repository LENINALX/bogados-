/**
 * Crea en Google Forms la encuesta sobre las necesidades de los abogados que resolverá Bogados (docs/producto/encuesta-abogados.md)
 * y una hoja de cálculo donde llegan las respuestas.
 *
 * Uso: script.google.com → Proyecto nuevo → pegar este archivo → ejecutar crearEncuestaBogados.
 * Los enlaces aparecen en el Registro de ejecución.
 *
 * Las preguntas, su orden y sus opciones son las mismas que en encuesta-abogados.md:
 * si cambias una, cambia la otra.
 */
function crearEncuestaBogados() {
  const form = FormApp.create("Qué necesita resolver un abogado en Ecuador: encuesta Bogados");
  form
    .setDescription(
      "Somos estudiantes de la Universidad Laica Eloy Alfaro de Manabí y estamos desarrollando Bogados, " +
        "una plataforma web para el seguimiento de procesos judiciales, el control de términos y la comunicación con los clientes.\n\n" +
        "Queremos saber qué necesita resolver en su día a día para que la plataforma haga justo eso. " +
        "La encuesta dura unos 10 minutos y es anónima: no le preguntamos datos personales, " +
        "solo cómo trabaja y qué le haría falta.\n\n" +
        "Las respuestas se usarán solo para diseñar la plataforma y para fines académicos. No se compartirán con terceros. " +
        "¡Gracias por su tiempo!",
    )
    .setProgressBar(true)
    .setCollectEmail(false)
    .setAllowResponseEdits(false)
    .setShowLinkToRespondAgain(false)
    .setConfirmationMessage(
      "¡Gracias! Sus respuestas nos ayudan a construir una herramienta útil de verdad. " +
        "Si conoce a otros abogados a quienes les pueda interesar, le agradeceremos que les reenvíe la encuesta.",
    );

  // ── Ayudantes ──────────────────────────────
  const unica = (titulo, opciones, { otra = false, requerida = true } = {}) => {
    const item = form.addMultipleChoiceItem().setTitle(titulo).setChoiceValues(opciones).setRequired(requerida);
    if (otra) item.showOtherOption(true);
    return item;
  };
  const multiple = (titulo, opciones, { otra = false, requerida = true } = {}) => {
    const item = form.addCheckboxItem().setTitle(titulo).setChoiceValues(opciones).setRequired(requerida);
    if (otra) item.showOtherOption(true);
    return item;
  };
  const escala = (titulo, minimo, maximo) =>
    form.addScaleItem().setTitle(titulo).setBounds(1, 5).setLabels(minimo, maximo).setRequired(true);
  const textoLargo = (titulo) => form.addParagraphTextItem().setTitle(titulo).setRequired(false);
  const precio = (titulo) =>
    form
      .addTextItem()
      .setTitle(titulo)
      .setHelpText("Escriba solo el número en dólares, por ejemplo 15")
      .setRequired(true)
      .setValidation(
        FormApp.createTextValidation()
          .requireNumberGreaterThanOrEqualTo(0)
          .setHelpText("Escriba un número en dólares, sin el símbolo $")
          .build(),
      );
  const seccion = (titulo, descripcion) => {
    const item = form.addPageBreakItem().setTitle(titulo);
    if (descripcion) item.setHelpText(descripcion);
  };

  // ── A. Su carga de trabajo ─────────────────
  // Solo lo necesario para dimensionar el problema: volumen, materias (qué términos soportar) y equipo
  form.addSectionHeaderItem().setTitle("A. Su carga de trabajo");
  unica("1. ¿Cuántos procesos judiciales activos lleva en este momento?", [
    "Ninguno",
    "1 a 10",
    "11 a 30",
    "31 a 60",
    "61 a 100",
    "Más de 100",
  ]);
  multiple(
    "2. ¿En qué materias se concentran sus procesos?",
    [
      "Laboral",
      "Civil",
      "Familia, niñez y adolescencia",
      "Penal",
      "Tránsito",
      "Inquilinato",
      "Constitucional",
      "Contencioso administrativo",
      "Tributario",
      "Societario y mercantil",
    ],
    { otra: true },
  );
  multiple("3. ¿Quién más participa en el seguimiento de sus procesos?", [
    "Solo yo",
    "Un asistente o secretario/a",
    "Otros abogados del despacho",
    "Practicantes o pasantes",
  ]);

  // ── B. Seguimiento de procesos ─────────────
  seccion("B. Seguimiento de procesos", "Cómo se entera hoy de lo que pasa en sus procesos.");
  multiple(
    "4. ¿Cómo se entera de los movimientos de sus procesos?",
    [
      "Consultando el SATJE en la web",
      "Por el casillero judicial electrónico (correo)",
      "Acudiendo a la judicatura",
      "Me avisa mi asistente",
      "Me avisa el cliente u otra parte",
    ],
    { otra: true },
  );
  unica("5. ¿Con qué frecuencia revisa el SATJE?", [
    "Varias veces al día",
    "Una vez al día",
    "Varias veces por semana",
    "Una vez por semana",
    "Menos de una vez por semana",
    "No lo uso",
  ]);
  unica("6. ¿Cuántas horas a la semana dedica, usted o su equipo, a revisar movimientos de procesos?", [
    "Menos de 1 hora",
    "1 a 2 horas",
    "3 a 5 horas",
    "6 a 10 horas",
    "Más de 10 horas",
  ]);
  unica("7. En el último año, ¿cuántas veces se enteró tarde de una providencia o de un movimiento importante?", [
    "Nunca",
    "Una vez",
    "2 a 5 veces",
    "Más de 5 veces",
    "Prefiero no responder",
  ]);
  escala("8. ¿Cuánto problema le supone hoy el seguimiento de sus procesos?", "Ninguno", "Mucho");

  // ── C. Control de términos ─────────────────
  seccion("C. Control de términos");
  multiple(
    "9. ¿Cómo calcula y registra los términos y plazos?",
    [
      "De memoria",
      "Agenda o calendario en papel",
      "Hoja de Excel o Google Sheets",
      "Calendario del móvil o del ordenador",
      "Un software de gestión legal",
      "Lo hace mi asistente",
    ],
    { otra: true },
  );
  unica("10. ¿Ha tenido dudas o errores al calcular un término (días hábiles, feriados, traslados)?", [
    "Nunca",
    "He tenido dudas, pero no errores",
    "Me equivoqué alguna vez, sin consecuencias",
    "Me equivoqué alguna vez, con consecuencias",
    "Prefiero no responder",
  ]);
  escala(
    "11. Si un sistema le propusiera la fecha de vencimiento de un término y usted la confirmara, ¿cuánto confiaría en él?",
    "Nada",
    "Totalmente",
  );
  escala("12. ¿Cuánto problema le supone hoy el control de términos?", "Ninguno", "Mucho");

  // ── D. Comunicación con los clientes ───────
  seccion("D. Comunicación con los clientes");
  unica("13. ¿Cuántas consultas del tipo «¿cómo va mi caso?» recibe a la semana?", [
    "0 a 5",
    "6 a 10",
    "11 a 20",
    "21 a 40",
    "Más de 40",
  ]);
  multiple(
    "14. ¿Por qué medios le hacen esas consultas?",
    ["WhatsApp", "Llamada telefónica", "En persona", "Correo electrónico", "Redes sociales"],
    { otra: true },
  );
  unica("15. ¿Cuánto tiempo a la semana dedica a informar a sus clientes sobre el estado de sus casos?", [
    "Menos de 1 hora",
    "1 a 2 horas",
    "3 a 5 horas",
    "Más de 5 horas",
  ]);
  escala("16. ¿Cuánto problema le supone mantener informados a sus clientes?", "Ninguno", "Mucho");

  // ── E. Lo que esperaría de la plataforma ───
  seccion("E. Lo que esperaría de la plataforma", "Estas respuestas deciden qué hace la plataforma y qué ve al entrar.");
  multiple(
    "17. ¿Qué le gustaría que la plataforma hiciera por usted automáticamente?",
    [
      "Avisarme cuando hay un movimiento en mis procesos",
      "Calcular el vencimiento de los términos",
      "Recordarme los vencimientos antes de que lleguen",
      "Avisar a mis clientes del avance de su caso",
      "Organizar los documentos de cada caso",
      "Agendar citas con mis clientes",
      "Preparar borradores de escritos",
      "Emitir facturas electrónicas (SRI)",
    ],
    { otra: true },
  ).setHelpText("Elija hasta 3: las que más le ahorrarían trabajo.")
    .setValidation(FormApp.createCheckboxValidation().requireSelectAtMost(3).setHelpText("Elija como máximo 3 opciones").build());
  multiple(
    "18. Al abrir la plataforma cada mañana, ¿qué necesitaría ver primero?",
    [
      "Los términos que vencen hoy y esta semana",
      "Los movimientos nuevos en mis procesos",
      "Las citas del día",
      "Los mensajes de mis clientes",
      "Las tareas pendientes del equipo",
      "Un resumen de mis casos por estado",
    ],
  ).setHelpText("Elija hasta 3.")
    .setValidation(FormApp.createCheckboxValidation().requireSelectAtMost(3).setHelpText("Elija como máximo 3 opciones").build());
  unica("19. ¿Desde dónde usaría más la plataforma?", ["Desde el ordenador", "Desde el móvil", "Desde ambos por igual"]);
  multiple(
    "20. ¿Qué herramientas usa hoy para gestionar su trabajo?",
    [
      "Excel o Google Sheets",
      "Carpetas de Word o en el ordenador",
      "Agenda en papel",
      "Google Calendar u Outlook",
      "Un software de gestión legal",
      "Ninguna en particular",
    ],
    { otra: true },
  );
  textoLargo("21. Si usa un software de gestión legal, ¿cuál es y qué le falta?");
  unica("22. Si sus clientes recibieran avisos automáticos sobre sus casos, ¿por qué canal los preferiría?", [
    "WhatsApp",
    "Correo electrónico",
    "SMS",
    "Que lo consulten en un portal web",
    "Prefiero no enviar avisos automáticos",
  ]);
  multiple(
    "23. ¿Qué le preocuparía de usar un sistema en la nube para sus casos?",
    [
      "La confidencialidad de la información",
      "Que el sistema no esté disponible cuando lo necesito",
      "El costo",
      "Aprender a usarlo",
      "Que mis datos se usen para otros fines",
      "Nada en particular",
    ],
    { otra: true },
  );
  form
    .addGridItem()
    .setTitle("24. ¿Qué importancia tendría para usted cada una de estas funciones?")
    .setRows([
      "Vigilar automáticamente mis procesos en el SATJE",
      "Calcular términos en días hábiles con los feriados",
      "Avisar automáticamente a mis clientes",
      "Portal donde el cliente vea su caso y documentos",
      "Agenda de citas con mis clientes",
      "Gestión de documentos del caso",
      "Facturación electrónica (SRI)",
      "Plantillas de escritos",
      "Estadísticas del despacho",
      "App para el móvil",
    ])
    .setColumns(["Nada importante", "Poco importante", "Importante", "Imprescindible"])
    .setRequired(true);

  // ── F. Precio ──────────────────────────────
  seccion(
    "F. Precio",
    "No hay respuestas correctas: queremos saber qué le parecería razonable. Los precios son mensuales, en dólares y por abogado.",
  );
  unica(
    "25. ¿Pagaría una suscripción mensual por una herramienta que resolviera lo que más le preocupa de lo anterior?",
    ["Sí", "Depende del precio", "No"],
  );
  precio("26. ¿A qué precio mensual le parecería tan barata que dudaría de su calidad?");
  precio("27. ¿A qué precio mensual le parecería una buena compra?");
  precio("28. ¿A qué precio mensual empezaría a parecerle cara, aunque todavía la consideraría?");
  precio("29. ¿A qué precio mensual sería tan cara que no la consideraría?");

  // ── G. Cierre ──────────────────────────────
  seccion("G. Para terminar");
  textoLargo("30. ¿Qué es lo que más tiempo le hace perder en su trabajo diario?");
  textoLargo("31. Si la plataforma pudiera resolver una sola cosa de su trabajo, ¿cuál sería?");
  unica("32. ¿Le gustaría participar en una prueba gratuita de Bogados o en una entrevista de 30 minutos?", [
    "Sí, en la prueba gratuita",
    "Sí, en una entrevista",
    "En ambas",
    "No, gracias",
  ]);
  form
    .addTextItem()
    .setTitle("33. Si respondió que sí, déjenos su nombre y su WhatsApp o correo")
    .setHelpText("Solo lo usaremos para contactarle sobre la prueba o la entrevista.")
    .setRequired(false);

  // ── Hoja de respuestas ─────────────────────
  const hoja = SpreadsheetApp.create("Respuestas · Encuesta Bogados");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, hoja.getId());

  Logger.log("Formulario para responder (compártelo): " + form.getPublishedUrl());
  Logger.log("Formulario para editar: " + form.getEditUrl());
  Logger.log("Hoja de respuestas: " + hoja.getUrl());
}
