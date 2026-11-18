# Build from repo root:  docker build -f docker/webapp.Dockerfile -t dd-webapp .
# Runtime env (no rebuild needed): BACKEND_API_URL, WEBAPP_INTERNAL_API_KEY, WEBSITE_URL,
# PARENT_APP_URL, SUPPORT_EMAIL, SESSION_IDLE_MINUTES.
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/webapp/package.json apps/webapp/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @dd/webapp...
COPY packages/shared packages/shared
COPY apps/webapp apps/webapp
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @dd/webapp build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3100 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /repo/apps/webapp/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/webapp/.next/static ./apps/webapp/.next/static
COPY --from=build --chown=app:app /repo/apps/webapp/public ./apps/webapp/public
USER app
EXPOSE 3100
CMD ["node", "apps/webapp/server.js"]
