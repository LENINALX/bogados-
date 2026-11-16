import { PrismaClient, Role } from "@prisma/client";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();
const mailpitApi = (process.env.MAILPIT_API_URL ?? "http://localhost:8025/api/v1").replace(/\/$/, "");
let adminEmail: string;
let clientEmail: string;
const password = "demo1234";

let tenantId: string;
let adminId: string;
let clientId: string;

type MailpitListMessage = {
  ID?: string;
  id?: string;
  Subject?: string;
  subject?: string;
  Created?: string;
  created?: string;
  To?: Array<{ Address?: string; address?: string }>;
  to?: Array<{ Address?: string; address?: string }>;
};

function messageId(message: MailpitListMessage) {
  return message.ID ?? message.id ?? "";
}

function messageCreated(message: MailpitListMessage) {
  return message.Created ?? message.created ?? "";
}

function messageRecipientMatches(message: MailpitListMessage, email: string) {
  const recipients = message.To ?? message.to ?? [];
  return recipients.some((recipient) => (recipient.Address ?? recipient.address ?? "").toLowerCase() === email);
}

async function waitForEmail(
  api: APIRequestContext,
  recipient: string,
  subject: string,
  sentAfter: number,
) {
  let email: { text: string; html: string } | null = null;
  await expect
    .poll(
      async () => {
        const response = await api.get(`${mailpitApi}/messages?limit=50`);
        expect(response.ok(), "Mailpit debe responder a su API de mensajes").toBeTruthy();
        const result = (await response.json()) as { messages?: MailpitListMessage[] };
        const candidate = (result.messages ?? []).find((message) => {
          const created = Date.parse(messageCreated(message));
          return (
            (message.Subject ?? message.subject ?? "").includes(subject) &&
            messageRecipientMatches(message, recipient) &&
            Number.isFinite(created) &&
            created >= sentAfter
          );
        });
        if (!candidate) return false;

        const detailResponse = await api.get(`${mailpitApi}/message/${encodeURIComponent(messageId(candidate))}`);
        expect(detailResponse.ok(), "Mailpit debe devolver el mensaje solicitado").toBeTruthy();
        const detail = (await detailResponse.json()) as Record<string, unknown>;
        email = {
          text: typeof detail.Text === "string" ? detail.Text : typeof detail.text === "string" ? detail.text : "",
          html: typeof detail.HTML === "string" ? detail.HTML : typeof detail.html === "string" ? detail.html : "",
        };
        return Boolean(email.text || email.html);
      },
      { timeout: 30_000, intervals: [250, 500, 1_000] },
    )
    .toBeTruthy();

  if (!email) throw new Error(`Mailpit no entregó "${subject}" a ${recipient}`);
  return email;
}

