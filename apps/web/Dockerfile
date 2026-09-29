# Construir desde la raíz del monorepo: docker build -f apps/web/Dockerfile .
FROM node:20-alpine AS base
# Mirror alternativo de Alpine para redes que bloquean dl-cdn.alpinelinux.org
# (p. ej. ALPINE_MIRROR=https://mirrors.edge.kernel.org/alpine). Vacío = CDN oficial.
ARG ALPINE_MIRROR=
# Prisma necesita OpenSSL para elegir y cargar su motor en Alpine
RUN if [ -n "$ALPINE_MIRROR" ]; then \
      sed -i "s#https\?://dl-cdn.alpinelinux.org/alpine#${ALPINE_MIRROR}#" /etc/apk/repositories; \
    fi \
 && apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY prisma ./prisma
RUN npm ci --workspace=@bogados/web --include-workspace-root

FROM base AS build
COPY --from=deps /app ./
COPY . .
# NEXT_PUBLIC_* se incrusta en el JS del navegador al compilar: es un build arg,
# no una variable de entorno de ejecución. Debe ser la URL de la API vista desde el navegador.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_OUTPUT=standalone
RUN npx prisma generate && npm run build -w @bogados/web

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
# El motor de Prisma se carga dinámicamente; se copia por si el trazado de Next no lo incluye
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
