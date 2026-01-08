import { onDisconnect, onValue, ref, remove, serverTimestamp, set } from "firebase/database";
import type { Session } from "../auth/session";
import { getFirebase, hasFirebaseConfig } from "../firebase/firebase";
import { buildTownPresencePath, parseTownPresencePayload, type TownPresencePayload } from "../../core/presence";

export type TownPresenceEntry = TownPresencePayload & {
  uid: string;
  username: string;
};

export type TownPresenceSession = {
  publish: (payload: TownPresencePayload) => Promise<void>;
  subscribe: (listener: (entries: TownPresenceEntry[]) => void) => () => void;
  stop: () => Promise<void>;
};

const noopSession: TownPresenceSession = {
  publish: async () => {},
  subscribe: () => () => {},
  stop: async () => {},
};

export function createTownPresenceSession(session: Session | null): TownPresenceSession {
  if (!session || session.mode !== "firebase" || !hasFirebaseConfig()) return noopSession;

  const { rtdb } = getFirebase();
  const townId = "town";
  const presenceRef = ref(rtdb, buildTownPresencePath(townId, session.uid));
  const townPresenceRef = ref(rtdb, `towns/${townId}/presence`);
  void onDisconnect(presenceRef).remove();

  return {
    publish: async (payload) => {
      try {
        await set(presenceRef, {
          areaId: "town",
          username: session.username,
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Ignore transient errors; presence updates are best-effort.
      }
    },
    subscribe: (listener) => {
      return onValue(townPresenceRef, (snapshot) => {
        const entries: TownPresenceEntry[] = [];
        const raw = snapshot.val();
        if (!raw || typeof raw !== "object") {
          listener(entries);
          return;
        }
        Object.entries(raw as Record<string, unknown>).forEach(([uid, data]) => {
          if (uid === session.uid) return;
          const payload = parseTownPresencePayload(data);
          if (!payload) return;
          const username =
            data && typeof data === "object" && typeof (data as Record<string, unknown>).username === "string"
              ? (data as Record<string, unknown>).username as string
              : "unknown";
          entries.push({ uid, username, ...payload });
        });
        listener(entries);
      });
    },
    stop: async () => {
      try {
        await remove(presenceRef);
      } catch {
        // Ignore failures when cleaning up presence.
      }
    },
  };
}
