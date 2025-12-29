import { describe, expect, it } from "vitest";
import { setGameKeyboardEnabled, type GameWithKeyboard } from "./keyboardGate";

describe("setGameKeyboardEnabled", () => {
  it("does nothing if keyboard is missing", () => {
    expect(() => setGameKeyboardEnabled({}, false)).not.toThrow();
    expect(() => setGameKeyboardEnabled(null, false)).not.toThrow();
    expect(() => setGameKeyboardEnabled(undefined, false)).not.toThrow();
  });

  it("toggles game.input.keyboard.enabled", () => {
    const game: GameWithKeyboard = { input: { keyboard: { enabled: true } } };
    setGameKeyboardEnabled(game, false);
    expect(game.input?.keyboard?.enabled).toBe(false);
    setGameKeyboardEnabled(game, true);
    expect(game.input?.keyboard?.enabled).toBe(true);
  });
});


