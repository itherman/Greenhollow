import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

function rules(): string {
  return readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8");
}

describe("Firestore security rules", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "demo-greenhollow",
      firestore: { rules: rules() },
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it("denies all reads/writes when not signed in", async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(db, "users", "alice")));
    await assertFails(setDoc(doc(db, "users", "alice"), { username: "alice" }));
    await assertFails(getDoc(doc(db, "usernames", "alice")));
    await assertFails(setDoc(doc(db, "usernames", "alice"), { uid: "alice" }));
  });

  it("allows a user to read/write their own users/{uid} doc", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();

    await assertSucceeds(
      setDoc(doc(db, "users", "alice"), { username: "alice", createdAt: "t" }),
    );
    await assertSucceeds(getDoc(doc(db, "users", "alice")));

    // Merge/update should be allowed for cloud save.
    await assertSucceeds(
      setDoc(doc(db, "users", "alice"), { state: { v: 1 } }, { merge: true }),
    );
  });

  it("denies a user from reading/writing other users/{uid} docs", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertSucceeds(setDoc(doc(aliceDb, "users", "alice"), { username: "alice" }));

    await assertFails(getDoc(doc(bobDb, "users", "alice")));
    await assertFails(setDoc(doc(bobDb, "users", "alice"), { username: "hijack" }));
  });

  it("allows username reservation only for the signed-in uid, and only once", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertSucceeds(
      setDoc(doc(aliceDb, "usernames", "alice"), { uid: "alice", createdAt: "t" }),
    );

    // Cannot reserve someone else's uid.
    await assertFails(
      setDoc(doc(bobDb, "usernames", "bob"), { uid: "alice", createdAt: "t" }),
    );

    // Cannot overwrite an existing username.
    await assertFails(
      setDoc(doc(bobDb, "usernames", "alice"), { uid: "bob", createdAt: "t" }),
    );

    // Usernames are immutable.
    await assertFails(
      setDoc(doc(aliceDb, "usernames", "alice"), { uid: "alice", createdAt: "t2" }),
    );
  });

  it("allows public reads of the planned leaderboard, but only owner writes", async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertSucceeds(
      setDoc(doc(aliceDb, "leaderboards", "global", "scores", "alice"), {
        username: "alice",
        score: 10,
        updatedAt: "t",
      }),
    );

    await assertSucceeds(getDoc(doc(publicDb, "leaderboards", "global", "scores", "alice")));
    await assertFails(
      setDoc(doc(bobDb, "leaderboards", "global", "scores", "alice"), {
        username: "alice",
        score: 999,
        updatedAt: "t",
      }),
    );
  });
});


