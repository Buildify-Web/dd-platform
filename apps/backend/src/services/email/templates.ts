import type { EmailMessage } from "./index";

/**
 * Transactional email templates. Table-based HTML with inline styles (what email clients
 * support), using the brand colours from the website/webapp. Every value inserted into
 * HTML goes through `esc()`.
 */
const C = { ink: "#17260f", inkSoft: "#3f4b38", muted: "#5f665a", brand: "#2b7010", sun: "#f6c90e", mist: "#ecece6", paper: "#f2f4ee", line: "#dfe2d8" };

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const fmtDateTime = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d) + " IST";

function layout({ preheader, heading, body }: { preheader: string; heading: string; body: string }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:${C.mist};font-family:Segoe UI,Helvetica,Arial,sans-serif;color:${C.ink};">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.mist};padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;">
    <tr><td style="padding:22px 32px;background:${C.brand};">
      <span style="display:inline-block;font-weight:800;letter-spacing:.06em;color:${C.sun};font-size:15px;text-transform:uppercase;">Dynamic Donalds</span>
      <span style="display:block;color:#dce8cf;font-size:11px;letter-spacing:.3em;margin-top:4px;">EDUCATION IS LIFE</span>
    </td></tr>
    <tr><td style="padding:32px 32px 8px;">
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;font-weight:500;color:${C.ink};">${esc(heading)}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:20px 32px 28px;border-top:1px solid ${C.line};font-size:12px;line-height:1.6;color:${C.muted};">
      This is an automated message from the Dynamic Donalds admin &amp; staff portal. We will never ask for your password by email or phone.
    </td></tr>
  </table>
  <p style="font-size:11px;color:${C.muted};margin:16px 0 0;">© ${new Date().getFullYear()} Dynamic Donalds · Chromepet, Chennai</p>
</td></tr></table></body></html>`;
}

const p = (html: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${C.inkSoft};">${html}</p>`;

const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 18px;"><tr><td style="border-radius:10px;background:${C.ink};">
<a href="${esc(href)}" style="display:inline-block;padding:13px 24px;font-size:15px;color:#ffffff;text-decoration:none;font-weight:500;">${esc(label)} &rarr;</a>
</td></tr></table>`;

const detailRows = (rows: [string, string][]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 6px;background:${C.paper};border-radius:12px;">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="padding:12px 16px;font-size:12px;color:${C.muted};width:42%;">${esc(k)}</td><td style="padding:12px 16px;font-size:15px;color:${C.ink};font-family:Consolas,Menlo,monospace;word-break:break-all;">${esc(v)}</td></tr>`,
  )
  .join("")}
</table>`;

const roleLabel = (role: "ADMIN" | "STAFF") => (role === "ADMIN" ? "admin" : "staff");

/** Sent when an account is approved (or new details are requested): username + temporary password. */
export function accountInviteEmail(args: {
  to: string;
  name: string;
  role: "ADMIN" | "STAFF";
  temporaryPassword: string;
  expiresAt: Date;
  activateUrl: string;
  resent?: boolean;
}): EmailMessage {
  const { name, role, temporaryPassword, expiresAt, activateUrl } = args;
  const heading = args.resent ? "Your new login details" : "Welcome to the Dynamic Donalds team";
  const intro = args.resent
    ? `Here are new login details for your ${roleLabel(role)} account. Any earlier temporary password no longer works.`
    : `Your ${roleLabel(role)} registration has been approved. Use the details below to activate your account, then choose your own password.`;
  const html = layout({
    preheader: "Your username and temporary password for the Dynamic Donalds portal.",
    heading,
    body:
      p(`Hi ${esc(name)},`) +
      p(intro) +
      detailRows([
        ["Username (email)", args.to],
        ["Temporary password", temporaryPassword],
        ["Valid until", fmtDateTime(expiresAt)],
      ]) +
      button(activateUrl, "Activate your account") +
      p(`The temporary password works once, only on the activation page. Don't share it with anyone.`),
  });
  const text = [
    `Hi ${name},`,
    "",
    intro,
    "",
    `Username (email): ${args.to}`,
    `Temporary password: ${temporaryPassword}`,
    `Valid until: ${fmtDateTime(expiresAt)}`,
    "",
    `Activate your account: ${activateUrl}`,
    "",
    "The temporary password works once, only on the activation page. Don't share it with anyone.",
  ].join("\n");
  return { to: { email: args.to, name }, subject: args.resent ? "Your new Dynamic Donalds login details" : "Your Dynamic Donalds portal login details", html, text, tag: "auth-invite" };
}

