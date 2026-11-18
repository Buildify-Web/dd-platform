/**
 * Development helper: create (or re-invite) a STAFF/ADMIN account in the INVITED state and
 * print its temporary password, as an approval would. Refuses to run in production.
 *
 *   pnpm --filter @dd/backend exec tsx --env-file=.env src/scripts/dev-invite.ts <email> <STAFF|ADMIN> "<Name>"
 *
 * Replaced by the real registration + approvals flow later.
 */
import { env } from "../config/env";
import { db, disconnectDb } from "../lib/db";
import { issueTemporaryPassword } from "../modules/auth/service";

async function main() {
  if (env().NODE_ENV === "production") throw new Error("dev-invite is for development only");
  const [rawEmail, role = "STAFF", name = "Test Staff"] = process.argv.slice(2);
  if (!rawEmail || (role !== "STAFF" && role !== "ADMIN")) throw new Error('Usage: dev-invite <email> <STAFF|ADMIN> "<Name>"');
  const email = rawEmail.trim().toLowerCase();
  if (email === env().MAIN_ADMIN_EMAIL) throw new Error("Use admin:bootstrap for the main admin");

  const existing = await db().user.findUnique({ where: { email } });
  const user = existing ?? (await db().user.create({ data: { email, name, role, status: "PENDING_APPROVAL" } }));
  const { temporaryPassword } = await issueTemporaryPassword(user, { ip: "127.0.0.1", userAgent: "dev-invite", internal: true });
  console.log(`Invited ${email} (${role}). Temporary password: ${temporaryPassword}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
