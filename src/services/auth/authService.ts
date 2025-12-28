import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { validateUsername, usernameToSyntheticEmail } from "../../core/username";
import { reserveUsername } from "../../core/usernameReservation";
import { getFirebase, hasFirebaseConfig } from "../firebase/firebase";

export type SignUpInput = { username: string; password: string };
export type SignInInput = { username: string; password: string };

export type AuthResult =
  | { ok: true; uid: string; username: string }
  | { ok: false; reason: "invalid_username" | "username_taken" | "auth_failed" };

/**
 * Username+password sign-up (no email in UI).
 * Internally uses Firebase email/password with a synthetic email.
 *
 * Flow:
 * 1) Create Auth user
 * 2) Reserve username in Firestore (transaction) + create users/{uid}
 * 3) If username is taken, delete auth user to avoid orphaned accounts
 */
export async function signUpWithUsernamePassword(input: SignUpInput): Promise<AuthResult> {
  const v = validateUsername(input.username);
  if (!v.ok) return { ok: false, reason: "invalid_username" };
  if (!hasFirebaseConfig()) return { ok: false, reason: "auth_failed" };

  const username = v.normalized;
  const email = usernameToSyntheticEmail(username);

  try {
    const { auth, db } = getFirebase();
    const cred = await createUserWithEmailAndPassword(auth, email, input.password);

    const uid = cred.user.uid;

    try {
      // Reserve username and create user profile in a single Firestore transaction.
      const usernamesRef = doc(db, "usernames", username);
      const userRef = doc(db, "users", uid);

      const reserved = await runTransaction(db, async (tx) => {
        const existing = await tx.get(usernamesRef);
        if (existing.exists()) return false;
        tx.set(usernamesRef, { uid, createdAt: serverTimestamp() });
        tx.set(userRef, { username, createdAt: serverTimestamp() });
        return true;
      });

      // Double-check via shared core abstraction as well (keeps logic consistent / testable)
      // NOTE: this is redundant in production flow but helps keep the architecture aligned.
      // The source of truth remains the transaction above.
      await reserveUsername(
        { createIfAbsent: async () => reserved },
        username,
        uid,
      );

      if (!reserved) {
        await deleteUser(cred.user);
        return { ok: false, reason: "username_taken" };
      }

      return { ok: true, uid, username };
    } catch (e) {
      // Attempt to cleanup Auth user if Firestore work fails
      try {
        await deleteUser(cred.user);
      } catch {
        // ignore cleanup failure
      }
      throw e;
    }
  } catch {
    return { ok: false, reason: "auth_failed" };
  }
}

export async function signInWithUsernamePassword(input: SignInInput): Promise<AuthResult> {
  const v = validateUsername(input.username);
  if (!v.ok) return { ok: false, reason: "invalid_username" };
  if (!hasFirebaseConfig()) return { ok: false, reason: "auth_failed" };

  const username = v.normalized;
  const email = usernameToSyntheticEmail(username);

  try {
    const { auth } = getFirebase();
    const cred = await signInWithEmailAndPassword(auth, email, input.password);
    return { ok: true, uid: cred.user.uid, username };
  } catch {
    return { ok: false, reason: "auth_failed" };
  }
}


