import { describe, expect, it } from "vitest";
import { getArea, validateArea } from "./areas";

describe("areas", () => {
  it("all areas validate", () => {
    for (const id of ["village", "woods", "cave", "house", "hallway", "store", "house1", "house2", "house3", "house4"] as const) {
      const area = getArea(id);
      const v = validateArea(area);
      expect(v).toEqual({ ok: true });
    }
  });

  it("village top-left house enters the special house interior (locked door -> hallway)", () => {
    const a = getArea("village");
    const ex = a.exits.find((e) => e.id === "enterHouse1");
    expect(ex).toBeTruthy();
    expect(ex!.toArea).toBe("house");
  });

  it("entering the special house from the hallway spawns near the locked door", () => {
    const a = getArea("house");
    expect(a.spawns.fromHallway).toEqual({ x: Math.floor(a.width / 2), y: 1 });
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
    const gateY = Math.min(a.height - 4, Math.max(4, Math.floor(a.height * 0.6)));
    const intentionalGrass = new Set([`${a.width - 1},${gateY - 1}`]);
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
      if (!openings.has(topKey) && !intentionalGrass.has(topKey)) expect(a.tiles[0]![x]).toBe(5);
      if (!openings.has(botKey) && !intentionalGrass.has(botKey)) expect(a.tiles[a.height - 1]![x]).toBe(5);
    }
    for (let y = 0; y < a.height; y++) {
      const leftKey = `0,${y}`;
      const rightKey = `${a.width - 1},${y}`;
      if (!openings.has(leftKey) && !intentionalGrass.has(leftKey)) expect(a.tiles[y]![0]).toBe(5);
      if (!openings.has(rightKey) && !intentionalGrass.has(rightKey)) expect(a.tiles[y]![a.width - 1]).toBe(5);
    }
  });

  it("village paths reach each house front tile, and doors are walkable path tiles", () => {
    const a = getArea("village");
    const gateY = Math.min(a.height - 4, Math.max(4, Math.floor(a.height * 0.6)));
    const enterExits = a.exits.filter((e) => e.id.startsWith("enterHouse"));
    expect(enterExits.length).toBe(4);
    for (const ex of enterExits) {
      const doorX = ex.rect.x;
      const doorY = ex.rect.y;
      const frontY = Math.min(a.height - 2, doorY + 1);
      // Door and front are both path tiles (no grass sliver).
      expect(a.tiles[doorY]![doorX]).toBe(4);
      expect(a.tiles[frontY]![doorX]).toBe(4);
      // Main gate line is path across.
      expect(a.tiles[gateY]![doorX]).toBe(4);
    }
  });

  it("cave is a small labyrinth with a single cathedral-like open area plus corridors", () => {
    const a = getArea("cave");
    const isWalkable = (x: number, y: number) => {
      const t = a.tiles[y]?.[x];
      return t != null && t !== 1 && t !== 5;
    };
    const neighbors = (x: number, y: number) => [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ];
    const degree = (x: number, y: number) =>
      neighbors(x, y).reduce((acc, n) => acc + (isWalkable(n.x, n.y) ? 1 : 0), 0);

    // Cathedral heuristic: many tiles with 3+ walkable neighbors, all connected.
    const hi: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < a.height; y++) {
      for (let x = 0; x < a.width; x++) {
        if (!isWalkable(x, y)) continue;
        if (degree(x, y) >= 3) hi.push({ x, y });
      }
    }
    expect(hi.length).toBeGreaterThanOrEqual(12);

    // Ensure the high-degree region is one connected blob (single main open area).
    const key = (p: { x: number; y: number }) => `${p.x},${p.y}`;
    const hiSet = new Set(hi.map(key));
    const visited = new Set<string>();
    const q: Array<{ x: number; y: number }> = [hi[0]!];
    visited.add(key(hi[0]!));
    while (q.length) {
      const cur = q.shift()!;
      for (const n of neighbors(cur.x, cur.y)) {
        const k = key(n);
        if (!hiSet.has(k) || visited.has(k)) continue;
        visited.add(k);
        q.push(n);
      }
    }
    expect(visited.size).toBeGreaterThanOrEqual(12);

    // Corridor heuristic: at least two turn tiles (degree 2 but not straight).
    let turns = 0;
    for (let y = 1; y < a.height - 1; y++) {
      for (let x = 1; x < a.width - 1; x++) {
        if (!isWalkable(x, y)) continue;
        if (degree(x, y) !== 2) continue;
        const n = {
          up: isWalkable(x, y - 1),
          down: isWalkable(x, y + 1),
          left: isWalkable(x - 1, y),
          right: isWalkable(x + 1, y),
        };
        const straight = (n.up && n.down) || (n.left && n.right);
        if (!straight) turns++;
      }
    }
    expect(turns).toBeGreaterThanOrEqual(2);
  });
});