async function login(page: Page, email: string, rolePath: "/dashboard" | "/portal") {
  await page.goto("/login?firma=firma-demo");
  await page.getByLabel("Código de firma").fill("firma-demo");
  await page.getByLabel("Email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(new RegExp(`${rolePath.replace("/", "\\/")}(?:\\?|$)`));
}

async function setAdminTwoFactor(enabled: boolean) {
  await prisma.$transaction([
    prisma.loginChallenge.deleteMany({ where: { userId: adminId } }),
    prisma.loginEvent.deleteMany({ where: { tenantId, email: adminEmail } }),
    prisma.user.update({ where: { id: adminId }, data: { twoFactorEnabled: enabled } }),
  ]);
}

test.describe("flujos E2E de Bogados", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    const tenant = await prisma.tenant.findUnique({ where: { slug: "firma-demo" } });
    if (!tenant) throw new Error("Falta la firma de demo. Ejecuta las migraciones y npm run db:seed antes de npm run test:e2e.");
    tenantId = tenant.id;
    const suffix = randomUUID().replace(/-/g, "");
    adminEmail = `e2e-admin-${suffix}@bogados.test`;
    clientEmail = `e2e-client-${suffix}@bogados.test`;
    const passwordHash = await bcrypt.hash(password, 10);
    const [admin, client] = await prisma.$transaction([
      prisma.user.create({
        data: { tenantId, email: adminEmail, name: "Admin E2E", role: Role.ADMIN, passwordHash },
      }),
      prisma.user.create({
        data: { tenantId, email: clientEmail, name: "Cliente E2E", role: Role.CLIENTE, passwordHash },
      }),
    ]);
    adminId = admin.id;
    clientId = client.id;

    await setAdminTwoFactor(false);
    await prisma.appointment.deleteMany({
      where: { tenantId, reason: { startsWith: "E2E appointment:" } },
    });
    await prisma.case.updateMany({
      where: {
        tenantId,
        description: { startsWith: "E2E case request:" },
        requestState: { in: ["pendiente", "aplazada"] },
      },
      data: { requestState: "rechazada", status: "cerrado", closedAt: new Date() },
    });
  });

  test.afterAll(async () => {
    if (adminId) {
      await setAdminTwoFactor(false);
      await prisma.user.deleteMany({ where: { id: { in: [adminId, clientId] } } });
    }
    await prisma.$disconnect();
  });

  test("inicia sesión con contraseña sin pedir código por email", async ({ page }) => {
    await login(page, adminEmail, "/dashboard");
    await expect(page.getByRole("heading", { name: "Panel de la firma" })).toBeVisible();
  });

  test("inicia sesión y verifica el código recibido en Mailpit", async ({ page, request }) => {
    await setAdminTwoFactor(true);
    const sentAfter = Date.now();
    try {
      await page.goto("/login?firma=firma-demo");
      await page.getByLabel("Código de firma").fill("firma-demo");
      await page.getByLabel("Email").fill(adminEmail);
      await page.locator("#password").fill(password);
      await page.getByRole("button", { name: "Iniciar sesión" }).click();
      await expect(page.getByRole("heading", { name: "Verifica que eres tú" })).toBeVisible();

      const email = await waitForEmail(request, adminEmail, "Tu código de acceso", sentAfter);
      const codeMatch = `${email.text}\n${email.html}`.match(/(\d{3})\s+(\d{3})/);
      expect(codeMatch, "El correo debe incluir el código de seis dígitos").not.toBeNull();
      await page.getByLabel("Dígito 1 de 6").fill(`${codeMatch![1]}${codeMatch![2]}`);
      await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
    } finally {
      await setAdminTwoFactor(false);
    }
  });

  test("bloquea el acceso después de cinco contraseñas incorrectas", async ({ page }) => {
    await setAdminTwoFactor(false);
    await page.goto("/login?firma=firma-demo");
    await page.getByLabel("Código de firma").fill("firma-demo");
    await page.getByLabel("Email").fill(adminEmail);

    for (let attempt = 0; attempt < 5; attempt++) {
      await page.locator("#password").fill(`incorrecta-${attempt}`);
      await page.getByRole("button", { name: "Iniciar sesión" }).click();
      await expect(page.getByText(/el código de firma, el email o la contraseña no son correctos/i)).toBeVisible();
    }

    await expect(page.getByText(/cuenta queda bloqueada 15 minutos/i)).toBeVisible();
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page.getByText(/demasiados intentos con esta cuenta/i)).toBeVisible();
  });

  test("registra una firma y la activa desde el enlace enviado por email", async ({ page, request }) => {
    const suffix = randomUUID().replace(/-/g, "").slice(0, 10);
    const firmName = `Firma E2E ${suffix}`;
    const email = `admin-${suffix}@bogados.test`;
    const sentAfter = Date.now();

    await page.goto("/registro");
    await page.getByLabel("Nombre de la firma").fill(firmName);
    await page.getByLabel("Nombre y apellido").fill("Administradora E2E");
    await page.getByLabel("Email").fill(email);
    await page.locator("#password").fill("ClaveE2Esegura2026");
    await expect(page.getByText(/Disponible · tu equipo lo usará para entrar/)).toBeVisible();
    await page.getByRole("button", { name: "Crear mi despacho" }).click();
    await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();

    const emailMessage = await waitForEmail(request, email, "Confirma tu email", sentAfter);
    const link = `${emailMessage.text}\n${emailMessage.html}`
      .match(/https?:\/\/[^\s<>"']+/g)
      ?.find((candidate) => candidate.includes("/verificar?token="));
    expect(link, "El email debe contener el enlace de confirmación").toBeTruthy();
    const verificationUrl = new URL(link!);
    await page.goto(`${verificationUrl.pathname}${verificationUrl.search}`);
    await expect(page).toHaveURL(/\/login\?.*ok=verified/);

    const registeredTenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: `firma-e2e-${suffix}` } });
    const user = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: registeredTenant.id, email } },
      select: { emailVerified: true },
    });
    expect(user?.emailVerified).toBe(true);
  });

  test("permite que el cliente solicite una cita en un horario disponible", async ({ page }) => {
    const reason = `E2E appointment: ${randomUUID()}`;
    await login(page, clientEmail, "/portal");
    await page.goto("/portal/citas");
    await page.getByLabel("Abogado").selectOption({ label: "Luis Abogado" });

    const slot = page.getByRole("radio").first();
    await expect(slot).toBeVisible();
    await slot.click();
    await page.getByLabel("Motivo (opcional)").fill(reason);
    await page.getByRole("button", { name: "Pedir cita" }).click();
    await expect(page.getByText(/cita solicitada/i)).toBeVisible();

    await expect
      .poll(() => prisma.appointment.count({ where: { tenantId, clientId, reason, status: "pendiente" } }))
      .toBe(1);
  });

  test("permite que el cliente envíe una solicitud de caso desde el portal", async ({ page }) => {
    const reference = randomUUID();
    const title = `Consulta E2E ${reference.slice(0, 8)}`;
    const description = `E2E case request: ${reference}. Necesito asesoría para revisar un contrato laboral y los pagos pendientes.`;

    await login(page, clientEmail, "/portal");
    await page.goto("/portal/solicitar");
    await page.getByLabel("Título").fill(title);
    await page.getByLabel("Materia (opcional)").selectOption("Laboral");
    await page.getByLabel("¿Qué ocurrió?").fill(description);
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(page).toHaveURL(/\/portal\/casos\/[^/]+$/);

    const created = await prisma.case.findFirst({
      where: { tenantId, clientId, title, description, requestState: "pendiente" },
      select: { id: true },
    });
    expect(created).not.toBeNull();
  });
});
