/**
 * Creates (or re-invites) the main admin, the owner account named by MAIN_ADMIN_EMAIL.
 *
 *   pnpm --filter @dd/backend admin:bootstrap
 *
 * - No main admin yet → creates it (role ADMIN, isMainAdmin) as INVITED and emails a
 *   temporary password with the activation link.
 * - Main admin exists but never activated → issues a fresh temporary password.
 * - Main admin already ACTIVE → does nothing (use "Forgot password?" on the portal).
 *
 * When email isn't configured (development), the temporary password is printed here instead.
 * Safe to run more than once. Nobody else can become main admin: other admins must register
 * and be approved by this account.
 */
import { env } from "../config/env";
import { db, disconnectDb } from "../lib/db";
import { issueTemporaryPassword } from "../modules/auth/service";

async function main() {
  const e = env();
  const email = e.MAIN_ADMIN_EMAIL;
  const ctx = { ip: "127.0.0.1", userAgent: "bootstrap-main-admin", internal: true };

  const otherOwner = await db().user.findFirst({ where: { isMainAdmin: true, NOT: { email } } });
  if (otherOwner) {
    throw new Error(
      "A different account is already the main admin. Change MAIN_ADMIN_EMAIL back, or transfer ownership in the database deliberately.",
    );
  }

  let user = await db().user.findUnique({ where: { email } });
  if (user?.status === "ACTIVE" && user.isMainAdmin) {
    console.log(`Main admin ${email} is already active. Nothing to do. Use "Forgot password?" on the portal if needed.`);
    return;
  }
  if (user && user.role !== "ADMIN" && user.status === "ACTIVE") {
    throw new Error(`${email} is an active STAFF account. Change its role deliberately before making it the main admin.`);
  }

  user = user
    ? await db().user.update({ where: { id: user.id }, data: { role: "ADMIN", isMainAdmin: true, approvedAt: new Date() } })
    : await db().user.create({
        data: { email, name: e.MAIN_ADMIN_NAME, role: "ADMIN", status: "INVITED", isMainAdmin: true, approvedAt: new Date() },
      });

  const { temporaryPassword, expiresAt, sent } = await issueTemporaryPassword(user, ctx);
  const emailConfigured = !!e.BREVO_API_KEY && !!e.MAIL_FROM_EMAIL && !e.MAIL_LOG_ONLY;

  console.log(`\nMain admin: ${email}`);
  console.log(`Activation page: ${e.PORTAL_URL}/activate`);
  console.log(`Temporary password valid until: ${expiresAt.toISOString()}`);
  if (emailConfigured && sent) {
    console.log("Login details were emailed to the main admin.");
  } else {
    console.log(`Email not sent (Brevo not configured). Temporary password: ${temporaryPassword}`);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
