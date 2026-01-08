import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import type { Session } from "../auth/session";
import { getFirebase, hasFirebaseConfig } from "../firebase/firebase";
import { parseTownPresencePayload, type TownPresencePayload } from "../../core/presence";

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

  const { db } = getFirebase();
  const presenceDoc = doc(db, "presence", session.uid);

  return {
    publish: async (payload) => {
      try {
        await setDoc(
          presenceDoc,
          {
            areaId: "town",
            username: session.username,
            ...payload,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch {
        // Ignore transient errors; presence updates are best-effort.
      }
    },
    subscribe: (listener) => {
      const presenceQuery = query(collection(db, "presence"), where("areaId", "==", "town"));
      return onSnapshot(presenceQuery, (snapshot) => {
        const entries: TownPresenceEntry[] = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.id === session.uid) return;
          const data = docSnap.data();
          const payload = parseTownPresencePayload(data);
          if (!payload) return;
          const username = typeof data.username === "string" ? data.username : "unknown";
          entries.push({ uid: docSnap.id, username, ...payload });
        });
        listener(entries);
      });
    },
    stop: async () => {
      try {
        await deleteDoc(presenceDoc);
      } catch {
        // Ignore failures when cleaning up presence.
      }
    },
  };
}
