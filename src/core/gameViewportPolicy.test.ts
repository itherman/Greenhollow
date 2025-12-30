import { describe, expect, it } from "vitest";
import { computeGameBaseSize } from "./gameViewportPolicy";

describe("gameViewportPolicy", () => {
  it("uses landscape base size for landscape viewports", () => {
    expect(computeGameBaseSize(900, 600)).toEqual({ width: 960, height: 540 });
  });

  it("uses portrait base size for portrait viewports", () => {
    expect(computeGameBaseSize(400, 800)).toEqual({ width: 540, height: 960 });
  });
});


