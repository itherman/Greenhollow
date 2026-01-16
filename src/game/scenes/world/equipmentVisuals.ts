import type { EquipmentState } from "../../../core/equipment";
import type { ItemId } from "../../../core/inventory";

export type ArmorSprites = {
  head?: SpriteLike;
  body?: SpriteLike;
  legs?: SpriteLike;
};

export type SpriteLike = {
  visible?: boolean;
  texture?: unknown;
  frame?: number | string;
  x?: number;
  y?: number;
  depth?: number;
  setTexture: (key: string) => SpriteLike;
  setFrame: (frame: number | string) => SpriteLike;
  setPosition: (x: number, y: number) => SpriteLike;
  setVisible: (visible: boolean) => SpriteLike;
  setDepth: (depth: number) => SpriteLike;
};

export type ArmorVisualState = {
  headTexture?: string;
  bodyTexture?: string;
  legsTexture?: string;
};

const ARMOR_TEXTURES: Partial<Record<ItemId, Partial<ArmorVisualState>>> = {
  leather_armor: { bodyTexture: "player_armor_body_leather" },
  iron_armor: { bodyTexture: "player_armor_body_iron" },
  mythril_armor: { bodyTexture: "player_armor_body_mythril" },
  mythril_helm: { headTexture: "player_armor_head_mythril" },
  mythril_leggings: { legsTexture: "player_armor_legs_mythril" },
  scout_boots: { legsTexture: "player_armor_legs_scout" },
};

/**
 * Maps equipment to overlay texture keys.
 *
 * Kept pure so it can be unit tested without Phaser.
 */
export function computeArmorVisualState(equipment: EquipmentState): ArmorVisualState {
  const state: ArmorVisualState = {};
  const merge = (itemId: ItemId | null) => {
    if (!itemId) return;
    const tex = ARMOR_TEXTURES[itemId];
    if (!tex) return;
    if (tex.bodyTexture) state.bodyTexture = tex.bodyTexture;
    if (tex.headTexture) state.headTexture = tex.headTexture;
    if (tex.legsTexture) state.legsTexture = tex.legsTexture;
  };
  merge(equipment.bodyArmorItemId as ItemId | null);
  merge(equipment.headArmorItemId as ItemId | null);
  merge(equipment.legArmorItemId as ItemId | null);
  return state;
}

/**
 * Applies overlay textures + visibility for armor sprites.
 *
+ * Uses structural sprite types so it can be unit tested without Phaser.
 */
export function applyArmorVisuals(args: {
  sprites: ArmorSprites;
  equipment: EquipmentState;
  frame: number | string;
  player: { x: number; y: number };
  baseDepth: number;
  textureExists?: (key: string) => boolean;
}): ArmorSprites {
  const { sprites, equipment, frame, player, baseDepth, textureExists } = args;
  const visuals = computeArmorVisualState(equipment);
  const exists = textureExists ?? (() => true);

  const sync = (sprite: SpriteLike | undefined, texture: string | undefined, depthOffset: number) => {
    if (!sprite) return sprite;
    if (!texture || !exists(texture)) {
      sprite.setVisible(false);
      return sprite;
    }
    sprite.setTexture(texture);
    sprite.setFrame(frame);
    sprite.setPosition(player.x, player.y);
    sprite.setDepth(baseDepth + depthOffset);
    sprite.setVisible(true);
    return sprite;
  };

  return {
    head: sync(sprites.head, visuals.headTexture, 0.2),
    body: sync(sprites.body, visuals.bodyTexture, 0.1),
    legs: sync(sprites.legs, visuals.legsTexture, 0.05),
  };
}
