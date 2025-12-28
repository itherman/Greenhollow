export type UsernameReservationResult =
  | { ok: true }
  | { ok: false; reason: "username_taken" };

/**
 * Minimal abstraction so we can unit test reservation logic without a live Firestore.
 * The Firebase adapter will implement this using Firestore transactions.
 */
export interface UsernameReservationStore {
  /**
   * Atomically create a username record if it doesn't exist.
   * Returns true if created, false if already exists.
   */
  createIfAbsent(username: string, data: { uid: string }): Promise<boolean>;
}

export async function reserveUsername(
  store: UsernameReservationStore,
  username: string,
  uid: string,
): Promise<UsernameReservationResult> {
  const created = await store.createIfAbsent(username, { uid });
  if (!created) return { ok: false, reason: "username_taken" };
  return { ok: true };
}


