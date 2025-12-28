import { describe, expect, it } from "vitest";
import { computeMovement } from "./movement";

describe("movement", () => {
  const speed = 100;

  it("stands still when no input, keeps facing", () => {
    expect(
      computeMovement({ up: false, down: false, left: false, right: false }, speed, "left"),
    ).toEqual({ vx: 0, vy: 0, facing: "left", moving: false });
  });

  it("moves left/right with horizontal priority", () => {
    expect(computeMovement({ up: true, down: false, left: true, right: false }, speed, "down"))
      .toEqual({ vx: -100, vy: 0, facing: "left", moving: true });

    expect(computeMovement({ up: false, down: true, left: false, right: true }, speed, "down"))
      .toEqual({ vx: 100, vy: 0, facing: "right", moving: true });
  });

  it("moves up/down when no horizontal input", () => {
    expect(computeMovement({ up: true, down: false, left: false, right: false }, speed, "down"))
      .toEqual({ vx: 0, vy: -100, facing: "up", moving: true });

    expect(computeMovement({ up: false, down: true, left: false, right: false }, speed, "up"))
      .toEqual({ vx: 0, vy: 100, facing: "down", moving: true });
  });

  it("cancels out opposing inputs", () => {
    expect(computeMovement({ up: true, down: true, left: false, right: false }, speed, "up"))
      .toEqual({ vx: 0, vy: 0, facing: "up", moving: false });
    expect(computeMovement({ up: false, down: false, left: true, right: true }, speed, "right"))
      .toEqual({ vx: 0, vy: 0, facing: "right", moving: false });
  });
});


