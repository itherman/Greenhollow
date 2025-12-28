import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { Session } from "../auth/session";
import { getFirebase, hasFirebaseConfig } from "../firebase/firebase";
import { decodePlayerState, encodePlayerStateV1, type PlayerStateV1 } from "../../core/playerStateCodec";
import { collectLocalPlayerState } from "./playerStateLocal";
import { loadProgress } from "./progressStore";

export type CloudLoadResult =
  | { ok: true; state: PlayerStateV1 | null }
  | { ok: false; reason: "firebase_not_configured" | "load_failed" };

export type CloudSaveResult =
  | { ok: true }
  | { ok: false; reason: "firebase_not_configured" | "save_failed" };

export async function loadCloudPlayerState(session: Session): Promise<CloudLoadResult> {
  if (session.mode !== "firebase") return { ok: true, state: null };
  if (!hasFirebaseConfig()) return { ok: false, reason: "firebase_not_configured" };
  try {
    const { db } = getFirebase();
    const ref = doc(db, "users", session.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { ok: true, state: null };
    const data = snap.data() as any;
    const raw = data?.state;
    if (!raw) return { ok: true, state: null };
    const dec = decodePlayerState(raw);
    if (!dec.ok) return { ok: true, state: null };
    return { ok: true, state: dec.state };
  } catch {
    return { ok: false, reason: "load_failed" };
  }
}

export async function saveCloudPlayerState(session: Session): Promise<CloudSaveResult> {
  if (session.mode !== "firebase") return { ok: true };
  if (!hasFirebaseConfig()) return { ok: false, reason: "firebase_not_configured" };
  try {
    const local = collectLocalPlayerState();
    const progress =
      local.progress ??
      loadProgress() ?? {
        areaId: "village",
        entry: "start",
        playerX: 0,
        playerY: 0,
        hp: 20,
        maxHp: 20,
      };

    const state = encodePlayerStateV1({
      username: session.username,
      inventory: local.inventory,
      equipment: local.equipment,
      flags: local.flags,
      progress,
      updatedAtMs: Date.now(),
    });

    const { db } = getFirebase();
    const ref = doc(db, "users", session.uid);
    // Merge so we don't overwrite createdAt/username fields created during signup.
    await setDoc(
      ref,
      {
        username: session.username,
        state,
        stateUpdatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return { ok: true };
  } catch {
    return { ok: false, reason: "save_failed" };
  }
}


