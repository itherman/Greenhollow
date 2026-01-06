import type Phaser from "phaser";

export type TestHarnessState = {
  areaId?: string;
  player?: { x: number; y: number };
  dialog?: { open: boolean; scriptId?: string; nodeId?: string };
};

export type TestHarness = {
  version: string;
  getState: () => TestHarnessState | null;
  worldToScreen: (world: { x: number; y: number }) => { x: number; y: number } | null;
  tileCenterToScreen: (tile: { x: number; y: number }) => { x: number; y: number } | null;
  teleportToTileCenter: (tile: { x: number; y: number }) => boolean;
};

declare global {
  interface Window {
    __GREENHOLLOW_TEST_HOOKS__?: TestHarness;
  }
}

function getWorldScene(game: Phaser.Game) {
  const scene = game.scene.getScene("WorldScene") as
    | (Phaser.Scene & {
        area?: { id?: string };
        player?: { x: number; y: number };
        dialog?: { open: boolean; scriptId?: string; nodeId?: string };
      })
    | undefined;
  if (!scene) return null;
  // IMPORTANT:
  // In current Phaser, `scene.scene.isActive()` expects a scene key argument and can return `false`
  // when called with no args. Prefer the SceneManager check.
  const isActive =
    typeof (game.scene as any)?.isActive === "function"
      ? (game.scene as any).isActive("WorldScene")
      : typeof (scene as any)?.sys?.isActive === "function"
        ? (scene as any).sys.isActive()
        : !!(scene as any)?.sys?.settings?.active;
  if (!isActive) return null;
  return scene;
}

export function installTestHarness(game: Phaser.Game): void {
  if (typeof window === "undefined") return;

  const harness: TestHarness = {
    version: "0.1",
    getState: () => {
      const scene = getWorldScene(game);
      if (!scene) return null;
      return {
        areaId: scene.area?.id,
        player: scene.player ? { x: scene.player.x, y: scene.player.y } : undefined,
        dialog: scene.dialog,
      } satisfies TestHarnessState;
    },
    worldToScreen: (world) => {
      const scene = getWorldScene(game);
      if (!scene) return null;
      const cam = scene.cameras?.main;
      const canvas = scene.game.canvas as HTMLCanvasElement | undefined;
      if (!cam || !canvas) return null;

      const rect = canvas.getBoundingClientRect();
      // Phaser uses an internal canvas size that is often scaled via CSS (e.g. Scale.FIT).
      // Convert internal "camera pixels" into CSS pixels so automation clicks hit the right spot.
      const cw = canvas.width || 1;
      const ch = canvas.height || 1;
      const scaleX = rect.width / cw;
      const scaleY = rect.height / ch;
      const viewX = (world.x - cam.worldView.x) * cam.zoom + (cam.x ?? 0);
      const viewY = (world.y - cam.worldView.y) * cam.zoom + (cam.y ?? 0);
      return { x: rect.left + viewX * scaleX, y: rect.top + viewY * scaleY };
    },
    tileCenterToScreen: (tile) => {
      const tileSize = 32;
      return harness.worldToScreen({
        x: (tile.x + 0.5) * tileSize,
        y: (tile.y + 0.5) * tileSize,
      });
    },
    teleportToTileCenter: (tile) => {
      const scene = getWorldScene(game) as any;
      if (!scene?.player) return false;
      const tileSize = 32;
      const x = (tile.x + 0.5) * tileSize;
      const y = (tile.y + 0.5) * tileSize;
      // Keep Arcade body in sync. Prefer body.reset if available.
      const body = scene.player.body;
      if (body && typeof body.reset === "function") {
        body.reset(x, y);
      } else {
        scene.player.setPosition(x, y);
      }
      if (typeof scene.player.setVelocity === "function") scene.player.setVelocity(0, 0);
      return true;
    },
  };

  window.__GREENHOLLOW_TEST_HOOKS__ = harness;
}

export function getInstalledTestHarness(): TestHarness | undefined {
  if (typeof window === "undefined") return undefined;
  return window.__GREENHOLLOW_TEST_HOOKS__;
}
