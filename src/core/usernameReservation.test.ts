import { describe, expect, it } from "vitest";
import { reserveUsername, type UsernameReservationStore } from "./usernameReservation";

class InMemoryUsernameStore implements UsernameReservationStore {
  private map = new Map<string, { uid: string }>();

  async createIfAbsent(username: string, data: { uid: string }): Promise<boolean> {
    if (this.map.has(username)) return false;
    this.map.set(username, data);
    return true;
  }
}

describe("reserveUsername", () => {
  it("reserves when absent", async () => {
    const store = new InMemoryUsernameStore();
    await expect(reserveUsername(store, "knight_01", "uid1")).resolves.toEqual({ ok: true });
  });

  it("fails when already taken", async () => {
    const store = new InMemoryUsernameStore();
    await reserveUsername(store, "knight_01", "uid1");
    await expect(reserveUsername(store, "knight_01", "uid2")).resolves.toEqual({
      ok: false,
      reason: "username_taken",
    });
  });
});


