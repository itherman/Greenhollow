import { describe, expect, it, vi } from "vitest";
import { withMinDuration } from "./loadingOverlay";

describe("withMinDuration", () => {
  it("waits at least the requested duration", async () => {
    vi.useFakeTimers();
    const task = vi.fn(
      async () =>
        await new Promise<number>((resolve) => {
          setTimeout(() => resolve(42), 0);
        })
    );

    const promise = withMinDuration(task, 1000);
    // advance less than min
    await vi.advanceTimersByTimeAsync(200);
    expect(task).toHaveBeenCalledTimes(1);
    let settled = false;
    promise.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(999);
    expect(settled).toBe(true);
    await expect(promise).resolves.toBe(42);
    vi.useRealTimers();
  });
});


