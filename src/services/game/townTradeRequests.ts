import { onValue, push, ref, serverTimestamp, update } from "firebase/database";
import type { Session } from "../auth/session";
import { getFirebase, hasFirebaseConfig } from "../firebase/firebase";
import type { ItemId } from "../../core/inventory";

export type TownTradeRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

export type TownTradeRequest = {
  id: string;
  senderUid: string;
  senderName: string;
  recipientUid: string;
  recipientName: string;
  itemId: ItemId;
  qty: number;
  price: number;
  status: TownTradeRequestStatus;
  createdAtMs: number;
  updatedAtMs?: number;
};

export type TownTradeRequestSession = {
  sendRequest: (input: {
    recipientUid: string;
    recipientName: string;
    itemId: ItemId;
    qty: number;
    price: number;
  }) => Promise<string | null>;
  updateRequestStatus: (request: TownTradeRequest, status: TownTradeRequestStatus) => Promise<boolean>;
  subscribeRequests: (listener: (requests: TownTradeRequest[]) => void) => () => void;
  stop: () => Promise<void>;
};

const noopSession: TownTradeRequestSession = {
  sendRequest: async () => null,
  updateRequestStatus: async () => false,
  subscribeRequests: () => () => {},
  stop: async () => {},
};

const townId = "town";

function parseRequest(id: string, raw: unknown): TownTradeRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.senderUid !== "string") return null;
  if (typeof data.senderName !== "string") return null;
  if (typeof data.recipientUid !== "string") return null;
  if (typeof data.recipientName !== "string") return null;
  if (typeof data.itemId !== "string") return null;
  if (typeof data.qty !== "number") return null;
  if (typeof data.price !== "number") return null;
  if (typeof data.status !== "string") return null;
  if (typeof data.createdAtMs !== "number") return null;
  const status = data.status;
  if (status !== "pending" && status !== "accepted" && status !== "declined" && status !== "cancelled") return null;
  return {
    id,
    senderUid: data.senderUid,
    senderName: data.senderName,
    recipientUid: data.recipientUid,
    recipientName: data.recipientName,
    itemId: data.itemId as ItemId,
    qty: data.qty,
    price: data.price,
    status,
    createdAtMs: data.createdAtMs,
    updatedAtMs: typeof data.updatedAtMs === "number" ? data.updatedAtMs : undefined,
  };
}

function requestPath(uid: string, id: string) {
  return `towns/${townId}/tradeRequestsByUser/${uid}/${id}`;
}

export function createTownTradeRequestSession(session: Session | null): TownTradeRequestSession {
  if (!session || session.mode !== "firebase" || !hasFirebaseConfig()) return noopSession;

  const { rtdb } = getFirebase();
  const baseRef = ref(rtdb, `towns/${townId}/tradeRequestsByUser/${session.uid}`);

  return {
    sendRequest: async (input) => {
      try {
        const entry = push(ref(rtdb, `towns/${townId}/tradeRequestsByUser/${input.recipientUid}`));
        const id = entry.key ?? null;
        if (!id) return null;
        const now = Date.now();
        const payload = {
          senderUid: session.uid,
          senderName: session.username,
          recipientUid: input.recipientUid,
          recipientName: input.recipientName,
          itemId: input.itemId,
          qty: input.qty,
          price: input.price,
          status: "pending" as const,
          createdAtMs: now,
          createdAt: serverTimestamp(),
        };
        await update(ref(rtdb), {
          [requestPath(input.recipientUid, id)]: payload,
          [requestPath(session.uid, id)]: payload,
        });
        return id;
      } catch {
        return null;
      }
    },
    updateRequestStatus: async (request, status) => {
      try {
        const now = Date.now();
        await update(ref(rtdb), {
          [requestPath(request.recipientUid, request.id)]: {
            ...request,
            status,
            updatedAtMs: now,
            updatedAt: serverTimestamp(),
          },
          [requestPath(request.senderUid, request.id)]: {
            ...request,
            status,
            updatedAtMs: now,
            updatedAt: serverTimestamp(),
          },
        });
        return true;
      } catch {
        return false;
      }
    },
    subscribeRequests: (listener) => {
      return onValue(baseRef, (snapshot) => {
        const raw = snapshot.val();
        if (!raw || typeof raw !== "object") {
          listener([]);
          return;
        }
        const requests: TownTradeRequest[] = [];
        for (const [id, data] of Object.entries(raw as Record<string, unknown>)) {
          const parsed = parseRequest(id, data);
          if (!parsed) continue;
          requests.push(parsed);
        }
        requests.sort((a, b) => a.createdAtMs - b.createdAtMs);
        listener(requests);
      });
    },
    stop: async () => {},
  };
}
