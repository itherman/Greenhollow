import { describe, expect, it } from "vitest";
import { blockExit, clearExitBlockIfLeft, isExitBlocked } from "./exitGate";

describe("exitGate", () => {
  it("blocks repeated triggers for the same exit while player remains inside the blocked rect", () => {
    // const gate0 = createExitGate();
    const rect = { x: 6, y: 0, w: 1, h: 1 };
    const gate1 = blockExit("toHallway", rect);

    expect(isExitBlocked(gate1, "toHallway", { x: 6, y: 0 })).toBe(true);
    expect(isExitBlocked(gate1, "toHallway", { x: 6, y: 1 })).toBe(false);
    expect(isExitBlocked(gate1, "otherExit", { x: 6, y: 0 })).toBe(false);
  });

  it("clears the block once the player leaves the blocked rect", () => {
    const rect = { x: 6, y: 0, w: 1, h: 1 };
    const gate1 = blockExit("toHallway", rect);

    const stillInside = clearExitBlockIfLeft(gate1, { x: 6, y: 0 });
    expect(isExitBlocked(stillInside, "toHallway", { x: 6, y: 0 })).toBe(true);

    const cleared = clearExitBlockIfLeft(gate1, { x: 6, y: 1 });
    expect(isExitBlocked(cleared, "toHallway", { x: 6, y: 0 })).toBe(false);
  });
});


