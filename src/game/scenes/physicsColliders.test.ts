import { describe, expect, it, vi } from "vitest";
import { addNpcColliders } from "./physicsColliders";

describe("addNpcColliders", () => {
  it("registers player<->npcs and npcs<->worldLayer colliders", () => {
    const collider = vi.fn();
    const physics = { add: { collider } };
    const player = { kind: "player" };
    const npcs = { kind: "npcs" };
    const worldLayer = { kind: "layer" };

    addNpcColliders({ physics, player, npcs, worldLayer });

    expect(collider).toHaveBeenCalledTimes(2);
    expect(collider).toHaveBeenNthCalledWith(1, player, npcs);
    expect(collider).toHaveBeenNthCalledWith(2, npcs, worldLayer);
  });
});

