import { describe, expect, it, vi } from "vitest";
import { addBobbingTween } from "./bobbingTween";

describe("addBobbingTween", () => {
  it("adds a looping yoyo tween with the expected defaults", () => {
    const tweens = { add: vi.fn() };
    const target = { y: 100 };

    addBobbingTween(tweens, target, { baseY: 100 });

    expect(tweens.add).toHaveBeenCalledTimes(1);
    expect(tweens.add).toHaveBeenCalledWith({
      targets: target,
      y: 97,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  });

  it("allows overriding amplitude and duration", () => {
    const tweens = { add: vi.fn() };
    const target = { y: 50 };

    addBobbingTween(tweens, target, { baseY: 50, amplitudePx: 10, durationMs: 700 });

    expect(tweens.add).toHaveBeenCalledWith({
      targets: target,
      y: 40,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  });
});

