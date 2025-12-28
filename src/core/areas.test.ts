import { describe, expect, it } from "vitest";
import { getArea, validateArea } from "./areas";

describe("areas", () => {
  it("all areas validate", () => {
    for (const id of ["village", "woods", "cave", "house", "hallway"] as const) {
      const area = getArea(id);
      const v = validateArea(area);
      expect(v).toEqual({ ok: true });
    }
  });

  it("woods border is trees (tile 5) except at carved openings", () => {
    const a = getArea("woods");
    const openings = new Set<string>();
    for (const ex of a.exits) {
      for (let yy = ex.rect.y; yy < ex.rect.y + ex.rect.h; yy++) {
        for (let xx = ex.rect.x; xx < ex.rect.x + ex.rect.w; xx++) {
          openings.add(`${xx},${yy}`);
        }
      }
    }
    for (let x = 0; x < a.width; x++) {
      const topKey = `${x},0`;
      const botKey = `${x},${a.height - 1}`;
      if (!openings.has(topKey)) expect(a.tiles[0]![x]).toBe(5);
      if (!openings.has(botKey)) expect(a.tiles[a.height - 1]![x]).toBe(5);
    }
    for (let y = 0; y < a.height; y++) {
      const leftKey = `0,${y}`;
      const rightKey = `${a.width - 1},${y}`;
      if (!openings.has(leftKey)) expect(a.tiles[y]![0]).toBe(5);
      if (!openings.has(rightKey)) expect(a.tiles[y]![a.width - 1]).toBe(5);
    }
  });

  it("village border is trees (tile 5) except at the woods gate opening", () => {
    const a = getArea("village");
    const openings = new Set<string>();
    for (const ex of a.exits) {
      // Only border exits create openings; internal exits (like house) are not on the border.
      const isBorder =
        ex.rect.x === 0 || ex.rect.y === 0 || ex.rect.x + ex.rect.w === a.width || ex.rect.y + ex.rect.h === a.height;
      if (!isBorder) continue;
      for (let yy = ex.rect.y; yy < ex.rect.y + ex.rect.h; yy++) {
        for (let xx = ex.rect.x; xx < ex.rect.x + ex.rect.w; xx++) {
          openings.add(`${xx},${yy}`);
        }
      }
    }
    for (let x = 0; x < a.width; x++) {
      const topKey = `${x},0`;
      const botKey = `${x},${a.height - 1}`;
      if (!openings.has(topKey)) expect(a.tiles[0]![x]).toBe(5);
      if (!openings.has(botKey)) expect(a.tiles[a.height - 1]![x]).toBe(5);
    }
    for (let y = 0; y < a.height; y++) {
      const leftKey = `0,${y}`;
      const rightKey = `${a.width - 1},${y}`;
      if (!openings.has(leftKey)) expect(a.tiles[y]![0]).toBe(5);
      if (!openings.has(rightKey)) expect(a.tiles[y]![a.width - 1]).toBe(5);
    }
  });

  it("village path reaches the house entrance", () => {
    const a = getArea("village");
    const gateY = Math.floor(a.height / 2);
    // Path should be carved from the gate line up to the house entrance at (9,10).
    for (let y = 10; y <= gateY; y++) {
      expect(a.tiles[y]![9]).toBe(4);
    }
  });
});


