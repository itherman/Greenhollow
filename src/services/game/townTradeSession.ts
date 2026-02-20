/**
 * townTradeSession.ts
 *
 * Firebase Realtime Database service for the two-player trade handshake in the
 * town hub. A "trade session" is a lightweight coordination document that moves
 * two players through the states:
 *
 *   pending  →  active  →  bothConfirmed
 *        ↘               ↗
 *                cancelled
 *
 * RTDB path: towns/town/tradeSessions/{sessionId}
 *
 * This module exports:
 *   - TownTradeSessionStatus  — union of valid status strings
 *   - TownTradeSessionData    — parsed, typed session document
 *   - TownTradeSessionService — service interface returned by the factory
 *   - createTownTradeSession  — factory that returns a live service or a no-op
 *
 * Guest / offline mode: if the session is null, not in "firebase" mode, or
 * Firebase config is absent, all methods are safe no-ops.
 */

import { onValue, push, ref, runTransaction, serverTimestamp, update } from "firebase/database";
import type { Session } from "../auth/session";
import { getFirebase, hasFirebaseConfig } from "../firebase/firebase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** All legal values for the status field of a trade session document. */
export type TownTradeSessionStatus = "pending" | "active" | "bothConfirmed" | "cancelled";

/**
 * A fully parsed trade session document with a stable client-side `id` field
 * derived from the RTDB push key.
 */
export type TownTradeSessionData = {
  /** RTDB push key — used as the session identifier in all operations. */
  id: string;
  /** UID of the player who initiated the session. */
  requesterId: string;
  /** Display name of the requester at the time the session was created. */
  requesterName: string;
  /** UID of the player who received the trade invitation. */
  recipientId: string;
  /** Display name of the recipient at the time the session was created. */
  recipientName: string;
  /** Current lifecycle state of the session. */
  status: TownTradeSessionStatus;
  /** True once the requester has clicked "Confirm Trade". */
  requesterConfirmed: boolean;
  /** True once the recipient has clicked "Confirm Trade". */
  recipientConfirmed: boolean;
  /** Client-side epoch ms recorded when the session document was pushed. */
  createdAtMs: number;
  /**
   * Epoch ms after which a "pending" session is considered expired and is
   * excluded from subscription results. Always createdAtMs + 30_000.
   */
  expiresAtMs: number;
};

/**
 * Public interface for the trade session service. All mutating methods are
 * fire-and-forget from the UI perspective — errors are swallowed internally
 * to match the resilience pattern used by other town trade services.
 */
export type TownTradeSessionService = {
  /**
   * Creates a new trade session document and invites `recipient`.
   *
   * @param recipient - The player to invite; must be present in the town.
   * @param recipient.uid - Firebase UID of the recipient.
   * @param recipient.username - Display name of the recipient.
   * @returns The new sessionId (RTDB push key) on success, or null on failure.
   */
  sendRequest(recipient: { uid: string; username: string }): Promise<string | null>;

  /**
   * Accepts or declines a pending session as the recipient.
   *
   * Accepting sets status to "active"; declining sets it to "cancelled".
   *
   * @param sessionId - The RTDB push key of the session to respond to.
   * @param accept - True to accept, false to decline.
   */
  respondToRequest(sessionId: string, accept: boolean): Promise<void>;

  /**
   * Marks the calling player's confirmation flag on the session.
   *
   * Uses a transaction so concurrent confirmations from both players are
   * merged safely. When both flags are true after the write the status is
   * also promoted to "bothConfirmed".
   *
   * Only valid for sessions in "active" status; the transaction aborts
   * (returns undefined) for any other status to avoid overwriting a
   * cancelled or already-completed session.
   *
   * @param sessionId - The RTDB push key of the active session to confirm.
   */
  confirmTrade(sessionId: string): Promise<void>;

  /**
   * Sets the session status to "cancelled".
   *
   * @param sessionId - The RTDB push key of the session to cancel.
   */
  cancelSession(sessionId: string): Promise<void>;

  /**
   * Subscribes to all trade sessions relevant to the current player
   * (sessions where the player is either requester or recipient).
   *
   * Expired pending sessions (expiresAtMs < Date.now()) are filtered out.
   * Results are sorted by createdAtMs ascending so the oldest session is
   * always first.
   *
   * @param listener - Callback invoked with the current session list whenever
   *   the underlying RTDB data changes.
   * @returns An unsubscribe function; call it to stop listening.
   */
  subscribeToSessions(listener: (sessions: TownTradeSessionData[]) => void): () => void;

  /**
   * Cleans up any resources held by the service instance. Currently a no-op
   * because RTDB listeners are managed via the returned unsubscribe functions,
   * but kept for interface symmetry with other town trade services.
   */
  stop(): Promise<void>;
};

