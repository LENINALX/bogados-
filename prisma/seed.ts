import { PrismaClient, Role, CaseStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { promises as fs } from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  // Limpieza idempotente del tenant demo
  const existing = await prisma.tenant.findUnique({ where: { slug: "firma-demo" } });
  if (existing) {
    await prisma.message.deleteMany({ where: { tenantId: existing.id } });
    await prisma.caseNote.deleteMany({ where: { tenantId: existing.id } });
    await prisma.document.deleteMany({ where: { tenantId: existing.id } });
    await prisma.case.deleteMany({ where: { tenantId: existing.id } });
    await prisma.user.deleteMany({ where: { tenantId: existing.id } });
    await prisma.tenant.delete({ where: { id: existing.id } });
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: "Firma Demo Abogados",
      slug: "firma-demo",
    },
  });

  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "admin@demo.bogados",
      name: "Ana Administradora",
      role: Role.ADMIN,
      passwordHash,
    },
  });

  const lawyer = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "abogado@demo.bogados",
      name: "Luis Abogado",
      role: Role.ABOGADO,
      passwordHash,
    },
  });

  const client = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "cliente@demo.bogados",
      name: "Carla Cliente",
      role: Role.CLIENTE,
      passwordHash,
    },
  });

  const case1 = await prisma.case.create({
    data: {
      tenantId: tenant.id,
      title: "Demanda laboral — despido injustificado",
      description:
        "Asesoría y representación por despido sin causa justificada. Reclamo de indemnización y liquidación.",
      matterType: "Laboral",
      status: CaseStatus.abierto,
      lawyerId: lawyer.id,
      clientId: client.id,
    },
  });

  const case2 = await prisma.case.create({
    data: {
      tenantId: tenant.id,
      title: "Consulta societaria — constitución SRL",
      description: "Acompañamiento en constitución de sociedad de responsabilidad limitada.",
      matterType: "Societario",
      status: CaseStatus.intake,
      lawyerId: lawyer.id,
      clientId: client.id,
    },
  });

  await prisma.case.create({
    data: {
      tenantId: tenant.id,
      title: "Contrato de arrendamiento comercial",
      description: "Revisión y negociación de cláusulas de arrendamiento de local.",
      matterType: "Civil",
      status: CaseStatus.en_pausa,
      lawyerId: lawyer.id,
      clientId: client.id,
    },
  });

  await prisma.caseNote.createMany({
    data: [
      {
        tenantId: tenant.id,
        caseId: case1.id,
        authorId: lawyer.id,
        body: "Se presentó la demanda ante el inspector de trabajo. Esperando citación.",
        isInternal: false,
      },
      {
        tenantId: tenant.id,
        caseId: case1.id,
        authorId: lawyer.id,
        body: "Estrategia interna: valorar conciliación si ofrecen al menos 60% de la liquidación.",
        isInternal: true,
      },
      {
        tenantId: tenant.id,
        caseId: case2.id,
        authorId: admin.id,
        body: "Pendiente recibir documentos de identidad de los socios.",
        isInternal: false,
      },
    ],
  });

  await prisma.message.createMany({
    data: [
      {
        tenantId: tenant.id,
        caseId: case1.id,
        senderId: lawyer.id,
        body: "Hola Carla, ya presentamos la demanda. Te avisaré cuando fijemos fecha de audiencia.",
      },
      {
        tenantId: tenant.id,
        caseId: case1.id,
        senderId: client.id,
        body: "Gracias Luis. ¿Necesitas algún documento adicional de mi parte?",
      },
    ],
  });

  // Documento demo (texto) compartido + uno interno
  const uploadRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
  const dir = path.join(uploadRoot, tenant.id, case1.id);
  await fs.mkdir(dir, { recursive: true });

  const sharedPath = path.join(dir, "carta-demanda.txt");
  await fs.writeFile(
    sharedPath,
    "Documento demo: resumen de la demanda laboral para el cliente.\n",
    "utf8"
  );
  const internalPath = path.join(dir, "notas-estrategia.txt");
  await fs.writeFile(
    internalPath,
    "Documento interno: no compartir con el cliente.\n",
    "utf8"
  );

  await prisma.document.createMany({
    data: [
      {
        tenantId: tenant.id,
        caseId: case1.id,
        fileName: "carta-demanda.txt",
        mimeType: "text/plain",
        sizeBytes: 64,
        storagePath: path.join(tenant.id, case1.id, "carta-demanda.txt"),
        sharedWithClient: true,
        uploadedById: lawyer.id,
      },
      {
        tenantId: tenant.id,
        caseId: case1.id,
        fileName: "notas-estrategia.txt",
        mimeType: "text/plain",
        sizeBytes: 48,
        storagePath: path.join(tenant.id, case1.id, "notas-estrategia.txt"),
        sharedWithClient: false,
        uploadedById: lawyer.id,
      },
    ],
  });

  console.log("✅ Seed OK");
  console.log("  Tenant:", tenant.slug);
  console.log("  Admin:   admin@demo.bogados / demo1234");
  console.log("  Abogado: abogado@demo.bogados / demo1234");
  console.log("  Cliente: cliente@demo.bogados / demo1234");
  console.log("  Casos:", 3);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
