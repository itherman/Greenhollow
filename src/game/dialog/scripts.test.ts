import { describe, expect, it } from "vitest";
import { validateScript } from "../../core/dialog";
import {
  chestEmpty,
  chestMessage,
  doorLocked,
  elderIntro,
  homeowner1Advice,
  homeowner2Advice,
  homeowner3Advice,
  homeowner4Advice,
  keyFound,
  shopkeeper,
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

  it("homeowner advice scripts validate", () => {
    for (const s of [homeowner1Advice, homeowner2Advice, homeowner3Advice, homeowner4Advice]) {
      expect(validateScript(s)).toEqual({ ok: true });
    }
  });

  it("shopkeeper validates", () => {
    expect(validateScript(shopkeeper)).toEqual({ ok: true });
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


