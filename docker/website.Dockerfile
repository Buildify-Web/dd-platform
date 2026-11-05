# Build from repo root:  docker build -f docker/website.Dockerfile -t dd-website .
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/website/package.json apps/website/
RUN pnpm install --frozen-lockfile --filter @dd/website...
COPY apps/website apps/website
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @dd/website build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /repo/apps/website/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/website/.next/static ./apps/website/.next/static
COPY --from=build --chown=app:app /repo/apps/website/public ./apps/website/public
USER app
EXPOSE 3000
CMD ["node", "apps/website/server.js"]
