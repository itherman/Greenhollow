export type AreaId = "village" | "woods" | "cave" | "house" | "hallway";
export type EntryId = "fromVillage" | "fromWoods" | "fromCave" | "fromHouse" | "fromHallway" | "start";

/**
 * Tile indices in our generated tilesheet (see WorldScene).
 * - 0: grass
 * - 1: wall (collides)
 * - 2: forest floor
 * - 3: cave floor
 * - 4: dirt path
 * - 5: tree wall (collides)
 */
export type TileId = 0 | 1 | 2 | 3 | 4 | 5;

export type Point = { x: number; y: number };

export type ExitDef = {
  id: string;
  rect: { x: number; y: number; w: number; h: number }; // in tile coords
  toArea: AreaId;
  toEntry: EntryId;
};

export type NpcDef = {
  id: string;
  name: string;
  pos: Point; // tile coords
  dialogScriptId: string;
};

export type AreaDef = {
  id: AreaId;
  name: string;
  width: number; // tiles
  height: number; // tiles
  tiles: TileId[][]; // [y][x]
  spawns: Record<EntryId, Point>;
  exits: ExitDef[];
  npcs: NpcDef[];
};

export function isWalkable(tile: TileId): boolean {
  return tile !== 1 && tile !== 5;
}

export function getTile(area: AreaDef, p: Point): TileId | null {
  if (p.x < 0 || p.y < 0 || p.x >= area.width || p.y >= area.height) return null;
  return area.tiles[p.y]?.[p.x] ?? null;
}

