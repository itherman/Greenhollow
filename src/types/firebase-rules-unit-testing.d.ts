declare module "@firebase/rules-unit-testing" {
  type Firestore = import("firebase/firestore").Firestore;

  export type RulesTestEnvironment = {
    clearFirestore: () => Promise<void>;
    cleanup: () => Promise<void>;
    authenticatedContext: (uid: string) => { firestore: () => Firestore };
    unauthenticatedContext: () => { firestore: () => Firestore };
  };

  export function initializeTestEnvironment(options: {
    projectId: string;
    firestore: { rules: string };
  }): Promise<RulesTestEnvironment>;
  export function assertFails(promise: Promise<unknown>): Promise<unknown>;
  export function assertSucceeds(promise: Promise<unknown>): Promise<unknown>;
}
