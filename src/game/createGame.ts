import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { WorldScene } from "./scenes/WorldScene";

export function createGame(parent: string): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    // Base resolution; Scale Manager will FIT this into the available parent size.
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 960,
      height: 540,
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
      },
    },
    scene: [BootScene, WorldScene],
  };

  return new Phaser.Game(config);
}


