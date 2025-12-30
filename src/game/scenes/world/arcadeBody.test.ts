import { describe, expect, it, vi } from "vitest";
import { configureStaticPickupBody } from "./arcadeBody";

describe("configureStaticPickupBody", () => {
  it("configures a body as a static pickup with the given hitbox", () => {
    const body = {
      setAllowGravity: vi.fn(),
      setImmovable: vi.fn(),
      setSize: vi.fn(),
      setOffset: vi.fn(),
    };

    configureStaticPickupBody(body, { w: 12, h: 34, offsetX: 5, offsetY: 6 });

    expect(body.setAllowGravity).toHaveBeenCalledWith(false);
    expect(body.setImmovable).toHaveBeenCalledWith(true);
    expect(body.setSize).toHaveBeenCalledWith(12, 34);
    expect(body.setOffset).toHaveBeenCalledWith(5, 6);
  });
});

