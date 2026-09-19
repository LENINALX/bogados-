# Bogados

Plataforma **SaaS de gestión legal** para firmas de abogados (MVP).

Centraliza expedientes, documentos y comunicación segura entre abogado y cliente, con **portal del cliente** y **multi-tenant** (`tenant_id`) desde el día 1.

## Características (MVP)

| Módulo | Qué incluye |
|--------|-------------|
| **Casos** | CRUD, estados `intake → abierto → en_pausa → cerrado`, abogado asignado, filtros |
| **Roles** | Admin, Abogado, Cliente + aislamiento por tenant |
| **Documentos** | Subida/descarga, flag *compartido con cliente* vs interno |
| **Mensajes** | Hilo por caso entre participantes |
| **Notas / timeline** | Internas (solo firma) o visibles al cliente |
| **Portal cliente** | Login, estado del caso, docs compartidos, mensajes |

**Diferido:** facturación, e-firma, calendarios, app nativa, IA.

## Stack

- **apps/web** — Next.js 14 (App Router) + TypeScript + Tailwind
- **Prisma** + PostgreSQL
- **Auth.js (NextAuth)** — credenciales + sesión JWT
- **Docker Compose** — Postgres local
- Archivos en `uploads/` (abstracción lista para S3/MinIO)

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
# Edita NEXTAUTH_SECRET (openssl rand -base64 32)

# 3) Base de datos
docker compose up -d

# 4) Dependencias
npm install

# 5) Migrar y sembrar datos demo
npx prisma migrate deploy
npm run db:seed

# 6) Arrancar la app
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Usuarios demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@demo.bogados` | `demo1234` |
| Abogado | `abogado@demo.bogados` | `demo1234` |
| Cliente | `cliente@demo.bogados` | `demo1234` |

## Estructura del monorepo

```
bogados-/
├── apps/web/                 # Next.js full-stack
│   ├── app/
│   │   ├── api/              # Route Handlers (auth, cases, docs, messages)
│   │   ├── login/
│   │   ├── dashboard/        # Panel Admin / Abogado
│   │   ├── casos/[id]/       # Detalle staff
│   │   └── portal/           # Portal Cliente
│   ├── components/
│   └── lib/                  # prisma, auth, permissions, storage
├── packages/shared/          # Constantes de dominio (estados, roles)
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── uploads/                  # Almacenamiento local (gitignored)
├── docker-compose.yml
├── .env.example
└── package.json
```

## Scripts útiles

```bash
npm run dev          # Next.js en :3000
npm run db:seed      # Datos demo
npm run db:studio    # Prisma Studio
npx prisma migrate dev   # Nueva migración (desarrollo)
docker compose up -d     # Postgres
docker compose down      # Detener Postgres
```

## Seguridad / permisos

- Toda consulta filtra por `tenantId` de la sesión.
- **Cliente** solo ve sus casos, notas no internas y documentos con `sharedWithClient=true`.
- **Abogado** solo gestiona casos donde es el abogado asignado.
- **Admin** ve todo el tenant.
- No hay secretos en el repositorio: usa `.env` local (ignorado por git).

## Licencia

Privado — uso interno.
