import { createApp } from "./app";
import { env } from "./config/env";
import { db, disconnectDb } from "./lib/db";
import { startJobs, stopJobs } from "./jobs";
import { logger } from "./lib/logger";

async function main() {
  const e = env(); // throws with a readable list if any setting is invalid
  const app = createApp();

  // Warn early if the owner account hasn't been created yet.
  try {
    const owner = await db().user.findFirst({ where: { isMainAdmin: true }, select: { status: true } });
    if (!owner) logger.warn("No main admin yet. Run `pnpm --filter @dd/backend admin:bootstrap` to create it.");
    else if (owner.status !== "ACTIVE") logger.info({ status: owner.status }, "Main admin exists but hasn't activated yet");
  } catch (err) {
    logger.error({ err }, "Database check failed at start-up (is DATABASE_URL right and migrated?)");
  }

  const server = app.listen(e.PORT, () => logger.info({ port: e.PORT, env: e.NODE_ENV }, "backend listening"));
  if (e.JOBS_ENABLED && e.NODE_ENV !== "test") startJobs();

  const shutdown = (signal: string) => {
    logger.info({ signal }, "shutting down");
    stopJobs();
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
