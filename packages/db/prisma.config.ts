import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// DATABASE_URL is read from packages/db/.env, else apps/backend/.env (the backend owns the DB).
// Commands are run from packages/db (pnpm --filter @dd/db …), so these paths are relative to it.
config({ path: [".env", "../../apps/backend/.env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // `prisma generate` doesn't need a database, so allow it to run without the URL.
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
