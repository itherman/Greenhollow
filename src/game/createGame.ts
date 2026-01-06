import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { WorldScene } from "./scenes/WorldScene";
import { computeGameBaseSize } from "../core/gameViewportPolicy";
import { ARCADE_TILE_BIAS } from "../core/physicsTuning";
import { installTestHarness } from "../testing/testHarness";

export function createGame(parent: string): Phaser.Game {
  const base =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    typeof window === "undefined" ? { width: 960, height: 540 } : computeGameBaseSize(window.innerWidth, window.innerHeight);

  const config: Phaser.Types.Core.GameConfig = {
    // Playwright/automation in headless Chromium can fail to render WebGL reliably. Prefer CANVAS
    // when `navigator.webdriver` is set (true under Playwright/Selenium/etc).
    type: typeof navigator !== "undefined" && (navigator as any).webdriver ? Phaser.CANVAS : Phaser.AUTO,
    parent,
    // Always FIT (no crop). Base resolution is orientation-aware to reduce extreme letterboxing.
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: base.width,
      height: base.height,
    },
    backgroundColor: "#101418",
    pixelArt: true,
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true,
    },
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
        tileBias: ARCADE_TILE_BIAS,
      },
    },
    scene: [BootScene, WorldScene],
  };

  const game = new Phaser.Game(config);
  installTestHarness(game);
  return game;
}

