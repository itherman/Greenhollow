import { onValue, push, query, ref, serverTimestamp, set, limitToLast } from "firebase/database";
import type { Session } from "../auth/session";
import { getFirebase, hasFirebaseConfig } from "../firebase/firebase";

export type TownChatMessage = {
  id: string;
  uid: string;
  username: string;
  text: string;
  createdAtMs: number;
};

export type TownChatSession = {
  sendMessage: (text: string) => Promise<void>;
  subscribe: (listener: (messages: TownChatMessage[]) => void) => () => void;
  stop: () => Promise<void>;
};

const noopSession: TownChatSession = {
  sendMessage: async () => {},
  subscribe: () => () => {},
  stop: async () => {},
};

const MAX_CHAT_MESSAGES = 50;

export function createTownChatSession(session: Session | null): TownChatSession {
  if (!session || session.mode !== "firebase" || !hasFirebaseConfig()) return noopSession;

  const { rtdb } = getFirebase();
  const townId = "town";
  const chatRef = ref(rtdb, `towns/${townId}/chat`);
  const recentRef = query(chatRef, limitToLast(MAX_CHAT_MESSAGES));

  return {
    sendMessage: async (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      try {
        const entry = push(chatRef);
        await set(entry, {
          uid: session.uid,
          username: session.username,
          text: trimmed.slice(0, 200),
          createdAtMs: Date.now(),
          createdAt: serverTimestamp(),
        });
      } catch {
        // best-effort
      }
    },
    subscribe: (listener) => {
      return onValue(recentRef, (snapshot) => {
        const raw = snapshot.val();
        if (!raw || typeof raw !== "object") {
          listener([]);
          return;
        }
        const messages: TownChatMessage[] = [];
        for (const [id, data] of Object.entries(raw as Record<string, unknown>)) {
          if (!data || typeof data !== "object") continue;
          const record = data as Record<string, unknown>;
          if (typeof record.uid !== "string") continue;
          if (typeof record.username !== "string") continue;
          if (typeof record.text !== "string") continue;
          if (typeof record.createdAtMs !== "number") continue;
          messages.push({
            id,
            uid: record.uid,
            username: record.username,
            text: record.text,
            createdAtMs: record.createdAtMs,
          });
        }
        messages.sort((a, b) => a.createdAtMs - b.createdAtMs);
        listener(messages);
      });
    },
    stop: async () => {},
  };
}
