import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { installTestHarness, type TestHarness } from "./testHarness";

type Rect = { left: number; top: number };

function makeGame(opts: { active: boolean; areaId?: string }) {
  const scene: any = {
    area: opts.areaId ? { id: opts.areaId } : undefined,
    player: { x: 100, y: 200 },
    dialog: { open: false, scriptId: undefined, nodeId: undefined },
    cameras: { main: { worldView: { x: 0, y: 0 }, zoom: 1, x: 0, y: 0 } },
    game: {
      canvas: {
        width: 1000,
        height: 500,
        getBoundingClientRect: (): Rect => ({ left: 10, top: 20 }),
      },
    },
    sys: { settings: { active: opts.active } },
  };

  const game: any = {
    scene: {
      getScene: (key: string) => (key === "WorldScene" ? scene : undefined),
      isActive: (key: string) => key === "WorldScene" && opts.active,
    },
  };

  return { game, scene };
}

describe("testHarness", () => {
  const prevWindow = (globalThis as any).window;

  beforeEach(() => {
    (globalThis as any).window = {};
  });

  afterEach(() => {
    (globalThis as any).window = prevWindow;
  });

  it("getState() returns null until WorldScene is active", () => {
    const { game } = makeGame({ active: false, areaId: "village" });
    installTestHarness(game);
    const harness = (globalThis as any).window.__GREENHOLLOW_TEST_HOOKS__ as TestHarness | undefined;
    expect(harness).toBeTruthy();
    expect(harness!.getState()).toBeNull();
  });

  it("getState() returns area/player/dialog when WorldScene is active", () => {
    const { game } = makeGame({ active: true, areaId: "village" });
    installTestHarness(game);
    const harness = (globalThis as any).window.__GREENHOLLOW_TEST_HOOKS__ as TestHarness | undefined;
    expect(harness).toBeTruthy();
    expect(harness!.getState()).toEqual({
      areaId: "village",
      player: { x: 100, y: 200 },
      dialog: { open: false, scriptId: undefined, nodeId: undefined },
    });
  });

  it("worldToScreen() accounts for CSS scaling (Scale.FIT)", () => {
    const { game } = makeGame({ active: true, areaId: "village" });
    // Make the canvas display half-size via bounding rect.
    game.scene.getScene("WorldScene").game.canvas.getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      width: 500,
      height: 250,
    });
    installTestHarness(game);
    const harness = (globalThis as any).window.__GREENHOLLOW_TEST_HOOKS__ as TestHarness;
    const p = harness.worldToScreen({ x: 100, y: 50 });
    // With scale=0.5, world(100,50) should map to (10+50, 20+25)
    expect(p).toEqual({ x: 60, y: 45 });
  });

  it("teleportToTileCenter() moves the player to the requested tile center", () => {
    const { game, scene } = makeGame({ active: true, areaId: "village" });
    // Give the fake player sprite the Phaser-ish methods we call.
    scene.player.setPosition = (x: number, y: number) => {
      scene.player.x = x;
      scene.player.y = y;
    };
    scene.player.setVelocity = (_vx: number, _vy: number) => {};

    installTestHarness(game);
    const harness = (globalThis as any).window.__GREENHOLLOW_TEST_HOOKS__ as TestHarness;
    const ok = harness.teleportToTileCenter({ x: 13, y: 9 });
    expect(ok).toBe(true);
    expect(harness.getState()?.player).toEqual({ x: (13 + 0.5) * 32, y: (9 + 0.5) * 32 });
  });
});


