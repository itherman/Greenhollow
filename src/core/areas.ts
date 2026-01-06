export type AreaId =
  | "village"
  | "woods"
  | "cave"
  | "arcane_keep"
  | "troll_bridge"
  | "troll_clearing"
  | "river_village"
  | "shadow_forest"
  | "house"
  | "hallway"
  | "store"
  | "river_store"
  | "house1"
  | "house2"
  | "house3"
  | "house4";
export type EntryId =
  | "fromVillage"
  | "fromWoods"
  | "fromCave"
  | "fromTrollBridge"
  | "fromTrollClearing"
  | "fromBoat"
  | "fromRiverVillage"
  | "fromShadowForest"
  | "fromHouse"
  | "fromHallway"
  | "fromStore"
  | "fromHouse1"
  | "fromHouse2"
  | "fromHouse3"
  | "fromHouse4"
  | "start";

/**
 * Tile indices in our generated tilesheet (see WorldScene).
 * - 0: grass
 * - 1: wall (collides)
 * - 2: forest floor
 * - 3: cave floor
 * - 4: dirt path
 * - 5: tree wall (collides)
 * - 6: river (collides)
 * - 7: castle floor (walkable stone)
 * - 8: castle wall (collides)
 */
export type TileId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

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
  return tile !== 1 && tile !== 5 && tile !== 6 && tile !== 8;
}

/**
 * Village houses are 7x4 tiles, matching `prop_house_village` in `WorldScene`.
 * These are TOP-LEFT tile coordinates for each house footprint.
 */
export const VILLAGE_HOUSE_TOP_LEFTS: Point[] = [
  { x: 3, y: 3 },
  { x: 18, y: 3 },
  { x: 3, y: 11 },
  { x: 18, y: 11 },
];

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

function fullSpawnMap(p: Point): Record<EntryId, Point> {
  return {
    fromVillage: p,
    fromWoods: p,
    fromCave: p,
    fromTrollBridge: p,
    fromTrollClearing: p,
    fromBoat: p,
    fromRiverVillage: p,
    fromShadowForest: p,
    fromHouse: p,
    fromHallway: p,
    fromStore: p,
    fromHouse1: p,
    fromHouse2: p,
    fromHouse3: p,
    fromHouse4: p,
    start: p,
  };
}

