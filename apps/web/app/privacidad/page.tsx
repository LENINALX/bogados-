import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidad | Bogados",
  description: "Información sobre el tratamiento de datos personales de clientes de los despachos que usan Bogados.",
};

const sections = [
  {
    title: "Quién es responsable",
    paragraphs: [
      "El despacho que lleva tu asunto decide para qué y cómo se usan tus datos y es el responsable del tratamiento. Bogados proporciona la plataforma y trata la información por cuenta del despacho y siguiendo sus instrucciones. Para consultas o solicitudes, dirígete a tu abogado o al despacho mediante los datos de contacto que aparecen en tu portal.",
      "Esta política describe el uso de Bogados para gestionar la relación entre el despacho y sus clientes. El despacho puede facilitarte información adicional cuando la naturaleza de tu asunto lo requiera.",
    ],
  },
  {
    title: "Qué datos se tratan y para qué",
    paragraphs: [
      "Identificación y contacto: nombre, correo electrónico y datos de cuenta, para identificarte, habilitar el portal y comunicarnos contigo.",
      "Información del asunto: descripción, tipo y estado del caso, número de proceso, escritos, pruebas y otros datos que tú o el despacho incorporen al expediente. Puede incluir datos personales sensibles o información de terceros; comparte solo lo necesario y avisa al despacho si tienes dudas.",
      "Documentos y comunicaciones: archivos, mensajes, notas, solicitudes, citas y tareas relacionados con tu asunto, para prestarte el servicio jurídico, coordinar el trabajo y mostrarte los avances y documentos que el despacho decida compartir contigo.",
      "Datos de seguridad y acceso: fecha y hora, correo ingresado, resultado y motivo del intento, dirección IP y navegador o dispositivo. Se usan para autenticar cuentas, prevenir abusos, investigar accesos sospechosos y proteger el servicio. También se registran intentos con correos que no corresponden a una cuenta.",
    ],
  },
  {
    title: "Quién puede ver la información",
    paragraphs: [
      "Dentro del despacho, solo el personal autorizado que necesita los datos para atenderte, de acuerdo con su función y los permisos de la plataforma. Tú puedes consultar tus propios asuntos y únicamente los documentos y notas que el despacho haya habilitado para el portal; las notas internas no se muestran.",
      "Bogados trata los datos para operar y mantener la plataforma. Personal técnico autorizado podría acceder cuando sea necesario para prestar soporte, mantener la seguridad o cumplir obligaciones, con acceso limitado a esa finalidad. También pueden intervenir proveedores técnicos necesarios para alojar el servicio o enviar comunicaciones, sujetos a obligaciones de confidencialidad y protección de datos.",
      "No se publican tus documentos ni se hacen accesibles mediante enlaces abiertos. La información puede comunicarse cuando lo exija una obligación legal o sea necesario para la defensa de derechos, con los límites aplicables.",
    ],
  },
  {
    title: "Cuánto tiempo se conservan",
    paragraphs: [
      "Los registros de acceso asociados a cuentas se conservan hasta 180 días. Los intentos de acceso con correos que no corresponden a una cuenta se conservan hasta 30 días. El sistema programa su eliminación automática cada noche; el borrado efectivo puede ocurrir en la siguiente ejecución.",
      "Los expedientes, documentos, mensajes y demás información del asunto no tienen un plazo único de eliminación automática: el despacho los conserva mientras sean necesarios para prestar el servicio y, después, durante los plazos exigidos por obligaciones legales o necesarios para atender responsabilidades y defender reclamaciones. El despacho debe aplicar esos plazos a cada expediente y eliminar o anonimizar los datos cuando ya no exista una razón válida para conservarlos.",
      "Los plazos concretos del expediente dependen del tipo de asunto y de las obligaciones profesionales y legales del despacho. Puedes pedir información sobre el plazo aplicable a tu caso.",
    ],
  },
  {
    title: "Tus derechos y cómo ejercerlos",
    paragraphs: [
      "Conforme a la Ley Orgánica de Protección de Datos Personales de Ecuador (LOPDP), puedes solicitar al despacho, según corresponda, acceso a tus datos, rectificación o actualización, eliminación, oposición, suspensión del tratamiento y portabilidad; también puedes retirar un consentimiento cuando el tratamiento se base en él. El ejercicio de un derecho puede estar sujeto a excepciones legales, por ejemplo, cuando sea necesario conservar información para cumplir una obligación o atender una reclamación.",
      "Envía tu solicitud al despacho mediante el correo o teléfono que aparece en el portal, o contacta directamente a tu abogado. Indica el derecho que deseas ejercer, el asunto al que se refiere y un medio seguro para que el despacho pueda verificar tu identidad. No envíes documentos de identidad ni información sensible salvo que te los soliciten por un canal adecuado. El despacho atenderá la solicitud dentro del plazo legal y te explicará si necesita más información o si existe una excepción.",
      "Si consideras que tu solicitud no fue atendida adecuadamente, puedes presentar una reclamación ante la Superintendencia de Protección de Datos Personales de Ecuador, sin perjuicio de otros recursos previstos por la ley.",
    ],
  },
  {
    title: "Seguridad y cambios",
    paragraphs: [
      "El despacho y Bogados aplican medidas organizativas y técnicas para proteger la información y limitar el acceso según las funciones autorizadas. Ningún medio de transmisión o almacenamiento puede garantizar seguridad absoluta; si detectas un acceso que no reconoces, avisa cuanto antes al despacho.",
      "Esta política puede actualizarse si cambian el servicio o las obligaciones aplicables. La versión vigente estará disponible en esta página.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-canvas px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-medium text-brand-700 hover:underline">
          Bogados
        </Link>
        <header className="mt-8 border-b border-slate-900/[0.08] pb-7">
          <p className="text-sm font-semibold text-brand-700">Privacidad y datos personales</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-slate-900">
            Política de privacidad para clientes
          </h1>
          <p className="mt-4 leading-relaxed text-slate-600">
            Esta política explica cómo se trata la información personal al usar el portal de clientes de Bogados con tu
            despacho, de conformidad con la LOPDP de Ecuador.
          </p>
        </header>

        <div className="divide-y divide-slate-900/[0.08]">
          {sections.map(({ title, paragraphs }) => (
            <section key={title} className="py-7">
              <h2 className="font-display text-xl font-medium text-slate-900">{title}</h2>
              <div className="mt-3 space-y-3 text-[0.9375rem] leading-7 text-slate-600">
                {paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-5 border-t border-slate-900/[0.08] pt-5 text-xs leading-relaxed text-slate-500">
          Información general de la plataforma; no sustituye el aviso de privacidad ni las instrucciones específicas
          del despacho responsable para tu caso.
        </p>
      </article>
    </main>
  );
}
