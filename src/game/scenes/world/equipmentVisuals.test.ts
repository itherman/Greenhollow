import { describe, expect, it } from "vitest";
import type { EquipmentState } from "../../../core/equipment";
import { applyArmorVisuals, computeArmorVisualState, type SpriteLike } from "./equipmentVisuals";

const emptyEquipment: EquipmentState = { headArmorItemId: null, bodyArmorItemId: null, legArmorItemId: null, heldItemId: null };

describe("equipmentVisuals", () => {
  it("maps equipped armor to overlay textures", () => {
    const visuals = computeArmorVisualState({
      ...emptyEquipment,
      headArmorItemId: "mythril_helm",
      bodyArmorItemId: "iron_armor",
      legArmorItemId: "scout_boots",
    });

    expect(visuals.bodyTexture).toBe("player_armor_body_iron");
    expect(visuals.headTexture).toBe("player_armor_head_mythril");
    expect(visuals.legsTexture).toBe("player_armor_legs_scout");
  });

  it("hides sprites without matching textures", () => {
    const sprites = {
      head: mkSprite(),
      body: mkSprite(),
      legs: mkSprite(),
    };

    const updated = applyArmorVisuals({
      sprites,
      equipment: emptyEquipment,
      frame: 0,
      player: { x: 5, y: 7 },
      baseDepth: 10,
      textureExists: () => true,
    });

    expect(updated.body?.visible).toBe(false);
    expect(updated.head?.visible).toBe(false);
    expect(updated.legs?.visible).toBe(false);
  });

  it("applies textures and positions for equipped pieces", () => {
    const sprites = {
      head: mkSprite(),
      body: mkSprite(),
      legs: mkSprite(),
    };

    const updated = applyArmorVisuals({
      sprites,
      equipment: {
        ...emptyEquipment,
        headArmorItemId: "mythril_helm",
        bodyArmorItemId: "leather_armor",
        legArmorItemId: "mythril_leggings",
      },
      frame: 3,
      player: { x: 12, y: 18 },
      baseDepth: 25,
      textureExists: () => true,
    });

    expect(updated.body?.texture).toBe("player_armor_body_leather");
    expect(updated.body?.frame).toBe(3);
    expect(updated.body?.x).toBe(12);
    expect(updated.body?.y).toBe(18);
    expect(updated.body?.depth).toBeGreaterThan(25);
    expect(updated.head?.visible).toBe(true);
    expect(updated.legs?.visible).toBe(true);
  });
});

function mkSprite() {
  const sprite: SpriteLike & {
    visible: boolean;
    texture?: string;
    frame?: number | string;
    x: number;
    y: number;
    depth: number;
  } = {
    visible: true,
    texture: "",
    frame: "",
    x: 0,
    y: 0,
    depth: 0,
    setTexture(key: string) {
      this.texture = key;
      return this;
    },
    setFrame(frame: number | string) {
      this.frame = frame;
      return this;
    },
    setPosition(x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    },
    setVisible(v: boolean) {
      this.visible = v;
      return this;
    },
    setDepth(d: number) {
      this.depth = d;
      return this;
    },
  };
  return sprite;
}