/** Password reset link (single use, short expiry). */
export function passwordResetEmail(args: { to: string; name: string; resetUrl: string; expiresInMinutes: number }): EmailMessage {
  const html = layout({
    preheader: `Reset your password. The link expires in ${args.expiresInMinutes} minutes.`,
    heading: "Reset your password",
    body:
      p(`Hi ${esc(args.name)},`) +
      p(`We received a request to reset the password for your Dynamic Donalds portal account. This link works once and expires in <strong>${args.expiresInMinutes} minutes</strong>.`) +
      button(args.resetUrl, "Choose a new password") +
      p(`If you didn't ask for this, you can ignore this email. Your password won't change.`),
  });
  const text = [
    `Hi ${args.name},`,
    "",
    `We received a request to reset the password for your Dynamic Donalds portal account. This link works once and expires in ${args.expiresInMinutes} minutes:`,
    args.resetUrl,
    "",
    "If you didn't ask for this, you can ignore this email. Your password won't change.",
  ].join("\n");
  return { to: { email: args.to, name: args.name }, subject: "Reset your Dynamic Donalds password", html, text, tag: "auth-reset" };
}

/** Security notice after a password is set (activation) or changed (reset). */
export function passwordChangedEmail(args: { to: string; name: string; at: Date; activated: boolean; signInUrl: string }): EmailMessage {
  const heading = args.activated ? "Your account is active" : "Your password was changed";
  const first = args.activated
    ? `Your Dynamic Donalds portal account is now active. You set your password on ${fmtDateTime(args.at)}.`
    : `The password for your Dynamic Donalds portal account was changed on ${fmtDateTime(args.at)}. For your safety, every other signed-in device was signed out.`;
  const html = layout({
    preheader: heading,
    heading,
    body:
      p(`Hi ${esc(args.name)},`) +
      p(esc(first)) +
      button(args.signInUrl, "Sign in") +
      p(`If this wasn't you, reset your password straight away and tell the admin.`),
  });
  const text = [`Hi ${args.name},`, "", first, "", `Sign in: ${args.signInUrl}`, "", "If this wasn't you, reset your password straight away and tell the admin."].join("\n");
  return { to: { email: args.to, name: args.name }, subject: args.activated ? "Your Dynamic Donalds account is active" : "Your Dynamic Donalds password was changed", html, text, tag: "auth-password-changed" };
}

/**
 * General notice (registration decisions, fee reminders, payment receipts…). Every value is
 * escaped. `rows` render as a details table; `cta` as a button.
 */
export function noticeEmail(args: {
  to: string;
  name: string;
  subject: string;
  heading: string;
  paragraphs: string[];
  rows?: [string, string][];
  cta?: { href: string; label: string };
  tag: string;
}): EmailMessage {
  const html = layout({
    preheader: args.paragraphs[0] ?? args.heading,
    heading: args.heading,
    body:
      p(`Hi ${esc(args.name)},`) +
      args.paragraphs.map((x) => p(esc(x))).join("") +
      (args.rows?.length ? detailRows(args.rows) : "") +
      (args.cta ? button(args.cta.href, args.cta.label) : ""),
  });
  const text = [
    `Hi ${args.name},`,
    "",
    ...args.paragraphs.flatMap((x) => [x, ""]),
    ...(args.rows ?? []).map(([k, v]) => `${k}: ${v}`),
    ...(args.cta ? ["", `${args.cta.label}: ${args.cta.href}`] : []),
  ].join("\n");
  return { to: { email: args.to, name: args.name }, subject: args.subject, html, text, tag: args.tag };
}
