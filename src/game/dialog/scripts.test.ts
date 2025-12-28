import { describe, expect, it } from "vitest";
import { validateScript } from "../../core/dialog";
import {
  chestEmpty,
  chestMessage,
  doorLocked,
  elderIntro,
  keyFound,
  swordFound,
  swordTaken,
  villagerGossip,
} from "./scripts";

describe("dialog scripts", () => {
  it("elderIntro validates", () => {
    expect(validateScript(elderIntro)).toEqual({ ok: true });
  });

  it("villagerGossip validates", () => {
    expect(validateScript(villagerGossip)).toEqual({ ok: true });
  });

  it("chestMessage validates", () => {
    expect(validateScript(chestMessage)).toEqual({ ok: true });
  });

  it("chestEmpty validates", () => {
    expect(validateScript(chestEmpty)).toEqual({ ok: true });
  });

  it("keyFound validates", () => {
    expect(validateScript(keyFound)).toEqual({ ok: true });
  });

  it("doorLocked validates", () => {
    expect(validateScript(doorLocked)).toEqual({ ok: true });
  });

  it("swordFound validates", () => {
    expect(validateScript(swordFound)).toEqual({ ok: true });
  });

  it("swordTaken validates", () => {
    expect(validateScript(swordTaken)).toEqual({ ok: true });
  });
});