export function makeVillage(): AreaDef {
  // Smaller again, but still fits 4 house footprints + main path.
  const width = 28;
  const height = 18;
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

  // Gate line: slightly below mid so the main path runs in front of top houses.
  const gateY = Math.min(height - 4, Math.max(4, Math.floor(height * 0.6)));

  // House footprints (7x4 each), with a door tile at bottom-center (walkable).
  const doorForHouse = (topLeft: Point) => ({ x: topLeft.x + 3, y: topLeft.y + 3 });
  const frontForDoor = (d: Point) => ({ x: d.x, y: Math.min(height - 2, d.y + 1) });
  const houseDoors = VILLAGE_HOUSE_TOP_LEFTS.map(doorForHouse);
  const houseFronts = houseDoors.map(frontForDoor);

  for (const topLeft of VILLAGE_HOUSE_TOP_LEFTS) {
    for (let y = topLeft.y; y <= topLeft.y + 3; y++) {
      for (let x = topLeft.x; x <= topLeft.x + 6; x++) {
        tiles[y]![x] = 1;
      }
    }
  }
  for (const d of houseDoors) {
    // Door tile is walkable (and we paint it as path to avoid a grass sliver under the door).
    tiles[d.y]![d.x] = 4;
  }

  // Main horizontal path across the village at gateY (connects to woods gate).
  for (let x = 2; x < width; x++) if (tiles[gateY]![x] !== 1) tiles[gateY]![x] = 4;
  // Vertical spur from spawn to the main path.
  for (let y = 2; y <= gateY; y++) if (tiles[y]![2] !== 1) tiles[y]![2] = 4;

  // Northward spur toward the troll bridge gate tucked above the houses.
  const trollGateX = Math.max(4, Math.min(width - 5, Math.floor(width * 0.45)));
  const paintPath = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    if (tiles[y]![x] === 1) return;
    tiles[y]![x] = 4;
  };
  for (let y = 0; y <= gateY; y++) paintPath(trollGateX, y);
  // Small connector so the top-left spawn spur touches the troll lane near the top-left house.
  paintPath(3, 2);

  // House spurs: connect each house-front tile to the main gate line, without cutting through footprints.
  for (let i = 0; i < houseFronts.length; i++) {
    const f = houseFronts[i]!;
    const topLeft = VILLAGE_HOUSE_TOP_LEFTS[i]!;
    const belowGate = f.y > gateY;
    const spurX = belowGate
      ? (topLeft.x - 1 >= 2 ? topLeft.x - 1 : topLeft.x + 7)
      : f.x;

    const y0 = Math.min(gateY, f.y);
    const y1 = Math.max(gateY, f.y);
    for (let y = y0; y <= y1; y++) if (tiles[y]![spurX] !== 1) tiles[y]![spurX] = 4;

    const x0 = Math.min(spurX, f.x);
    const x1 = Math.max(spurX, f.x);
    for (let x = x0; x <= x1; x++) if (tiles[f.y]![x] !== 1) tiles[f.y]![x] = 4;

    // Ensure the front tile itself is path.
    tiles[f.y]![f.x] = 4;
  }

  // Reroute the top-right house spur so the northern lane keeps some breathing room.
  const topRightDoor = houseDoors[1];
  if (topRightDoor) {
    for (let y = topRightDoor.y + 1; y < gateY; y++) if (tiles[y]![topRightDoor.x] === 4) tiles[y]![topRightDoor.x] = 0;
    const rerouteX = Math.max(2, topRightDoor.x - 6);
    const rerouteY = topRightDoor.y + 1;
    paintPath(topRightDoor.x, rerouteY);
    for (let x = Math.min(rerouteX, topRightDoor.x); x <= Math.max(rerouteX, topRightDoor.x); x++) paintPath(x, rerouteY);
    for (let y = rerouteY; y <= gateY; y++) paintPath(rerouteX, y);
  }

  // Carve the woods gate opening through the border wall so the player can step onto the exit zone.
  tiles[gateY - 1]![width - 1] = 0;
  tiles[gateY]![width - 1] = 4;
  // Carve the troll bridge opening on the north border.
  tiles[0]![trollGateX] = 4;

  return {
    id: "village",
    name: "Village",
    width,
    height,
    tiles,
    spawns: {
      start: { x: 2, y: 2 },
      fromWoods: { x: width - 4, y: gateY },
      fromCave: { x: 2, y: height - 4 },
      fromTrollBridge: { x: trollGateX, y: 1 },
      fromTrollClearing: { x: trollGateX, y: 1 },
      fromBoat: { x: trollGateX, y: 1 },
      fromRiverVillage: { x: 2, y: 2 },
      fromShadowForest: { x: 2, y: 2 },
      fromStore: { x: width - 4, y: gateY },
      fromHouse: houseFronts[0]!,
      fromHallway: houseFronts[0]!,
      fromHouse1: houseFronts[0]!,
      fromHouse2: houseFronts[1]!,
      fromHouse3: houseFronts[2]!,
      fromHouse4: houseFronts[3]!,
      fromVillage: { x: 2, y: 2 },
    },
    exits: [
      {
        id: "toWoods",
        rect: { x: width - 1, y: gateY, w: 1, h: 1 },
        toArea: "woods",
        toEntry: "fromVillage",
      },
      {
        id: "toTrollBridge",
        rect: { x: trollGateX, y: 0, w: 1, h: 1 },
        toArea: "troll_bridge",
        toEntry: "fromVillage",
      },
      // Enter house triggers are on the DOOR tiles (so walking on the path doesn't auto-enter).
      // Top-left house is the special interior with the locked door -> hallway.
      { id: "enterHouse1", rect: { x: houseDoors[0]!.x, y: houseDoors[0]!.y, w: 1, h: 1 }, toArea: "house", toEntry: "fromVillage" },
      { id: "enterHouse2", rect: { x: houseDoors[1]!.x, y: houseDoors[1]!.y, w: 1, h: 1 }, toArea: "house2", toEntry: "fromVillage" },
      { id: "enterHouse3", rect: { x: houseDoors[2]!.x, y: houseDoors[2]!.y, w: 1, h: 1 }, toArea: "house3", toEntry: "fromVillage" },
      { id: "enterHouse4", rect: { x: houseDoors[3]!.x, y: houseDoors[3]!.y, w: 1, h: 1 }, toArea: "house4", toEntry: "fromVillage" },
    ],
    npcs: [
      { id: "elder", name: "Village Elder", pos: { x: 13, y: gateY - 2 }, dialogScriptId: "elderIntro" },
      { id: "homeowner1", name: "Homeowner", pos: { x: VILLAGE_HOUSE_TOP_LEFTS[0]!.x + 3, y: VILLAGE_HOUSE_TOP_LEFTS[0]!.y + 4 }, dialogScriptId: "homeowner1Advice" },
      { id: "homeowner2", name: "Homeowner", pos: { x: VILLAGE_HOUSE_TOP_LEFTS[1]!.x + 3, y: VILLAGE_HOUSE_TOP_LEFTS[1]!.y + 4 }, dialogScriptId: "homeowner2Advice" },
      { id: "homeowner3", name: "Homeowner", pos: { x: VILLAGE_HOUSE_TOP_LEFTS[2]!.x + 3, y: VILLAGE_HOUSE_TOP_LEFTS[2]!.y + 4 }, dialogScriptId: "homeowner3Advice" },
      { id: "homeowner4", name: "Homeowner", pos: { x: VILLAGE_HOUSE_TOP_LEFTS[3]!.x + 3, y: VILLAGE_HOUSE_TOP_LEFTS[3]!.y + 4 }, dialogScriptId: "homeowner4Advice" },
    ],
  };
}

