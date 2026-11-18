import type { AuthEventType, SessionPortal } from "@dd/db";
import { db } from "../../lib/db";
import { logger } from "../../lib/logger";
import type { ClientContext } from "../../middleware/client-context";

/**
 * Writes one row to the permanent sign-in / credential log (AuthEvent).
 * Never throws: a failed audit write must not break sign-in, but it is logged as an error.
 */
export async function recordAuthEvent(
  type: AuthEventType,
  ctx: ClientContext,
  data: { userId?: string | null; email?: string | null; portal?: SessionPortal | null; reason?: string | null } = {},
) {
  try {
    await db().authEvent.create({
      data: {
        type,
        userId: data.userId ?? null,
        email: data.email ?? null,
        portal: data.portal ?? null,
        reason: data.reason ?? null,
        ipAddress: ctx.ip.slice(0, 45),
        userAgent: ctx.userAgent,
      },
    });
  } catch (err) {
    logger.error({ err, type }, "failed to record auth event");
  }
}
