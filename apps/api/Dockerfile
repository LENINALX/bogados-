# Construir desde la raíz del monorepo: docker build -f apps/api/Dockerfile .
FROM node:20-alpine AS base
# Mirror alternativo de Alpine para redes que bloquean dl-cdn.alpinelinux.org
# (p. ej. ALPINE_MIRROR=https://mirrors.edge.kernel.org/alpine). Vacío = CDN oficial.
ARG ALPINE_MIRROR=
# Prisma necesita OpenSSL para elegir y cargar su motor en Alpine
RUN if [ -n "$ALPINE_MIRROR" ]; then \
      sed -i "s#https\?://dl-cdn.alpinelinux.org/alpine#${ALPINE_MIRROR}#" /etc/apk/repositories; \
    fi \
 && apk add --no-cache openssl
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY prisma ./prisma
RUN npm ci --workspace=@bogados/api --include-workspace-root

FROM base AS build
COPY --from=deps /app ./
COPY . .
RUN npx prisma generate && npm run build -w @bogados/api

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
WORKDIR /app/apps/api
EXPOSE 3001
# Aplica las migraciones pendientes antes de arrancar (idempotente)
CMD ["sh", "-c", "/app/node_modules/.bin/prisma migrate deploy --schema /app/prisma/schema.prisma && exec node dist/main.js"]
