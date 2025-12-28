import { describe, expect, it, vi } from "vitest";
import { yieldToEventLoop } from "./yield";

describe("yieldToEventLoop", () => {
  it("resolves on a later tick", async () => {
    vi.useFakeTimers();
    const p = yieldToEventLoop().then(() => "done");
    vi.runAllTimers();
    await expect(p).resolves.toBe("done");
    vi.useRealTimers();
  });
});


