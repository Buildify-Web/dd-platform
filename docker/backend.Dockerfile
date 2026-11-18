# syntax=docker/dockerfile:1
# Build from repo root:  docker build -f docker/backend.Dockerfile -t dd-backend .
# Starting the container runs `prisma migrate deploy` first, then the API. `migrate` runs only the migrations.
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/db/prisma packages/db/prisma
COPY packages/db/prisma.config.ts packages/db/
RUN pnpm install --frozen-lockfile --filter @dd/backend... --filter @dd/db
COPY packages packages
COPY apps/backend apps/backend
RUN pnpm --filter @dd/db generate && pnpm --filter @dd/backend build
# Production node_modules for the backend only, plus the Prisma CLI for `migrate deploy`.
RUN pnpm deploy --filter @dd/backend --prod /out/backend && pnpm deploy --filter @dd/db /out/db

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=4000
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /out/backend/node_modules ./node_modules
COPY --from=build --chown=app:app /repo/apps/backend/dist ./dist
COPY --from=build --chown=app:app /out/db /db
COPY --chown=app:app <<'EOF' /app/entrypoint.sh
#!/bin/sh
set -e
case "$1" in
  migrate) cd /db && exec npx prisma migrate deploy ;;
  bootstrap-admin) exec node dist/bootstrap-main-admin.js ;;
  # Default start: apply pending migrations (a no-op when up to date), then start the API.
  *) (cd /db && npx prisma migrate deploy) && exec node dist/server.js ;;
esac
EOF
RUN chmod +x /app/entrypoint.sh
USER app
EXPOSE 4000
ENTRYPOINT ["/app/entrypoint.sh"]
