import { onValue, push, ref, runTransaction, serverTimestamp, set, update, remove } from "firebase/database";
import type { Session } from "../auth/session";
import { getFirebase, hasFirebaseConfig } from "../firebase/firebase";
import type { ItemId } from "../../core/inventory";

export type TownTradeListing = {
  id: string;
  sellerUid: string;
  sellerName: string;
  itemId: ItemId;
  qty: number;
  price: number;
  status: "open" | "sold" | "cancelled";
  createdAtMs: number;
  buyerUid?: string;
  buyerName?: string;
  soldAtMs?: number;
};

export type TownTradeSale = {
  id: string;
  listingId: string;
  itemId: ItemId;
  qty: number;
  price: number;
  buyerUid: string;
  buyerName: string;
  soldAtMs: number;
};

export type TownTradeSession = {
  createListing: (listing: { itemId: ItemId; qty: number; price: number }) => Promise<string | null>;
  cancelListing: (listingId: string) => Promise<void>;
  claimListing: (listingId: string) => Promise<TownTradeListing | null>;
  subscribeListings: (listener: (listings: TownTradeListing[]) => void) => () => void;
  subscribeSales: (listener: (sales: TownTradeSale[]) => void) => () => void;
  acknowledgeSale: (saleId: string) => Promise<void>;
  stop: () => Promise<void>;
};

const noopSession: TownTradeSession = {
  createListing: async () => null,
  cancelListing: async () => {},
  claimListing: async () => null,
  subscribeListings: () => () => {},
  subscribeSales: () => () => {},
  acknowledgeSale: async () => {},
  stop: async () => {},
};

function parseListing(id: string, raw: unknown): TownTradeListing | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.sellerUid !== "string") return null;
  if (typeof data.sellerName !== "string") return null;
  if (typeof data.itemId !== "string") return null;
  if (typeof data.qty !== "number") return null;
  if (typeof data.price !== "number") return null;
  if (typeof data.status !== "string") return null;
  if (typeof data.createdAtMs !== "number") return null;
  const status = data.status;
  if (status !== "open" && status !== "sold" && status !== "cancelled") return null;
  return {
    id,
    sellerUid: data.sellerUid,
    sellerName: data.sellerName,
    itemId: data.itemId as ItemId,
    qty: data.qty,
    price: data.price,
    status,
    createdAtMs: data.createdAtMs,
    buyerUid: typeof data.buyerUid === "string" ? data.buyerUid : undefined,
    buyerName: typeof data.buyerName === "string" ? data.buyerName : undefined,
    soldAtMs: typeof data.soldAtMs === "number" ? data.soldAtMs : undefined,
  };
}

function parseSale(id: string, raw: unknown): TownTradeSale | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.listingId !== "string") return null;
  if (typeof data.itemId !== "string") return null;
  if (typeof data.qty !== "number") return null;
  if (typeof data.price !== "number") return null;
  if (typeof data.buyerUid !== "string") return null;
  if (typeof data.buyerName !== "string") return null;
  if (typeof data.soldAtMs !== "number") return null;
  return {
    id,
    listingId: data.listingId,
    itemId: data.itemId as ItemId,
    qty: data.qty,
    price: data.price,
    buyerUid: data.buyerUid,
    buyerName: data.buyerName,
    soldAtMs: data.soldAtMs,
  };
}

export function createTownTradeSession(session: Session | null): TownTradeSession {
  if (!session || session.mode !== "firebase" || !hasFirebaseConfig()) return noopSession;

  const { rtdb } = getFirebase();
  const townId = "town";
  const listingsRef = ref(rtdb, `towns/${townId}/listings`);
  const salesRef = ref(rtdb, `towns/${townId}/sales/${session.uid}`);

  return {
    createListing: async (listing) => {
      try {
        const entry = push(listingsRef);
        await set(entry, {
          sellerUid: session.uid,
          sellerName: session.username,
          itemId: listing.itemId,
          qty: listing.qty,
          price: listing.price,
          status: "open",
          createdAtMs: Date.now(),
          createdAt: serverTimestamp(),
        });
        return entry.key ?? null;
      } catch {
        return null;
      }
    },
    cancelListing: async (listingId) => {
      try {
        await update(ref(rtdb, `towns/${townId}/listings/${listingId}`), {
          status: "cancelled",
          cancelledAtMs: Date.now(),
          cancelledAt: serverTimestamp(),
        });
      } catch {
        // ignore
      }
    },
    claimListing: async (listingId) => {
      try {
        const listingRef = ref(rtdb, `towns/${townId}/listings/${listingId}`);
        const result = await runTransaction(listingRef, (current) => {
          const listing = parseListing(listingId, current);
          if (!listing || listing.status !== "open") return;
          return {
            ...current,
            status: "sold",
            buyerUid: session.uid,
            buyerName: session.username,
            soldAtMs: Date.now(),
            soldAt: serverTimestamp(),
          };
        });
        if (!result.committed) return null;
        const finalListing = parseListing(listingId, result.snapshot.val());
        if (!finalListing) return null;
        const saleRef = push(ref(rtdb, `towns/${townId}/sales/${finalListing.sellerUid}`));
        await set(saleRef, {
          listingId,
          itemId: finalListing.itemId,
          qty: finalListing.qty,
          price: finalListing.price,
          buyerUid: session.uid,
          buyerName: session.username,
          soldAtMs: finalListing.soldAtMs ?? Date.now(),
          soldAt: serverTimestamp(),
        });
        return finalListing;
      } catch {
        return null;
      }
    },
    subscribeListings: (listener) => {
      return onValue(listingsRef, (snapshot) => {
        const raw = snapshot.val();
        if (!raw || typeof raw !== "object") {
          listener([]);
          return;
        }
        const listings: TownTradeListing[] = [];
        for (const [id, data] of Object.entries(raw as Record<string, unknown>)) {
          const parsed = parseListing(id, data);
          if (!parsed) continue;
          if (parsed.status !== "open") continue;
          listings.push(parsed);
        }
        listings.sort((a, b) => a.createdAtMs - b.createdAtMs);
        listener(listings);
      });
    },
    subscribeSales: (listener) => {
      return onValue(salesRef, (snapshot) => {
        const raw = snapshot.val();
        if (!raw || typeof raw !== "object") {
          listener([]);
          return;
        }
        const sales: TownTradeSale[] = [];
        for (const [id, data] of Object.entries(raw as Record<string, unknown>)) {
          const parsed = parseSale(id, data);
          if (!parsed) continue;
          sales.push(parsed);
        }
        sales.sort((a, b) => a.soldAtMs - b.soldAtMs);
        listener(sales);
      });
    },
    acknowledgeSale: async (saleId) => {
      try {
        await remove(ref(rtdb, `towns/${townId}/sales/${session.uid}/${saleId}`));
      } catch {
        // ignore
      }
    },
    stop: async () => {},
  };
}
