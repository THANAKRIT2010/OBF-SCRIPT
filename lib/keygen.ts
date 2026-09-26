import crypto from "crypto";

/**
 * Generates a license key in the form FLEXOZY-XXXX-XXXX-XXXX-XXXX
 */
export function generateKeyCode(): string {
  const segment = () =>
    crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 4);
  return `FLEXOZY-${segment()}-${segment()}-${segment()}-${segment()}`;
}

/**
 * Given a duration in days (or null/0 for lifetime), returns the expiry Date or null.
 */
export function calculateExpiry(durationDays?: number | null): Date | null {
  if (!durationDays || durationDays <= 0) return null;
  const expires = new Date();
  expires.setDate(expires.getDate() + durationDays);
  return expires;
}
