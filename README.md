# Bogados

Plataforma **SaaS de gestión legal** para firmas de abogados (MVP).

Centraliza expedientes, documentos y comunicación segura entre abogado y cliente, con **portal del cliente** y **multi-tenant** (`tenant_id`) desde el día 1.

## Características (MVP)

| Módulo | Qué incluye |
|--------|-------------|
| **Casos** | CRUD, estados `intake → abierto → en_pausa → cerrado`, abogado asignado, filtros + paginación |
| **Roles** | Admin, Abogado, Cliente + aislamiento por tenant |
| **Documentos** | Subida/descarga, flag *compartido con cliente* vs interno |
| **Mensajes** | Hilo por caso entre participantes |
| **Notas / timeline** | Internas (solo firma) o visibles al cliente + auditoría |
| **Tareas / plazos** | `CaseTask` con vencimiento, asignatario, listado overdue |
| **Notificaciones** | In-app al cambiar estado, nuevo mensaje o doc compartido |
| **Dashboard** | Conteos por estado, docs, mensajes, roles, tareas |
| **Portal cliente** | Login, estado del caso, docs compartidos, mensajes |
| **API dedicada** | NestJS + JWT + Swagger + helmet (`apps/api`) |

**Diferido:** facturación, e-firma, calendarios, app nativa, IA.

## Stack

| Capa | Tecnología |
|------|------------|
| **apps/web** | Next.js 14 (App Router) + TypeScript + Tailwind — UI y NextAuth |
| **apps/api** | **NestJS** + TypeScript + Prisma — backend REST versionado |
| **Prisma** | PostgreSQL (esquema compartido en `prisma/`) |
| **Auth** | NextAuth (sesión web) + **JWT Nest** (fuente de verdad API) |
| **Docker Compose** | Postgres (+ perfil `full` con contenedor API) |

## Puertos

| Servicio | URL |
|----------|-----|
| Frontend (Next.js) | [http://localhost:3000](http://localhost:3000) |
| **API NestJS** | [http://localhost:3001](http://localhost:3001) |
| Swagger / OpenAPI | [http://localhost:3001/api/docs](http://localhost:3001/api/docs) |
| Health | `GET /api/v1/health` · Ready `GET /api/v1/health/ready` |

## Requisitos

- Node.js ≥ 18
- Docker / Docker Compose
- npm

## Cómo ejecutar en local

```bash
# 1) Clonar
git clone https://github.com/LENINALX/bogados-.git
cd bogados-

# 2) Variables de entorno
cp .env.example .env
cp .env apps/web/.env
cp apps/api/.env.example apps/api/.env
# Edita NEXTAUTH_SECRET y JWT_SECRET (openssl rand -base64 32)
# NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# 3) Base de datos
docker compose up -d postgres

# 4) Dependencias
npm install

# 5) Migrar y sembrar datos demo
npx prisma migrate deploy
npm run db:seed

# 6) Arrancar API Nest (terminal 1)
npm run dev:api
# equivalente: cd apps/api && npm run start:dev

# 7) Arrancar web (terminal 2)
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) y la documentación en [http://localhost:3001/api/docs](http://localhost:3001/api/docs).

### Usuarios demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@demo.bogados` | `demo1234` |
| Abogado | `abogado@demo.bogados` | `demo1234` |
| Cliente | `cliente@demo.bogados` | `demo1234` |

## API Nest — endpoints (`/api/v1`)

Los listados paginados aceptan `page` (default 1) y `pageSize` (default 20, máx. 100) y responden:

```json
{ "success": true, "data": { "items": [...], "meta": { "total": 0, "page": 1, "pageSize": 20 } } }
```

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | Login → JWT Bearer |
| GET | `/auth/me` | Usuario actual |
| POST | `/auth/register-client` | Admin/Abogado crea usuario CLIENTE (opcional `caseId`) |
| GET | `/dashboard/stats` | Conteos tenant-scoped (casos, docs, msgs, roles, tareas) |
| CRUD | `/users` | Usuarios (admin) — listado paginado + filtro `role`/`q` |
| GET/POST | `/cases` | Listar (paginado, `status`/`q`) / crear casos |
| GET/PATCH/DELETE | `/cases/:id` | Detalle / actualizar / borrar |
| PATCH | `/cases/:id/status` | Transición de estado (+ notificación) |
| PATCH | `/cases/:id/assign` | Asignar abogado (admin) |
| GET/POST | `/cases/:caseId/notes` | Notas (clientes sin internas) |
| GET/POST | `/cases/:caseId/documents` | Listar (paginado) / subir (multipart) |
| GET | `/documents/:id/download` | Descarga con ACL |
| GET/POST | `/cases/:caseId/messages` | Mensajes del caso (paginado) |
| GET | `/cases/:caseId/activity` | Timeline / auditoría |
| GET/POST | `/cases/:caseId/tasks` | Tareas del caso |
| GET | `/tasks` | Listar tareas (admin/abogado) |
| GET | `/tasks/overdue` | Tareas vencidas sin completar |
| POST | `/tasks` | Crear tarea (`caseId` en body) |
| PATCH/DELETE | `/tasks/:id` | Actualizar / eliminar tarea |
| GET | `/notifications` | Notificaciones del usuario (paginado, `unreadOnly`) |
| PATCH | `/notifications/:id/read` | Marcar leída |
| PATCH | `/notifications/read-all` | Marcar todas leídas |
| GET | `/portal/cases` | Portal cliente |
| GET | `/health` · `/health/ready` | Liveness / readiness |
| — | `/api/docs` | Swagger UI |

**ACL:** Cliente no lee notas `isInternal` ni documentos con `sharedWithClient=false`.

Las Route Handlers de Next en `apps/web/app/api/cases|documents|messages` quedan como **legado**; el frontend cliente usa `NEXT_PUBLIC_API_URL` hacia Nest.

## Estructura del monorepo

```
bogados-/
├── apps/
│   ├── api/                  # NestJS backend dedicado (:3001)
│   │   └── src/
│   │       ├── auth/         # JWT + roles + register-client
│   │       ├── cases/ users/ tenants/
│   │       ├── notes/ documents/ messages/
│   │       ├── tasks/ notifications/ dashboard/
│   │       ├── activity/ clients/ health/
│   │       ├── common/ prisma/ config/ storage/
│   │       ├── main.ts
│   │       └── app.module.ts
│   └── web/                  # Next.js UI (:3000)
│       ├── app/              # páginas + NextAuth
│       ├── components/       # consumen Nest vía nest-api.ts
│       └── lib/
├── packages/shared/          # Constantes de dominio
├── prisma/                   # Esquema + migraciones compartidas
├── uploads/
├── docker-compose.yml
└── package.json
```

## Scripts útiles

```bash
npm run dev          # Next.js en :3000
npm run dev:api      # NestJS en :3001 (watch)
npm run build:api    # Compilar API
npm run test:api     # Tests unitarios Jest (auth + cases + roles)
npm run db:seed      # Datos demo (incluye tareas y notificaciones)
npm run db:studio    # Prisma Studio
npx prisma migrate dev
docker compose up -d postgres
# API en Docker (opcional):
docker compose --profile full up -d
```

## Seguridad / permisos

- Toda consulta filtra por `tenantId` del JWT Nest / sesión.
- **Cliente** solo ve sus casos, notas no internas y documentos compartidos.
- **Abogado** solo gestiona casos donde es el abogado asignado.
- **Admin** ve todo el tenant.
- Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) + **helmet**.
- No hay secretos en el repositorio: usa `.env` local (ignorado por git).

## Licencia

Privado — uso interno.
