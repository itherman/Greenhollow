import { describe, expect, it } from "vitest";
import { validateScript } from "../../core/dialog";
import {
  chestEmpty,
  chestMessage,
  arcaneChest,
  doorLocked,
  trollDoorLocked,
  elderIntro,
  buyerNpc,
  homeowner1Advice,
  homeowner2Advice,
  homeowner3Advice,
  homeowner4Advice,
  keyFound,
  pouchFull,
  shopkeeper,
  rareShopkeeper,
  swordFound,
  swordTaken,
  villagerGossip,
  riverSailor,
  townPlayer,
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

  it("arcaneChest validates", () => {
    expect(validateScript(arcaneChest)).toEqual({ ok: true });
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

  it("rareShopkeeper validates", () => {
    expect(validateScript(rareShopkeeper)).toEqual({ ok: true });
  });

  it("buyerNpc validates", () => {
    expect(validateScript(buyerNpc)).toEqual({ ok: true });
  });

  it("keyFound validates", () => {
    expect(validateScript(keyFound)).toEqual({ ok: true });
  });

  it("pouchFull validates", () => {
    expect(validateScript(pouchFull)).toEqual({ ok: true });
  });

  it("doorLocked validates", () => {
    expect(validateScript(doorLocked)).toEqual({ ok: true });
  });

  it("trollDoorLocked validates", () => {
    expect(validateScript(trollDoorLocked)).toEqual({ ok: true });
  });

  it("swordFound validates", () => {
    expect(validateScript(swordFound)).toEqual({ ok: true });
  });

  it("swordTaken validates", () => {
    expect(validateScript(swordTaken)).toEqual({ ok: true });
  });

  it("riverSailor validates", () => {
    expect(validateScript(riverSailor)).toEqual({ ok: true });
  });

  it("townPlayer validates", () => {
    expect(validateScript(townPlayer)).toEqual({ ok: true });
  });
});
