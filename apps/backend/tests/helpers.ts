import { loadEnv, setEnvForTests } from "../src/config/env";

export const TEST_INTERNAL_KEY = "test-internal-key-0123456789abcdef-XYZ";

/** Configures the backend for tests. DATABASE_URL comes from TEST_DATABASE_URL when set. */
export function useTestEnv(overrides: Record<string, string> = {}) {
  setEnvForTests(
    loadEnv({
      NODE_ENV: "test",
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://unused:unused@localhost:5432/unused",
      MAIN_ADMIN_EMAIL: "owner@example.com",
      INTERNAL_API_KEYS: TEST_INTERNAL_KEY,
      PORTAL_URL: "http://portal.test",
      MAIL_LOG_ONLY: "true",
      LOG_LEVEL: "silent",
      ...overrides,
    }),
  );
}
