import { Router } from "express";
import { authenticate, bearerToken } from "../../middleware/auth";
import { parseBody } from "../../middleware/validate";
import { recordAuthEvent } from "./events";
import {
  activateBody,
  completeActivationBody,
  forgotBody,
  loginBody,
  resetPasswordBody,
  resetTokenBody,
  ticketBody,
} from "./schemas";
import * as auth from "./service";
import { resolveSession, revokeSession, sessionEndsAt } from "./sessions";

/**
 * /v1/auth: sign-in for the admin & staff web portal (and, later, the mobile app).
 * Clients keep the returned opaque token and send it as `Authorization: Bearer <token>`.
 * Full request/response docs: /docs (Swagger).
 */
export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const input = parseBody(loginBody, req.body);
  res.json(await auth.login(input, req.ctx));
});

authRouter.post("/logout", async (req, res) => {
  const token = bearerToken(req);
  if (token) {
    try {
      const { session, user } = await resolveSession(token, req.ctx);
      await revokeSession(session.id, "LOGOUT");
      await recordAuthEvent("LOGOUT", req.ctx, { userId: user.id, portal: session.portal });
    } catch {
      // Already expired or unknown: signing out is still a success.
    }
  }
  res.status(204).end();
});

authRouter.get("/me", authenticate, (req, res) => {
  const { user, session } = req.auth!;
  res.json({
    user: auth.publicUser(user),
    session: {
      portal: session.portal === "ADMIN" ? "admin" : "staff",
      expiresAt: sessionEndsAt(session).toISOString(),
      absoluteExpiresAt: session.expiresAt.toISOString(),
      idleTimeoutMinutes: session.idleTimeoutMinutes,
      rememberMe: session.rememberMe,
    },
  });
});

// ── Activation (first sign-in) ──
authRouter.post("/activation/verify", async (req, res) => {
  res.json(await auth.verifyActivation(parseBody(activateBody, req.body), req.ctx));
});
authRouter.post("/activation/ticket", async (req, res) => {
  res.json(await auth.inspectActivationTicket(parseBody(ticketBody, req.body).ticket, req.ctx));
});
authRouter.post("/activation/complete", async (req, res) => {
  res.json(await auth.completeActivation(parseBody(completeActivationBody, req.body), req.ctx));
});

// ── Forgot / reset password (also "Request new" activation details) ──
authRouter.post("/password/forgot", (req, res) => {
  const { email } = parseBody(forgotBody, req.body);
  res.status(202).json(auth.requestPasswordHelp(email, req.ctx));
});
authRouter.post("/password/reset/verify", async (req, res) => {
  res.json(await auth.inspectResetToken(parseBody(resetTokenBody, req.body).token, req.ctx));
});
authRouter.post("/password/reset", async (req, res) => {
  res.json(await auth.resetPassword(parseBody(resetPasswordBody, req.body), req.ctx));
});
