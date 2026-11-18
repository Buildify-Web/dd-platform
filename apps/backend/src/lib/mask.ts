/** "lakshmi@email.com" → "l•••@email.com" (as in "Reset link sent to l•••@email.com"). */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "•••";
  return `${email[0]}•••${email.slice(at)}`;
}
