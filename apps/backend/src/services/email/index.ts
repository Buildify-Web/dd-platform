import { env } from "../../config/env";
import { logger } from "../../lib/logger";

export type EmailMessage = {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
  /** Brevo tag for filtering in the Brevo dashboard, e.g. "auth-reset". */
  tag: string;
};

export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Brevo transactional email (https://developers.brevo.com/reference/sendtransacemail).
 * Needs BREVO_API_KEY and a sender (MAIL_FROM_EMAIL) verified in Brevo → Senders & IP.
 */
export class BrevoTransport implements EmailTransport {
  constructor(
    private readonly apiKey: string,
    private readonly from: { email: string; name: string },
    private readonly replyTo?: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch(BREVO_URL, {
      method: "POST",
      headers: { "api-key": this.apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: this.from,
        to: [message.to],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
        tags: [message.tag],
        ...(this.replyTo ? { replyTo: { email: this.replyTo } } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      // Brevo's error body has no personal data (code + message), so it is safe to log.
      const body = await res.text().catch(() => "");
      throw new Error(`Brevo send failed: ${res.status} ${body.slice(0, 300)}`);
    }
  }
}

/** Development: prints the email instead of sending it, so flows can be tested without Brevo. */
export class ConsoleTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    const line = "─".repeat(72);
    console.info(`\n${line}\n[dev email] to: ${message.to.email}\nsubject: ${message.subject}\n${line}\n${message.text}\n${line}\n`);
  }
}

let transport: EmailTransport | undefined;

export function emailTransport(): EmailTransport {
  if (transport) return transport;
  const e = env();
  const logOnly = e.NODE_ENV !== "production" && (e.MAIL_LOG_ONLY || !e.BREVO_API_KEY || !e.MAIL_FROM_EMAIL);
  if (logOnly) {
    logger.warn("Email is in console mode (BREVO_API_KEY / MAIL_FROM_EMAIL not set): emails are printed, not sent");
    transport = new ConsoleTransport();
  } else {
    transport = new BrevoTransport(e.BREVO_API_KEY, { email: e.MAIL_FROM_EMAIL, name: e.MAIL_FROM_NAME }, e.MAIL_REPLY_TO || undefined);
  }
  return transport;
}

/** Tests only. */
export function setEmailTransport(next: EmailTransport | undefined) {
  transport = next;
}

/**
 * Sends an email. Returns false (and logs, without the address) on failure, so callers can
 * decide whether a failed email should fail the request.
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  try {
    await emailTransport().send(message);
    return true;
  } catch (err) {
    logger.error({ err, tag: message.tag }, "email send failed");
    return false;
  }
}
