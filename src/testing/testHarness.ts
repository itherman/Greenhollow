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
  if (!(scene as any).scene?.isActive?.()) return null;
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
      const viewX = (world.x - cam.worldView.x) * cam.zoom + (cam.x ?? 0);
      const viewY = (world.y - cam.worldView.y) * cam.zoom + (cam.y ?? 0);
      return { x: rect.left + viewX, y: rect.top + viewY };
    },
    tileCenterToScreen: (tile) => {
      const tileSize = 32;
      return harness.worldToScreen({
        x: (tile.x + 0.5) * tileSize,
        y: (tile.y + 0.5) * tileSize,
      });
    },
  };

  window.__GREENHOLLOW_TEST_HOOKS__ = harness;
}

export function getInstalledTestHarness(): TestHarness | undefined {
  if (typeof window === "undefined") return undefined;
  return window.__GREENHOLLOW_TEST_HOOKS__;
}
