import type { ItemId } from "./inventory";

export type MeleeWeaponStats = {
  damage: number;
  cooldownMs: number;
  reachPx: number;
  widthPx: number;
  heightPx: number;
  textureKey: string;
};

export type ShopCatalogEntry =
  | {
      kind: "weapon";
      itemId: ItemId;
      priceCoins: number;
      grantQty: 1;
      melee: MeleeWeaponStats;
    }
  | {
      kind: "food";
      itemId: ItemId;
      priceCoins: number;
      grantQty: number;
      healHp: number;
    }
  | {
      kind: "armor";
      itemId: ItemId;
      priceCoins: number;
      grantQty: 1;
      maxHpBonus: number;
    }
  | {
      kind: "ammo";
      itemId: ItemId;
      priceCoins: number;
      grantQty: number;
    };

export const SHOP_CATALOG: ShopCatalogEntry[] = [
  {
    kind: "weapon",
    itemId: "dagger",
    priceCoins: 40,
    grantQty: 1,
    melee: { damage: 1, cooldownMs: 190, reachPx: 14, widthPx: 18, heightPx: 14, textureKey: "item_dagger" },
  },
  {
    kind: "weapon",
    itemId: "sword",
    priceCoins: 60,
    grantQty: 1,
    melee: { damage: 1, cooldownMs: 260, reachPx: 18, widthPx: 22, heightPx: 16, textureKey: "item_sword" },
  },
  {
    kind: "weapon",
    itemId: "longsword",
    priceCoins: 120,
    grantQty: 1,
    melee: { damage: 2, cooldownMs: 300, reachPx: 22, widthPx: 24, heightPx: 16, textureKey: "item_longsword" },
  },
  {
    kind: "weapon",
    itemId: "spear",
    priceCoins: 90,
    grantQty: 1,
    melee: { damage: 1, cooldownMs: 320, reachPx: 28, widthPx: 18, heightPx: 14, textureKey: "item_spear" },
  },
  {
    kind: "weapon",
    itemId: "warhammer",
    priceCoins: 310,
    grantQty: 1,
    melee: { damage: 3, cooldownMs: 440, reachPx: 22, widthPx: 22, heightPx: 18, textureKey: "item_warhammer" },
  },
  { kind: "ammo", itemId: "arrows", priceCoins: 15, grantQty: 25 },
  { kind: "food", itemId: "bread", priceCoins: 12, grantQty: 1, healHp: 6 },
  { kind: "food", itemId: "stew", priceCoins: 30, grantQty: 1, healHp: 16 },
  { kind: "food", itemId: "herbal_tonic", priceCoins: 55, grantQty: 1, healHp: 22 },
  { kind: "armor", itemId: "leather_armor", priceCoins: 80, grantQty: 1, maxHpBonus: 6 },
  { kind: "armor", itemId: "iron_armor", priceCoins: 160, grantQty: 1, maxHpBonus: 12 },
  { kind: "armor", itemId: "scout_boots", priceCoins: 110, grantQty: 1, maxHpBonus: 8 },
  { kind: "armor", itemId: "mythril_helm", priceCoins: 260, grantQty: 1, maxHpBonus: 10 },
  { kind: "armor", itemId: "mythril_leggings", priceCoins: 320, grantQty: 1, maxHpBonus: 14 },
  { kind: "armor", itemId: "mythril_armor", priceCoins: 420, grantQty: 1, maxHpBonus: 18 },
];

export function getShopEntry(itemId: ItemId): ShopCatalogEntry | null {
  return SHOP_CATALOG.find((e) => e.itemId === itemId) ?? null;
}

export function isMeleeWeapon(itemId: ItemId | null): itemId is ItemId {
  if (!itemId) return false;
  const e = getShopEntry(itemId);
  return !!e && e.kind === "weapon";
}

export function isFoodItem(itemId: ItemId | null): itemId is ItemId {
  if (!itemId) return false;
  const e = getShopEntry(itemId);
  return !!e && e.kind === "food";
}

export function isArmorItem(itemId: ItemId | null): itemId is ItemId {
  if (!itemId) return false;
  const e = getShopEntry(itemId);
  return !!e && e.kind === "armor";
}

export function getMeleeWeaponStats(itemId: ItemId | null): MeleeWeaponStats | null {
  if (!itemId) return null;
  const e = getShopEntry(itemId);
  if (!e || e.kind !== "weapon") return null;
  return e.melee;
}

export function getFoodHeal(itemId: ItemId | null): number {
  const e = itemId ? getShopEntry(itemId) : null;
  return e && e.kind === "food" ? e.healHp : 0;
}

export function getArmorBonus(itemId: ItemId | null): number {
  const e = itemId ? getShopEntry(itemId) : null;
  return e && e.kind === "armor" ? e.maxHpBonus : 0;
}