export function makeWoods(): AreaDef {
  const width = 22;
  const height = 15;
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
  // Store opening on the top border (2 tiles wide).
  const storeX = Math.max(2, Math.min(width - 3, Math.floor(width / 2)));
  tiles[0]![storeX] = 2;
  tiles[0]![storeX + 1] = 2;

  // Dirt paths: ensure there's a clear route between village <-> store <-> cave.
  const canPaintPath = (t: TileId) => t !== 1 && t !== 5;
  const setPath = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    if (!canPaintPath(tiles[y]![x] as TileId)) return;
    tiles[y]![x] = 4;
  };
  // Main east/west trail through the woods at midY.
  for (let x = 0; x < width; x++) setPath(x, midY);
  // Spur down to the cave exit region (right side).
  for (let y = midY; y <= height - 3; y++) {
    setPath(width - 2, y);
    setPath(width - 1, y);
  }
  // Spur up to the store opening.
  for (let y = 0; y <= midY; y++) {
    setPath(storeX, y);
    setPath(storeX + 1, y);
  }

  // Storefront: add a small facade along the top border with a centered door.
  const storeFrontX0 = Math.max(1, storeX - 2);
  const storeFrontX1 = Math.min(width - 2, storeX + 3);
  for (let x = storeFrontX0; x <= storeFrontX1; x++) tiles[0]![x] = 1;
  tiles[0]![storeX] = 3;
  tiles[0]![storeX + 1] = 3;
  for (let x = storeFrontX0; x <= storeFrontX1; x++) {
    if (tiles[1]![x] !== 1) tiles[1]![x] = 3;
  }
  tiles[1]![storeX] = 4;
  tiles[1]![storeX + 1] = 4;

  return {
    id: "woods",
    name: "Woods",
    width,
    height,
    tiles,
    spawns: {
      fromVillage: { x: 2, y: Math.floor(height / 2) },
      fromCave: { x: width - 4, y: height - 4 },
      fromTrollBridge: { x: 2, y: Math.floor(height / 2) },
      fromTrollClearing: { x: 2, y: Math.floor(height / 2) },
      fromBoat: { x: 2, y: Math.floor(height / 2) },
      fromRiverVillage: { x: 2, y: Math.floor(height / 2) },
      fromShadowForest: { x: 2, y: Math.floor(height / 2) },
      fromHouse: { x: 2, y: Math.floor(height / 2) },
      fromHouse1: { x: 2, y: Math.floor(height / 2) },
      fromHouse2: { x: 2, y: Math.floor(height / 2) },
      fromHouse3: { x: 2, y: Math.floor(height / 2) },
      fromHouse4: { x: 2, y: Math.floor(height / 2) },
      fromHallway: { x: 2, y: Math.floor(height / 2) },
      fromStore: { x: storeX, y: 3 },
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
        id: "toStore",
        rect: { x: storeX, y: 1, w: 2, h: 2 },
        toArea: "store",
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
  const width = 17;
  const height = 12;
  // Start as solid rock; carve corridors and a single cathedral room.
  const tiles = borderWalls(width, height, 1);

  const setFloor = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    tiles[y]![x] = 3;
  };
  const carveH = (y: number, x0: number, x1: number) => {
    const a = Math.min(x0, x1);
    const b = Math.max(x0, x1);
    for (let x = a; x <= b; x++) setFloor(x, y);
  };
  const carveV = (x: number, y0: number, y1: number) => {
    const a = Math.min(y0, y1);
    const b = Math.max(y0, y1);
    for (let y = a; y <= b; y++) setFloor(x, y);
  };
  const carveRect = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setFloor(x, y);
  };

  // Entrance opening back to woods.
  for (let yy = height - 4; yy <= height - 2; yy++) setFloor(0, yy);

  // Main corridor from entrance toward the center.
  carveH(height - 4, 0, 6); // y=8, x 0..6
  carveV(6, 5, height - 4); // x=6, y 5..8

  // Junction toward the cathedral room.
  carveH(5, 6, 9); // y=5, x 6..9

  // Cathedral/open area (single main room).
  carveRect(9, 1, 14, 6); // 6x6 room in the top-right

  // Side hallway 1: small annex room off the junction.
  carveH(5, 4, 6);
  carveV(4, 4, 5);
  carveRect(2, 3, 4, 4);

  // Side hallway 2: short dead-end branch near the entrance corridor.
  carveV(6, height - 2, height - 4); // x=6, y 10..8
  carveH(height - 2, 6, 8); // y=10, x 6..8

  return {
    id: "cave",
    name: "Cave",
    width,
    height,
    tiles,
    spawns: {
      fromWoods: { x: 2, y: height - 4 },
      fromVillage: { x: 2, y: height - 4 },
      fromTrollBridge: { x: 2, y: height - 4 },
      fromTrollClearing: { x: 2, y: height - 4 },
      fromBoat: { x: 2, y: height - 4 },
      fromRiverVillage: { x: 2, y: height - 4 },
      fromShadowForest: { x: 2, y: height - 4 },
      fromHouse: { x: 2, y: height - 4 },
      fromHouse1: { x: 2, y: height - 4 },
      fromHouse2: { x: 2, y: height - 4 },
      fromHouse3: { x: 2, y: height - 4 },
      fromHouse4: { x: 2, y: height - 4 },
      fromHallway: { x: 2, y: height - 4 },
      fromStore: { x: 2, y: height - 4 },
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

  const doorX = Math.floor(width / 2);
  const spawnFromVillage = { x: doorX, y: height - 2 };
  const spawnFromHallway = { x: doorX, y: 1 }; // just inside the locked door

  return {
    id: "house",
    name: "House",
    width,
    height,
    tiles,
    spawns: {
      start: spawnFromVillage,
      fromVillage: spawnFromVillage,
      fromWoods: spawnFromVillage,
      fromCave: spawnFromVillage,
      fromTrollBridge: spawnFromVillage,
      fromTrollClearing: spawnFromVillage,
      fromBoat: spawnFromVillage,
      fromRiverVillage: spawnFromVillage,
      fromShadowForest: spawnFromVillage,
      fromStore: spawnFromVillage,
      fromHouse: spawnFromVillage,
      fromHouse1: spawnFromVillage,
      fromHouse2: spawnFromVillage,
      fromHouse3: spawnFromVillage,
      fromHouse4: spawnFromVillage,
      fromHallway: spawnFromHallway,
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

function makeSimpleHouseInterior(params: { id: AreaId; backEntry: EntryId; name: string }): AreaDef {
  const width = 9;
  const height = 7;
  const tiles = borderWalls(width, height, 3);
  const doorX = Math.floor(width / 2);
  tiles[height - 1]![doorX] = 3;
  const spawn = { x: doorX, y: height - 2 };

  return {
    id: params.id,
    name: params.name,
    width,
    height,
    tiles,
    spawns: fullSpawnMap(spawn),
    exits: [
      {
        id: "exitToVillage",
        rect: { x: doorX, y: height - 1, w: 1, h: 1 },
        toArea: "village",
        toEntry: params.backEntry,
      },
    ],
    npcs: [],
  };
}

export function makeHouse1(): AreaDef {
  return makeSimpleHouseInterior({ id: "house1", backEntry: "fromHouse1", name: "House" });
}
export function makeHouse2(): AreaDef {
  return makeSimpleHouseInterior({ id: "house2", backEntry: "fromHouse2", name: "House" });
}
export function makeHouse3(): AreaDef {
  return makeSimpleHouseInterior({ id: "house3", backEntry: "fromHouse3", name: "House" });
}
export function makeHouse4(): AreaDef {
  return makeSimpleHouseInterior({ id: "house4", backEntry: "fromHouse4", name: "House" });
}

export function makeTrollBridge(): AreaDef {
  const width = 24;
  const height = 16;
  const tiles = borderWalls(width, height, 2);

  for (let x = 0; x < width; x++) {
    tiles[0]![x] = 5;
    tiles[height - 1]![x] = 5;
  }
  for (let y = 0; y < height; y++) {
    tiles[y]![0] = 5;
    tiles[y]![width - 1] = 5;
  }

  // Barrier splitting the arena with a river and a single bridge crossing.
  const barrierX = Math.floor(width / 2);
  const bridgeY = Math.floor(height / 2);
  const entryX = Math.max(2, Math.floor(width * 0.18));
  const riverCols = [barrierX - 1, barrierX, barrierX + 1];
  for (const x of riverCols) {
    for (let y = 0; y < height - 1; y++) tiles[y]![x] = 6;
  }
  for (let y = height - 1; y >= bridgeY; y--) tiles[y]![entryX] = 4;
  for (let x = entryX; x < width - 1; x++) tiles[bridgeY]![x] = 4;
  tiles[bridgeY]![width - 1] = 4;

  // Cover clusters.
  const cover = [
    { x: 5, y: bridgeY - 3 },
    { x: 4, y: bridgeY + 3 },
    { x: barrierX + 3, y: bridgeY - 2 },
    { x: barrierX + 6, y: bridgeY + 2 },
  ];
  for (const c of cover) {
    tiles[c.y]![c.x] = 5;
    tiles[c.y]![c.x + 1] = 5;
  }

  // Boat dock path on the western bank.
  const boatDock = { x: Math.max(2, barrierX - 2), y: Math.max(2, bridgeY - 4) };
  for (let y = Math.min(boatDock.y, bridgeY); y <= Math.max(boatDock.y, bridgeY); y++) {
    if (tiles[y]![boatDock.x] !== 6) tiles[y]![boatDock.x] = 4;
  }
  if (boatDock.x + 1 < width - 1) tiles[boatDock.y]![boatDock.x + 1] = 4;

  const entrySpawn = { x: entryX, y: height - 3 } as const;
  const boatSpawn = { x: boatDock.x, y: boatDock.y } as const;
  const clearingReturnSpawn = { x: Math.max(width - 5, barrierX + 2), y: bridgeY } as const;

  return {
    id: "troll_bridge",
    name: "Troll Bridge",
    width,
    height,
    tiles,
    spawns: {
      fromVillage: entrySpawn,
      fromWoods: entrySpawn,
      fromCave: entrySpawn,
      fromTrollBridge: entrySpawn,
      fromTrollClearing: clearingReturnSpawn,
      fromBoat: boatSpawn,
      fromRiverVillage: boatSpawn,
      fromShadowForest: boatSpawn,
      fromHouse: entrySpawn,
      fromHouse1: entrySpawn,
      fromHouse2: entrySpawn,
      fromHouse3: entrySpawn,
      fromHouse4: entrySpawn,
      fromHallway: entrySpawn,
      fromStore: entrySpawn,
      start: entrySpawn,
    },
    exits: [
      {
        id: "toVillage",
        rect: { x: entryX, y: height - 1, w: 1, h: 1 },
        toArea: "village",
        toEntry: "fromTrollBridge",
      },
      {
        id: "toTrollClearing",
        rect: { x: width - 1, y: bridgeY, w: 1, h: 1 },
        toArea: "troll_clearing",
        toEntry: "fromTrollBridge",
      },
    ],
    npcs: [{ id: "river_sailor", name: "Sailor", pos: boatSpawn, dialogScriptId: "riverSailor" }],
  };
}

export function makeTrollClearing(): AreaDef {
  const width = 18;
  const height = 14;
  const tiles = borderWalls(width, height, 2);

  for (let x = 0; x < width; x++) {
    tiles[0]![x] = 5;
    tiles[height - 1]![x] = 5;
  }
  for (let y = 0; y < height; y++) {
    tiles[y]![0] = 5;
    tiles[y]![width - 1] = 5;
  }

  // Entry path: start near the bottom-left exit, go up halfway, then turn east toward the bridge.
  const spawn = { x: 2, y: height - 3 };
  const turnY = Math.floor(height / 2);
  for (let y = height - 1; y >= turnY; y--) tiles[y]![spawn.x] = 4;
  const turnEndX = width - 3;
  for (let x = spawn.x; x <= turnEndX; x++) tiles[turnY]![x] = 4;

  const lumps = [
    { x: 4, y: 4 },
    { x: 12, y: 5 },
    { x: 9, y: 9 },
  ];
  for (const l of lumps) {
    tiles[l.y]![l.x] = 5;
    tiles[l.y + 1]![l.x] = 5;
  }

  return {
    id: "troll_clearing",
    name: "Clearing Beyond",
    width,
    height,
    tiles,
    spawns: {
      fromTrollBridge: spawn,
      fromVillage: spawn,
      fromWoods: spawn,
      fromCave: spawn,
      fromTrollClearing: spawn,
      fromBoat: spawn,
      fromRiverVillage: spawn,
      fromShadowForest: spawn,
      fromHouse: spawn,
      fromHouse1: spawn,
      fromHouse2: spawn,
      fromHouse3: spawn,
      fromHouse4: spawn,
      fromHallway: spawn,
      fromStore: spawn,
      start: spawn,
    },
    exits: [
      {
        id: "backToBridge",
        rect: { x: spawn.x, y: height - 1, w: 1, h: 1 },
        toArea: "troll_bridge",
        toEntry: "fromTrollClearing",
      },
    ],
    npcs: [],
  };
}

export function makeRiverVillage(): AreaDef {
  const width = 22;
  const height = 14;
  const tiles = borderWalls(width, height, 0);

  for (let x = 0; x < width; x++) {
    tiles[0]![x] = 5;
    tiles[height - 1]![x] = 5;
  }
  for (let y = 0; y < height; y++) {
    tiles[y]![0] = 5;
    tiles[y]![width - 1] = 5;
  }

  // River inlet on the west side.
  const riverCols = [2, 3, 4];
  for (const x of riverCols) {
    for (let y = 1; y < height - 1; y++) tiles[y]![x] = 6;
  }

  const dock = { x: 5, y: height - 4 };
  // Dock path toward the plaza.
  for (let y = dock.y; y >= 2; y--) tiles[y]![dock.x] = 4;
  const plazaY = Math.floor(height / 2);
  for (let x = dock.x; x < width - 2; x++) tiles[plazaY]![x] = 4;
  const shopX = Math.min(width - 4, Math.floor(width * 0.72));
  for (let y = 2; y <= plazaY; y++) tiles[y]![shopX] = 4;
  // Small market pad.
  for (let y = 1; y <= 3; y++) {
    for (let x = shopX - 1; x <= shopX + 1; x++) tiles[y]![x] = 4;
  }
  tiles[plazaY - 1]![shopX] = 4;
  // Storefront facade along the top wall with a centered doorway.
  const storeFrontX0 = Math.max(1, shopX - 2);
  const storeFrontX1 = Math.min(width - 2, shopX + 3);
  for (let x = storeFrontX0; x <= storeFrontX1; x++) tiles[0]![x] = 1;
  tiles[0]![shopX] = 3;
  tiles[0]![shopX + 1] = 3;
  for (let x = storeFrontX0; x <= storeFrontX1; x++) {
    if (tiles[1]![x] !== 1) tiles[1]![x] = 3;
  }
  tiles[1]![shopX] = 4;
  tiles[1]![shopX + 1] = 4;

  // Scatter trees for texture.
  const copses = [
    { x: 9, y: 5 },
    { x: 13, y: 9 },
    { x: 7, y: 11 },
  ];
  for (const c of copses) {
    tiles[c.y]![c.x] = 5;
    tiles[c.y]![c.x + 1] = 5;
  }

  const spawn = dock;
  const storeFront = { x: shopX, y: 3 };

  return {
    id: "river_village",
    name: "River Village",
    width,
    height,
    tiles,
    spawns: {
      start: spawn,
      fromBoat: spawn,
      fromRiverVillage: spawn,
      fromShadowForest: spawn,
      fromVillage: spawn,
      fromWoods: spawn,
      fromCave: spawn,
      fromTrollBridge: spawn,
      fromTrollClearing: spawn,
      fromHouse: spawn,
      fromHouse1: spawn,
      fromHouse2: spawn,
      fromHouse3: spawn,
      fromHouse4: spawn,
      fromHallway: spawn,
      fromStore: storeFront,
    },
    exits: [
      {
        id: "toRiverStore",
        rect: { x: shopX, y: 1, w: 2, h: 2 },
        toArea: "river_store",
        toEntry: "fromRiverVillage",
      },
    ],
    npcs: [{ id: "river_sailor", name: "Sailor", pos: { x: dock.x, y: dock.y }, dialogScriptId: "riverSailor" }],
  };
}

export function makeShadowForest(): AreaDef {
  const width = 20;
  const height = 16;
  const tiles = borderWalls(width, height, 2);

  for (let x = 0; x < width; x++) {
    tiles[0]![x] = 5;
    tiles[height - 1]![x] = 5;
  }
  for (let y = 0; y < height; y++) {
    tiles[y]![0] = 5;
    tiles[y]![width - 1] = 5;
  }

  // Murky river on the west to meet the ferry.
  for (let y = 1; y < height - 1; y++) {
    tiles[y]![2] = 6;
    tiles[y]![3] = 6;
  }

  const dock = { x: 4, y: height - 3 };
  for (let y = dock.y; y >= 2; y--) tiles[y]![dock.x] = 4;
  const trailY = Math.floor(height * 0.62);
  for (let x = dock.x; x < width - 2; x++) tiles[trailY]![x] = 4;
  const northSpurX = Math.floor(width / 2);
  for (let y = trailY; y >= 3; y--) tiles[y]![northSpurX] = 4;
  const keepGateY = Math.max(2, Math.min(height - 3, trailY - 2));
  for (let y = keepGateY - 1; y <= keepGateY + 1; y++) tiles[y]![width - 1] = 4;
  for (let x = width - 4; x < width - 1; x++) tiles[keepGateY]![x] = 4;

  const thickets = [
    { x: 8, y: 5 },
    { x: 14, y: 9 },
    { x: 11, y: 12 },
  ];
  for (const t of thickets) {
    tiles[t.y]![t.x] = 5;
    tiles[t.y]![t.x + 1] = 5;
  }

  const spawn = dock;

  return {
    id: "shadow_forest",
    name: "Shadowed Wilds",
    width,
    height,
    tiles,
    spawns: {
      start: spawn,
      fromBoat: spawn,
      fromRiverVillage: spawn,
      fromShadowForest: spawn,
      fromVillage: spawn,
      fromWoods: spawn,
      fromCave: spawn,
      fromTrollBridge: spawn,
      fromTrollClearing: spawn,
      fromHouse: spawn,
      fromHouse1: spawn,
      fromHouse2: spawn,
      fromHouse3: spawn,
      fromHouse4: spawn,
      fromHallway: spawn,
      fromStore: spawn,
    },
    exits: [
      {
        id: "toArcaneKeep",
        rect: { x: width - 1, y: keepGateY - 1, w: 1, h: 3 },
        toArea: "arcane_keep",
        toEntry: "fromShadowForest",
      },
    ],
    npcs: [{ id: "river_sailor", name: "Sailor", pos: { x: dock.x, y: dock.y }, dialogScriptId: "riverSailor" }],
  };
}

export function makeArcaneKeep(): AreaDef {
  const width = 30;
  const height = 24;
  const tiles = borderWalls(width, height, 2);

  for (let x = 0; x < width; x++) {
    tiles[0]![x] = 5;
    tiles[height - 1]![x] = 5;
  }
  for (let y = 0; y < height; y++) {
    tiles[y]![0] = 5;
    tiles[y]![width - 1] = 5;
  }

  const gateY = Math.floor(height * 0.55);
  for (let y = gateY - 1; y <= gateY + 1; y++) tiles[y]![0] = 4;
  for (let x = 0; x < width - 6; x++) tiles[gateY]![x] = 4;
  for (let x = 4; x < width - 6; x++) tiles[gateY - 1]![x] = 4;

  const castle = { x: Math.floor(width / 2 - 6), y: Math.floor(height / 2 - 5), w: 12, h: 10 };
  for (let y = castle.y; y < castle.y + castle.h; y++) {
    for (let x = castle.x; x < castle.x + castle.w; x++) {
      const border = x === castle.x || y === castle.y || x === castle.x + castle.w - 1 || y === castle.y + castle.h - 1;
      tiles[y]![x] = border ? 8 : 7;
    }
  }

  // Castle entry (west-facing) plus a simple courtyard apron.
  const gateX = castle.x;
  const gateYInside = castle.y + Math.floor(castle.h / 2);
  tiles[gateYInside]![gateX] = 7;
  tiles[gateYInside]![gateX - 1] = 7;
  tiles[gateYInside]![gateX - 2] = 4;
  tiles[gateYInside - 1]![gateX - 1] = 4;
  tiles[gateYInside + 1]![gateX - 1] = 4;

  // Interior rooms and corridors (three rows, two columns).
  const innerX0 = castle.x + 1;
  const innerX1 = castle.x + castle.w - 2;
  const innerY0 = castle.y + 1;
  const innerY1 = castle.y + castle.h - 2;
  const midX = Math.floor((innerX0 + innerX1) / 2);
  const midY = innerY0 + 3;
  const midY2 = innerY0 + 6;

  for (let y = innerY0; y <= innerY1; y++) {
    if (y === midY || y === midY2) {
      for (let x = innerX0; x <= innerX1; x++) tiles[y]![x] = 8;
      tiles[y]![midX] = 7;
      tiles[y]![midX + 1] = 7;
    }
    tiles[y]![midX] = 7;
  }
  for (let x = innerX0; x <= innerX1; x++) {
    if (x === midX) continue;
    tiles[midY + 1]![x] = 7;
  }
  for (let y = innerY0; y <= innerY1; y++) {
    if (y === midY || y === midY2) continue;
    tiles[y]![midX] = 8;
  }
  const doorSlots = [
    { x: midX, y: midY - 1 },
    { x: midX, y: midY + 2 },
    { x: midX, y: midY2 + 2 },
    { x: innerX0 + 2, y: midY },
    { x: innerX1 - 2, y: midY },
  ];
  for (const d of doorSlots) tiles[d.y]![d.x] = 7;
  // Ensure chest pedestals are walkable stone.
  tiles[gateYInside]![innerX0 + 2] = 7;
  tiles[gateYInside + 2]![innerX1 - 3] = 7;

  // Small courtyard shrubs
  for (const shrub of [
    { x: castle.x - 3, y: gateYInside - 2 },
    { x: castle.x - 4, y: gateYInside + 2 },
    { x: castle.x + castle.w + 2, y: castle.y + 1 },
    { x: castle.x + castle.w + 1, y: castle.y + castle.h - 2 },
  ]) {
    if (shrub.x >= 0 && shrub.x < width && shrub.y >= 0 && shrub.y < height) tiles[shrub.y]![shrub.x] = 5;
  }

  const spawn = { x: 2, y: gateY };

  return {
    id: "arcane_keep",
    name: "Arcane Keep",
    width,
    height,
    tiles,
    spawns: fullSpawnMap(spawn),
    exits: [
      {
        id: "toShadowForest",
        rect: { x: 0, y: gateY - 1, w: 1, h: 3 },
        toArea: "shadow_forest",
        toEntry: "fromShadowForest",
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
    spawns: fullSpawnMap({ x: Math.floor(width / 2), y: height - 2 }),
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

export function makeStore(): AreaDef {
  const width = 12;
  const height = 8;
  const tiles = borderWalls(width, height, 3);
  const doorX = Math.floor(width / 2);
  tiles[height - 1]![doorX] = 3;

  // Simple counter wall with an opening.
  const counterY = 3;
  for (let x = 2; x <= width - 3; x++) tiles[counterY]![x] = 1;
  const buyerOpeningX = Math.min(width - 3, Math.max(2, doorX - 2));
  tiles[counterY]![doorX] = 3;
  tiles[counterY]![buyerOpeningX] = 3;

  return {
    id: "store",
    name: "Store",
    width,
    height,
    tiles,
    spawns: fullSpawnMap({ x: doorX, y: height - 2 }),
    exits: [
      {
        id: "toWoods",
        rect: { x: doorX, y: height - 1, w: 1, h: 1 },
        toArea: "woods",
        toEntry: "fromStore",
      },
    ],
    npcs: [
      { id: "shopkeeper", name: "Shopkeeper", pos: { x: doorX, y: 2 }, dialogScriptId: "shopkeeper" },
      { id: "buyer_npc", name: "Buyer", pos: { x: Math.max(1, doorX - 2), y: 2 }, dialogScriptId: "buyerNpc" },
    ],
  };
}

export function makeRiverStore(): AreaDef {
  const width = 13;
  const height = 8;
  const tiles = borderWalls(width, height, 3);
  const doorX = Math.floor(width / 2);
  tiles[height - 1]![doorX] = 3;

  // Counter with two openings (shop and buyer).
  const counterY = 3;
  for (let x = 2; x <= width - 3; x++) tiles[counterY]![x] = 1;
  const buyerOpeningX = Math.min(width - 3, Math.max(2, doorX - 2));
  tiles[counterY]![doorX] = 3;
  tiles[counterY]![buyerOpeningX] = 3;

  return {
    id: "river_store",
    name: "Rare Market",
    width,
    height,
    tiles,
    spawns: fullSpawnMap({ x: doorX, y: height - 2 }),
    exits: [
      {
        id: "toRiverVillage",
        rect: { x: doorX, y: height - 1, w: 1, h: 1 },
        toArea: "river_village",
        toEntry: "fromStore",
      },
    ],
    npcs: [
      { id: "rare_shopkeeper", name: "Rare Trader", pos: { x: doorX, y: 2 }, dialogScriptId: "rareShopkeeper" },
      { id: "buyer_npc", name: "Buyer", pos: { x: buyerOpeningX, y: 2 }, dialogScriptId: "buyerNpc" },
    ],
  };
}

export const BOAT_ANCHOR_TILES: Partial<Record<AreaId, Point>> = {
  troll_bridge: { x: 10, y: 4 },
  river_village: { x: 5, y: 10 },
  shadow_forest: { x: 4, y: 13 },
};

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
    case "store":
      return makeStore();
    case "river_store":
      return makeRiverStore();
    case "house1":
      return makeHouse1();
    case "house2":
      return makeHouse2();
    case "house3":
      return makeHouse3();
    case "house4":
      return makeHouse4();
    case "troll_bridge":
      return makeTrollBridge();
    case "troll_clearing":
      return makeTrollClearing();
    case "river_village":
      return makeRiverVillage();
    case "shadow_forest":
      return makeShadowForest();
    case "arcane_keep":
      return makeArcaneKeep();
  }
}
