import type Phaser from "phaser";
import type { PlayerProgress } from "../core/playerStateCodec";

export function restartWorldScene(game: Phaser.Game, progress: PlayerProgress) {
  // Stop/start is more reliable than restart when we need to pass extra init data.
  const key = "WorldScene";
  if (game.scene.isActive(key)) game.scene.stop(key);
  game.scene.start(key, {
    areaId: progress.areaId,
    entry: progress.entry,
    progress,
  });
}


