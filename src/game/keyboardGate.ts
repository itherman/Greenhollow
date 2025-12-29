import type Phaser from "phaser";

type MaybeKeyboard =
  | { enabled?: boolean }
  | Phaser.Input.Keyboard.KeyboardManager
  | Phaser.Input.Keyboard.KeyboardPlugin
  | null
  | undefined;

export type GameWithKeyboard = {
  input?: {
    keyboard?: MaybeKeyboard;
  };
};

/**
 * Safely enable/disable Phaser keyboard input on a game-like object.
 *
 * We use this to avoid Phaser capturing WASD while a DOM text input is focused
 * (e.g. the auth overlay).
 */
export function setGameKeyboardEnabled(game: GameWithKeyboard | null | undefined, enabled: boolean): void {
  const kb = game?.input?.keyboard;
  if (!kb) return;
  if ("enabled" in kb && typeof (kb as any).enabled === "boolean") {
    (kb as any).enabled = enabled;
  }
}


