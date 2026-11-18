import { createPrismaClient, type PrismaClient } from "@dd/db";
import { env } from "../config/env";

let client: PrismaClient | undefined;

/** The process-wide Prisma client, created on first use. */
export function db(): PrismaClient {
  client ??= createPrismaClient(env().DATABASE_URL);
  return client;
}

export async function disconnectDb() {
  await client?.$disconnect();
  client = undefined;
}
