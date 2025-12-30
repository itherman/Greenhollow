import { describe, expect, it } from "vitest";
import { SHOP_CATALOG } from "./shopCatalog";

describe("shopCatalog", () => {
  it("has unique item ids and non-negative prices", () => {
    const seen = new Set<string>();
    for (const e of SHOP_CATALOG) {
      expect(e.priceCoins).toBeGreaterThanOrEqual(0);
      expect(seen.has(e.itemId)).toBe(false);
      seen.add(e.itemId);
    }
  });
});