export function validateArea(area: AreaDef): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (area.tiles.length !== area.height) errors.push("tiles_height_mismatch");
  for (let y = 0; y < area.height; y++) {
    const row = area.tiles[y];
    if (!row) {
      errors.push(`missing_row_${y}`);
      continue;
    }
    if (row.length !== area.width) errors.push(`tiles_width_mismatch_row_${y}`);
  }

  for (const [entry, p] of Object.entries(area.spawns) as Array<[EntryId, Point]>) {
    const t = getTile(area, p);
    if (t == null) errors.push(`spawn_oob_${entry}`);
    else if (!isWalkable(t)) errors.push(`spawn_not_walkable_${entry}`);
  }

  for (const ex of area.exits) {
    const { x, y, w, h } = ex.rect;
    if (w <= 0 || h <= 0) errors.push(`exit_bad_size_${ex.id}`);
    if (x < 0 || y < 0 || x + w > area.width || y + h > area.height) errors.push(`exit_oob_${ex.id}`);
    // Exits must be reachable (walkable tiles).
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const t = area.tiles[yy]?.[xx] ?? null;
        if (t == null) errors.push(`exit_missing_tile_${ex.id}`);
        else if (!isWalkable(t)) errors.push(`exit_not_walkable_${ex.id}`);
      }
    }
  }

  for (const npc of area.npcs) {
    const t = getTile(area, npc.pos);
    if (t == null) errors.push(`npc_oob_${npc.id}`);
    else if (!isWalkable(t)) errors.push(`npc_not_walkable_${npc.id}`);
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

function borderWalls(width: number, height: number, fill: TileId): TileId[][] {
  const tiles: TileId[][] = [];
  for (let y = 0; y < height; y++) {
    const row: TileId[] = [];
    for (let x = 0; x < width; x++) {
      const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      row.push(isBorder ? 1 : fill);
    }
    tiles.push(row);
  }
  return tiles;
}

export function makeVillage(): AreaDef {
  const width = 40;
  const height = 28;
  const tiles = borderWalls(width, height, 0);

  // Tree border for the starting area (village), with openings carved below.
  for (let x = 0; x < width; x++) {
    tiles[0]![x] = 5;
    tiles[height - 1]![x] = 5;
  }
  for (let y = 0; y < height; y++) {
    tiles[y]![0] = 5;
    tiles[y]![width - 1] = 5;
  }

  // Small "house" block (slightly smaller than before)
  for (let y = 7; y <= 10; y++) for (let x = 6; x <= 12; x++) tiles[y]![x] = 1;
  // Door opening (walkable)
  tiles[10]![9] = 0;

  // Dirt path from spawn toward woods gate and the house door.
  const gateY = Math.floor(height / 2);
  // Vertical from spawn down to gate line
  for (let y = 3; y <= gateY; y++) {
    if (tiles[y]![3] !== 1) tiles[y]![3] = 4;
  }
  // Horizontal toward woods gate
  for (let x = 3; x < width - 1; x++) {
    if (tiles[gateY]![x] !== 1) tiles[gateY]![x] = 4;
  }
  // Path to house door column
  // NOTE: gateY is below the house door (y=10), so we must iterate upward-to-downward correctly.
  for (let y = 10; y <= gateY; y++) {
    if (tiles[y]![9] !== 1) tiles[y]![9] = 4;
  }
  // Keep the door tile as path so the entrance reads clearly.
  tiles[10]![9] = 4;

  // Carve the woods gate opening through the border wall so the player can step onto the exit zone.
  tiles[gateY - 1]![width - 1] = 4;
  tiles[gateY]![width - 1] = 4;

  return {
    id: "village",
    name: "Village",
    width,
    height,
    tiles,
    spawns: {
      start: { x: 3, y: 3 },
      fromWoods: { x: width - 4, y: Math.floor(height / 2) },
      fromCave: { x: 3, y: height - 4 },
      fromHouse: { x: 9, y: 11 },
      fromHallway: { x: 9, y: 11 },
      fromVillage: { x: 3, y: 3 },
    },
    exits: [
      {
        id: "toWoods",
        rect: { x: width - 1, y: Math.floor(height / 2) - 1, w: 1, h: 2 },
        toArea: "woods",
        toEntry: "fromVillage",
      },
      {
        id: "enterHouse",
        rect: { x: 9, y: 10, w: 1, h: 1 },
        toArea: "house",
        toEntry: "fromVillage",
      },
    ],
    npcs: [
      { id: "elder", name: "Village Elder", pos: { x: 5, y: 5 }, dialogScriptId: "elderIntro" },
      { id: "villager1", name: "Villager", pos: { x: 18, y: 8 }, dialogScriptId: "villagerGossip" },
    ],
  };
}

export function makeWoods(): AreaDef {
  const width = 44;
  const height = 30;
  const tiles = borderWalls(width, height, 2);

  // Replace border with dense trees (tile 5) for a forest feel.
  for (let x = 0; x < width; x++) {
    tiles[0]![x] = 5;
    tiles[height - 1]![x] = 5;
  }
  for (let y = 0; y < height; y++) {
    tiles[y]![0] = 5;
    tiles[y]![width - 1] = 5;
  }

  // Some trees as walls
  for (let y = 5; y < height - 5; y += 3) {
    for (let x = 8; x < width - 8; x += 7) {
      tiles[y]![x] = 5;
      tiles[y]![x + 1] = 5;
    }
  }

  // Carve border openings for area transitions.
  const midY = Math.floor(height / 2);
  tiles[midY - 1]![0] = 2;
  tiles[midY]![0] = 2;
  for (let yy = height - 4; yy <= height - 2; yy++) tiles[yy]![width - 1] = 2;

  return {
    id: "woods",
    name: "Woods",
    width,
    height,
    tiles,
    spawns: {
      fromVillage: { x: 2, y: Math.floor(height / 2) },
      fromCave: { x: width - 4, y: height - 4 },
      fromHouse: { x: 2, y: Math.floor(height / 2) },
      fromHallway: { x: 2, y: Math.floor(height / 2) },
      start: { x: 2, y: Math.floor(height / 2) },
      fromWoods: { x: 2, y: Math.floor(height / 2) },
    },
    exits: [
      {
        id: "toVillage",
        rect: { x: 0, y: Math.floor(height / 2) - 1, w: 1, h: 2 },
        toArea: "village",
        toEntry: "fromWoods",
      },
      {
        id: "toCave",
        rect: { x: width - 1, y: height - 4, w: 1, h: 3 },
        toArea: "cave",
        toEntry: "fromWoods",
      },
    ],
    npcs: [],
  };
}

export function makeCave(): AreaDef {
  const width = 34;
  const height = 24;
  const tiles = borderWalls(width, height, 3);

  // Pillars
  for (let y = 6; y < height - 6; y += 4) {
    for (let x = 6; x < width - 6; x += 6) {
      tiles[y]![x] = 1;
    }
  }

  // Carve border opening back to woods.
  for (let yy = height - 4; yy <= height - 2; yy++) tiles[yy]![0] = 3;

  return {
    id: "cave",
    name: "Cave",
    width,
    height,
    tiles,
    spawns: {
      fromWoods: { x: 2, y: height - 4 },
      fromVillage: { x: 2, y: height - 4 },
      fromHouse: { x: 2, y: height - 4 },
      fromHallway: { x: 2, y: height - 4 },
      start: { x: 2, y: height - 4 },
      fromCave: { x: 2, y: height - 4 },
    },
    exits: [
      {
        id: "toWoods",
        rect: { x: 0, y: height - 4, w: 1, h: 3 },
        toArea: "woods",
        toEntry: "fromCave",
      },
    ],
    npcs: [],
  };
}

export function makeHouse(): AreaDef {
  const width = 14;
  const height = 10;
  // Use cave floor (3) as indoor floor for now; walls are tile 1.
  const tiles = borderWalls(width, height, 3);
  // Door opening on bottom wall
  tiles[height - 1]![Math.floor(width / 2)] = 3;
  // Door opening on top wall (locked door to hallway, but must be walkable for exit validation)
  tiles[0]![Math.floor(width / 2)] = 3;

  return {
    id: "house",
    name: "House",
    width,
    height,
    tiles,
    spawns: {
      fromVillage: { x: Math.floor(width / 2), y: height - 2 },
      fromWoods: { x: Math.floor(width / 2), y: height - 2 },
      fromCave: { x: Math.floor(width / 2), y: height - 2 },
      fromHouse: { x: Math.floor(width / 2), y: height - 2 },
      fromHallway: { x: Math.floor(width / 2), y: 2 },
      start: { x: Math.floor(width / 2), y: height - 2 },
    },
    exits: [
      {
        id: "exitToVillage",
        rect: { x: Math.floor(width / 2), y: height - 1, w: 1, h: 1 },
        toArea: "village",
        toEntry: "fromHouse",
      },
      {
        id: "toHallway",
        rect: { x: Math.floor(width / 2), y: 0, w: 1, h: 1 },
        toArea: "hallway",
        toEntry: "fromHouse",
      },
    ],
    npcs: [],
  };
}

export function makeHallway(): AreaDef {
  const width = 14;
  const height = 22;
  const tiles = borderWalls(width, height, 3);
  // Opening back to house on bottom wall
  tiles[height - 1]![Math.floor(width / 2)] = 3;

  return {
    id: "hallway",
    name: "Hallway",
    width,
    height,
    tiles,
    spawns: {
      fromHouse: { x: Math.floor(width / 2), y: height - 2 },
      fromVillage: { x: Math.floor(width / 2), y: height - 2 },
      fromWoods: { x: Math.floor(width / 2), y: height - 2 },
      fromCave: { x: Math.floor(width / 2), y: height - 2 },
      fromHallway: { x: Math.floor(width / 2), y: height - 2 },
      start: { x: Math.floor(width / 2), y: height - 2 },
    },
    exits: [
      {
        id: "backToHouse",
        rect: { x: Math.floor(width / 2), y: height - 1, w: 1, h: 1 },
        toArea: "house",
        toEntry: "fromHallway",
      },
    ],
    npcs: [],
  };
}

export function getArea(areaId: AreaId): AreaDef {
  switch (areaId) {
    case "village":
      return makeVillage();
    case "woods":
      return makeWoods();
    case "cave":
      return makeCave();
    case "house":
      return makeHouse();
    case "hallway":
      return makeHallway();
  }
}