// ---------------------------------------------------------------------------
// No-op fallback
// ---------------------------------------------------------------------------

/**
 * Safe no-op implementation returned when the service cannot connect to
 * Firebase (guest mode, missing config, or null session).
 */
const noopService: TownTradeSessionService = {
  sendRequest: async () => null,
  respondToRequest: async () => {},
  confirmTrade: async () => {},
  cancelSession: async () => {},
  subscribeToSessions: () => () => {},
  stop: async () => {},
};

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const townId = "town";

/** How long a "pending" session is considered valid before it is filtered out. */
const SESSION_TTL_MS = 30_000;

// ---------------------------------------------------------------------------
// Type guard / parser
// ---------------------------------------------------------------------------

/**
 * Parses a raw RTDB value into a typed TownTradeSessionData document.
 *
 * Returns null for any document that is missing required fields, has
 * unexpected types, or carries an unrecognised status value.
 *
 * @param id - The RTDB push key for this document (used as TownTradeSessionData.id).
 * @param raw - The raw value from the RTDB snapshot (unknown shape).
 * @returns A typed TownTradeSessionData, or null if the document is malformed.
 */
function parseSession(id: string, raw: unknown): TownTradeSessionData | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  if (typeof data.requesterId !== "string") return null;
  if (typeof data.requesterName !== "string") return null;
  if (typeof data.recipientId !== "string") return null;
  if (typeof data.recipientName !== "string") return null;
  if (typeof data.status !== "string") return null;
  if (typeof data.requesterConfirmed !== "boolean") return null;
  if (typeof data.recipientConfirmed !== "boolean") return null;
  if (typeof data.createdAtMs !== "number") return null;
  if (typeof data.expiresAtMs !== "number") return null;

  const status = data.status;
  if (
    status !== "pending" &&
    status !== "active" &&
    status !== "bothConfirmed" &&
    status !== "cancelled"
  ) {
    return null;
  }

  return {
    id,
    requesterId: data.requesterId,
    requesterName: data.requesterName,
    recipientId: data.recipientId,
    recipientName: data.recipientName,
    status,
    requesterConfirmed: data.requesterConfirmed,
    recipientConfirmed: data.recipientConfirmed,
    createdAtMs: data.createdAtMs,
    expiresAtMs: data.expiresAtMs,
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a live TownTradeSessionService backed by Firebase Realtime Database.
 *
 * Returns a no-op service when:
 *   - `session` is null
 *   - `session.mode` is not "firebase"
 *   - Firebase environment variables are not configured
 *
 * @param session - The current player session. Must be a firebase-mode session
 *   for any real operations to occur.
 * @returns A TownTradeSessionService instance.
 *
 * @example
 * const svc = createTownTradeSession(loadSession());
 * const unsubscribe = svc.subscribeToSessions((sessions) => {
 *   console.log("Active sessions:", sessions);
 * });
 * // Later:
 * unsubscribe();
 * await svc.stop();
 */
export function createTownTradeSession(session: Session | null): TownTradeSessionService {
  if (!session || session.mode !== "firebase" || !hasFirebaseConfig()) return noopService;

  const { rtdb } = getFirebase();
  const sessionsRef = ref(rtdb, `towns/${townId}/tradeSessions`);

  return {
    /**
     * Pushes a new session document for the given recipient.
     * Uses push() to obtain a stable key, then update() to write the payload
     * atomically under that key — matching the pattern in townTradeRequests.ts.
     */
    sendRequest: async (recipient) => {
      try {
        const entry = push(sessionsRef);
        const sessionId = entry.key ?? null;
        if (!sessionId) return null;

        const now = Date.now();
        const payload = {
          requesterId: session.uid,
          requesterName: session.username,
          recipientId: recipient.uid,
          recipientName: recipient.username,
          status: "pending" as const,
          requesterConfirmed: false,
          recipientConfirmed: false,
          createdAtMs: now,
          expiresAtMs: now + SESSION_TTL_MS,
          // RTDB server timestamp stored alongside the client ms value so
          // server-side rules can enforce ordering without trusting the client.
          createdAt: serverTimestamp(),
        };

        await update(ref(rtdb, `towns/${townId}/tradeSessions/${sessionId}`), payload);
        return sessionId;
      } catch {
        return null;
      }
    },

    /**
     * Accepts or declines a pending session as the recipient.
     * A simple update() is sufficient here — no transaction needed because
     * only the recipient can respond, so there is no write contention.
     */
    respondToRequest: async (sessionId, accept) => {
      try {
        await update(ref(rtdb, `towns/${townId}/tradeSessions/${sessionId}`), {
          status: accept ? "active" : "cancelled",
        });
      } catch {
        // ignore — UI will reflect the unchanged status on next subscription tick
      }
    },

    /**
     * Sets the calling player's confirmation flag using a transaction so that
     * concurrent confirmations from both players are always merged correctly.
     *
     * The transaction function receives the current document value and returns
     * an updated value. Returning undefined aborts the transaction without
     * writing — used here when the session is not in "active" status to
     * prevent accidentally overwriting a cancelled or completed session.
     */
    confirmTrade: async (sessionId) => {
      try {
        const sessionRef = ref(rtdb, `towns/${townId}/tradeSessions/${sessionId}`);
        await runTransaction(sessionRef, (current) => {
          if (!current || typeof current !== "object") return;

          const data = current as Record<string, unknown>;

          // Only advance confirmations on an active session.
          if (data.status !== "active") return;

          const isRequester = data.requesterId === session.uid;
          const isRecipient = data.recipientId === session.uid;

          // Current player is not a party to this session — abort.
          if (!isRequester && !isRecipient) return;

          const updated: Record<string, unknown> = { ...data };

          if (isRequester) updated.requesterConfirmed = true;
          if (isRecipient) updated.recipientConfirmed = true;

          // If both sides have now confirmed, promote status.
          if (updated.requesterConfirmed === true && updated.recipientConfirmed === true) {
            updated.status = "bothConfirmed";
          }

          return updated;
        });
      } catch {
        // ignore — the UI will prompt the player to retry if needed
      }
    },

    /**
     * Cancels a session by setting its status to "cancelled".
     * Either party may cancel at any point before "bothConfirmed".
     */
    cancelSession: async (sessionId) => {
      try {
        await update(ref(rtdb, `towns/${townId}/tradeSessions/${sessionId}`), {
          status: "cancelled",
        });
      } catch {
        // ignore
      }
    },

    /**
     * Subscribes to the full tradeSessions collection and filters down to
     * only sessions that are relevant to the current player.
     *
     * Filtering rules:
     *   1. The session must include session.uid as requesterId or recipientId.
     *   2. "pending" sessions whose expiresAtMs is in the past are excluded
     *      (they are abandoned invitations that were never accepted).
     *   3. All other statuses ("active", "bothConfirmed", "cancelled") are
     *      included so the UI can show the final state before cleaning up.
     *
     * Results are sorted by createdAtMs ascending.
     */
    subscribeToSessions: (listener) => {
      return onValue(sessionsRef, (snapshot) => {
        const raw = snapshot.val();
        if (!raw || typeof raw !== "object") {
          listener([]);
          return;
        }

        const now = Date.now();
        const sessions: TownTradeSessionData[] = [];

        for (const [id, data] of Object.entries(raw as Record<string, unknown>)) {
          const parsed = parseSession(id, data);
          if (!parsed) continue;

          // Only surface sessions that involve the current player.
          const isParty =
            parsed.requesterId === session.uid || parsed.recipientId === session.uid;
          if (!isParty) continue;

          // Drop expired pending sessions — they were never accepted and the
          // TTL has elapsed, so showing them would be confusing to the player.
          if (parsed.status === "pending" && parsed.expiresAtMs < now) continue;

          sessions.push(parsed);
        }

        sessions.sort((a, b) => a.createdAtMs - b.createdAtMs);
        listener(sessions);
      });
    },

    stop: async () => {},
  };
}
