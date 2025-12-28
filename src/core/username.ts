export type UsernameValidationResult =
  | { ok: true; normalized: string }
  | { ok: false; reason: string };

/**
 * Username rules (MVP):
 * - 3..20 chars after trimming
 * - normalized lowercase
 * - must start with a letter
 * - allowed: a-z, 0-9, underscore
 */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function validateUsername(input: string): UsernameValidationResult {
  const normalized = normalizeUsername(input);

  if (normalized.length < 3) return { ok: false, reason: "too_short" };
  if (normalized.length > 20) return { ok: false, reason: "too_long" };
  if (!/^[a-z]/.test(normalized)) return { ok: false, reason: "must_start_with_letter" };
  if (!/^[a-z0-9_]+$/.test(normalized)) return { ok: false, reason: "invalid_characters" };

  return { ok: true, normalized };
}

/**
 * Synthetic email used for Firebase email/password auth.
 * The caller is expected to pass an already-validated username (or handle errors).
 */
export function usernameToSyntheticEmail(normalizedUsername: string): string {
  return `${normalizedUsername}@game.local`;
}


