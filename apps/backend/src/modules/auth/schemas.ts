import { emailSchema, loginPasswordSchema, newPasswordSchema, PASSWORD_MAX, PORTALS } from "@dd/shared/auth";
import * as z from "zod";

/** Request bodies for /v1/auth. `.strict()` rejects unknown keys. */

export const loginBody = z
  .object({
    email: emailSchema,
    password: loginPasswordSchema,
    portal: z.enum(PORTALS),
    rememberMe: z.boolean().default(false),
  })
  .strict();

export const activateBody = z
  .object({
    email: emailSchema,
    temporaryPassword: z.string().trim().min(1, { error: "Enter the temporary password from your email." }).max(PASSWORD_MAX),
  })
  .strict();

const opaqueToken = z.string().min(20).max(200).regex(/^[A-Za-z0-9_-]+$/, { error: "Invalid link." });

export const ticketBody = z.object({ ticket: opaqueToken }).strict();
export const completeActivationBody = z.object({ ticket: opaqueToken, password: newPasswordSchema }).strict();

export const forgotBody = z.object({ email: emailSchema }).strict();
export const resetTokenBody = z.object({ token: opaqueToken }).strict();
export const resetPasswordBody = z.object({ token: opaqueToken, password: newPasswordSchema }).strict();

export type LoginInput = z.infer<typeof loginBody>;
