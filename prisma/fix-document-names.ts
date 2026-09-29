/**
 * Corrige nombres de documentos guardados con tildes corrompidas ("ContrataciÃ³n")
 * antes de e741c2f, y el mismo nombre copiado en actividad y notificaciones.
 *
 *   npm run db:fix-doc-names            # solo muestra lo que cambiaría
 *   npm run db:fix-doc-names -- --apply # aplica los cambios
 *
 * Idempotente: una segunda ejecución no encuentra nada que corregir.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { fixUploadFileName } from "../apps/api/src/documents/file-name";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

/** Repite la corrección por si el nombre se codificó mal más de una vez. */
function fullyFixed(name: string): string {
  let current = name;
  for (let i = 0; i < 3; i++) {
    const next = fixUploadFileName(current);
    if (next === current) break;
    current = next;
  }
  return current;
}

async function main() {
  const docs = await prisma.document.findMany({ select: { id: true, fileName: true } });
  const fixes = docs
    .map((d) => ({ id: d.id, from: d.fileName, to: fullyFixed(d.fileName) }))
    .filter((f) => f.from !== f.to);

  console.log(`${docs.length} documentos revisados, ${fixes.length} con nombre corrompido.`);
  for (const f of fixes) console.log(`  ${f.id}: "${f.from}" → "${f.to}"`);

  if (!apply) {
    if (fixes.length) console.log("\nModo simulación. Ejecuta con --apply para guardar los cambios.");
    return;
  }

  let events = 0;
  let notifications = 0;
  for (const f of fixes) {
    await prisma.$transaction(async (tx) => {
      await tx.document.update({ where: { id: f.id }, data: { fileName: f.to } });

      const byDocument = { meta: { path: ["documentId"], equals: f.id } };
      for (const e of await tx.activityEvent.findMany({ where: byDocument })) {
        if (!e.summary.includes(f.from)) continue;
        await tx.activityEvent.update({
          where: { id: e.id },
          data: { summary: e.summary.split(f.from).join(f.to) },
        });
        events++;
      }
      for (const n of await tx.notification.findMany({ where: byDocument })) {
        if (!n.body.includes(f.from)) continue;
        await tx.notification.update({
          where: { id: n.id },
          data: { body: n.body.split(f.from).join(f.to) },
        });
        notifications++;
      }
    });
  }
  console.log(
    `\nCorregidos: ${fixes.length} documentos, ${events} eventos de actividad, ${notifications} notificaciones.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
