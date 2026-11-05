# dd-platform

Web platform for **Dynamic Donalds** — public website, admin portal, backend API and background worker (pnpm + Turborepo monorepo).
The Flutter mobile app lives in a separate repository.

See [CLAUDE.md](CLAUDE.md) for the full scope, domain rules, structure and conventions.

## Quick start

```bash
pnpm install
cp .env.example apps/website/.env.local   # optional for website-only dev
pnpm dev:website                          # http://localhost:3000
```

## Apps

| App | Status | Stack |
|---|---|---|
| `apps/website` | Built | Next.js 16 + TypeScript + Tailwind 4 |
| `apps/webapp` | Planned | Next.js + TypeScript |
| `apps/backend` | Planned | Express + TypeScript + Prisma (PostgreSQL) |
| `apps/worker` | Planned | Node + TypeScript |

## Replacing sample content

All website placeholder content lives in `apps/website/content/*.ts` and `apps/website/lib/site.ts`;
photos are in `apps/website/public/images`.
