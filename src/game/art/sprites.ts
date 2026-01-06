import Phaser from "phaser";
import { getHeartPattern } from "./heartPattern";

export function ensurePeasantPlayerSpriteSheet(scene: Phaser.Scene) {
  if (scene.textures.exists("player")) return;

  // 4 directions (rows) x 4 frames (cols), each frame 24x24.
  const frameW = 24;
  const frameH = 24;
  const cols = 4;
  const rows = 4;

  const canvas = document.createElement("canvas");
  canvas.width = frameW * cols;
  canvas.height = frameH * rows;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  const px = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  };

  const fill = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  // Palette (simple but shaded)
  const skinL = "#f2c7a5";
  const skinD = "#d8a787";
  const hair = "#5a3a1f";
  const hat = "#6b4f2a";
  const tunicL = "#3aa675";
  const tunicD = "#2d7d59";
  const belt = "#3a2a1a";
  const pants = "#2b3440";
  const boots = "#241a12";

  const clearFrame = (ox: number, oy: number) => ctx.clearRect(ox, oy, frameW, frameH);

  const drawPeasant = (col: number, row: number) => {
    const ox = col * frameW;
    const oy = row * frameH;
    clearFrame(ox, oy);

    // walk phase 0..3
    const phase = col; // 0 stand, 1 stepL, 2 stand, 3 stepR
    const stepL = phase === 1;
    const stepR = phase === 3;

    // Base silhouette (centered)
    // Head (slightly larger than before)
    fill(ox + 10, oy + 4, 4, 4, skinL);
    fill(ox + 10, oy + 7, 4, 1, skinD); // chin shadow

    // Hair/hat brim depending on facing
    if (row === 3) {
      // up: hat top/back
      fill(ox + 9, oy + 3, 6, 3, hat);
    } else {
      // down/left/right: hair + small cap
      fill(ox + 9, oy + 3, 6, 2, hat);
      fill(ox + 10, oy + 5, 4, 1, hair);
    }

    // Torso (tunic) with shading
    fill(ox + 9, oy + 8, 6, 6, tunicL);
    fill(ox + 9, oy + 8, 2, 6, tunicD); // left shadow band
    fill(ox + 9, oy + 12, 6, 1, belt);

    // Arms (simple)
    if (row === 1) {
      // left
      fill(ox + 8, oy + 9, 1, 4, tunicD);
    } else if (row === 2) {
      // right
      fill(ox + 15, oy + 9, 1, 4, tunicD);
    } else {
      // down/up: both sides
      fill(ox + 8, oy + 9, 1, 4, tunicD);
      fill(ox + 15, oy + 9, 1, 4, tunicD);
    }

    // Pants
    fill(ox + 10, oy + 14, 4, 4, pants);
    fill(ox + 10, oy + 14, 1, 4, "#212a33");

    // Boots (animated)
    const leftBootX = ox + 10;
    const rightBootX = ox + 13;
    const bootY = oy + 18;
    if (stepL) {
      fill(leftBootX - 1, bootY, 2, 2, boots);
      fill(rightBootX, bootY, 2, 2, boots);
    } else if (stepR) {
      fill(leftBootX, bootY, 2, 2, boots);
      fill(rightBootX + 1, bootY, 2, 2, boots);
    } else {
      fill(leftBootX, bootY, 2, 2, boots);
      fill(rightBootX, bootY, 2, 2, boots);
    }

    // Facing details
    if (row === 0) {
      // down: simple eyes
      px(ox + 11, oy + 5, "#1b1b1b");
      px(ox + 13, oy + 5, "#1b1b1b");
    } else if (row === 1) {
      // left: nose highlight
      px(ox + 9, oy + 6, skinD);
    } else if (row === 2) {
      // right
      px(ox + 14, oy + 6, skinD);
    } else {
      // up: no face, add a cape-ish shadow
      fill(ox + 9, oy + 8, 6, 2, tunicD);
    }
  };

  // Row order: down(0), left(1), right(2), up(3)
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) drawPeasant(col, row);

  // Phaser runtime accepts canvas sources; TS typing is stricter.
  scene.textures.addSpriteSheet("player", canvas as unknown as HTMLImageElement, {
    frameWidth: frameW,
    frameHeight: frameH,
  });
  scene.textures.get("player").setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export function ensurePeasantPlayerBodyArmorSpriteSheets(scene: Phaser.Scene) {
  const ensure = (key: string, colors: { main: string; shadow: string; strap: string; buckle: string }) => {
    if (scene.textures.exists(key)) return;

    // 4 directions (rows) x 4 frames (cols), each frame 24x24.
    const frameW = 24;
    const frameH = 24;
    const cols = 4;
    const rows = 4;

    const canvas = document.createElement("canvas");
    canvas.width = frameW * cols;
    canvas.height = frameH * rows;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    const fill = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };

    const clearFrame = (ox: number, oy: number) => ctx.clearRect(ox, oy, frameW, frameH);

    const drawFrame = (col: number, row: number) => {
      const ox = col * frameW;
      const oy = row * frameH;
      clearFrame(ox, oy);

      // Torso overlay (matches `ensurePeasantPlayerSpriteSheet` tunic region).
      fill(ox + 9, oy + 8, 6, 6, colors.main);
      fill(ox + 9, oy + 8, 2, 6, colors.shadow);
      // Lower skirt/plates band
      fill(ox + 9, oy + 13, 6, 1, colors.shadow);
      // Simple straps (more visible in down/left/right; subtler for up)
      const strapAlpha = row === 3 ? 0.6 : 1;
      ctx.globalAlpha = strapAlpha;
      fill(ox + 10, oy + 8, 1, 4, colors.strap);
      fill(ox + 13, oy + 8, 1, 4, colors.strap);
      ctx.globalAlpha = 1;
      // Buckle
      fill(ox + 11, oy + 12, 2, 1, colors.buckle);
    };

    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) drawFrame(col, row);

    scene.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, {
      frameWidth: frameW,
      frameHeight: frameH,
    });
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  };

  ensure("player_armor_body_leather", {
    main: "#6b4f2a",
    shadow: "#5b4122",
    strap: "#3a2a1a",
    buckle: "#f5d76e",
  });
  ensure("player_armor_body_iron", {
    main: "#94a3b8",
    shadow: "#64748b",
    strap: "#0b1220",
    buckle: "#f5d76e",
  });
}

export function ensureNpcTextures(scene: Phaser.Scene) {
  const mk = (key: string, draw: (ctx: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) return;
    const c = document.createElement("canvas");
    c.width = 24;
    c.height = 24;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    draw(ctx);
    scene.textures.addImage(key, c as unknown as HTMLImageElement);
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  };

  const drawVillager = (
    ctx: CanvasRenderingContext2D,
    palette: { skin: string; skinShadow: string; hair: string },
  ) => {
    ctx.clearRect(0, 0, 24, 24);
    // tunic
    ctx.fillStyle = "#d97706";
    ctx.fillRect(9, 8, 6, 8);
    ctx.fillStyle = "#b45309";
    ctx.fillRect(9, 8, 2, 8);
    // head
    ctx.fillStyle = palette.skin;
    ctx.fillRect(10, 4, 4, 4);
    ctx.fillStyle = palette.skinShadow;
    ctx.fillRect(10, 7, 4, 1);
    ctx.fillStyle = palette.hair;
    ctx.fillRect(10, 3, 4, 1);
    // boots
    ctx.fillStyle = "#241a12";
    ctx.fillRect(10, 16, 2, 2);
    ctx.fillRect(13, 16, 2, 2);
  };

  const drawShopkeeper = (ctx: CanvasRenderingContext2D, palette: { skin: string; skinShadow: string }) => {
    ctx.clearRect(0, 0, 24, 24);
    // apron
    ctx.fillStyle = "#0ea5e9";
    ctx.fillRect(9, 8, 6, 9);
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(9, 8, 2, 9);
    // undershirt sleeves
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(8, 9, 1, 4);
    ctx.fillRect(15, 9, 1, 4);
    // belt and pouch
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(9, 14, 6, 1);
    ctx.fillRect(14, 13, 2, 2);
    // head + hairband
    ctx.fillStyle = palette.skin;
    ctx.fillRect(10, 4, 4, 4);
    ctx.fillStyle = palette.skinShadow;
    ctx.fillRect(10, 7, 4, 1);
    ctx.fillStyle = "#c084fc";
    ctx.fillRect(10, 3, 4, 1);
    ctx.fillStyle = "#5a3a1f";
    ctx.fillRect(10, 2, 4, 1);
    // boots
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(10, 17, 2, 2);
    ctx.fillRect(13, 17, 2, 2);
  };

  const drawBuyer = (ctx: CanvasRenderingContext2D, palette: { skin: string; skinShadow: string }) => {
    ctx.clearRect(0, 0, 24, 24);
    // cloak
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(8, 7, 8, 10);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(8, 10, 8, 2);
    // scarf
    ctx.fillStyle = "#f97316";
    ctx.fillRect(9, 8, 6, 2);
    ctx.fillRect(9, 10, 2, 2);
    // head
    ctx.fillStyle = palette.skin;
    ctx.fillRect(10, 4, 4, 4);
    ctx.fillStyle = palette.skinShadow;
    ctx.fillRect(10, 7, 4, 1);
    ctx.fillStyle = "#374151";
    ctx.fillRect(9, 3, 6, 1);
    // satchel strap
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(11, 8, 2, 8);
    // boots
    ctx.fillStyle = "#334155";
    ctx.fillRect(10, 17, 2, 2);
    ctx.fillRect(13, 17, 2, 2);
  };

  mk("npc_elder", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    // robe (shaded)
    ctx.fillStyle = "#7c3aed";
    ctx.fillRect(8, 8, 8, 10);
    ctx.fillStyle = "#5b21b6";
    ctx.fillRect(8, 8, 2, 10);
    // head + beard
    ctx.fillStyle = "#f2c7a5";
    ctx.fillRect(10, 4, 4, 4);
    ctx.fillStyle = "#d1d5db";
    ctx.fillRect(10, 8, 4, 3);
    // staff
    ctx.fillStyle = "#6b4f2a";
    ctx.fillRect(6, 6, 1, 14);
    ctx.fillStyle = "#f5d76e";
    ctx.fillRect(6, 5, 1, 1);
    // boots
    ctx.fillStyle = "#241a12";
    ctx.fillRect(10, 18, 2, 2);
    ctx.fillRect(13, 18, 2, 2);
  });

  mk("npc_villager", (ctx) =>
    drawVillager(ctx, { skin: "#f2c7a5", skinShadow: "#d8a787", hair: "#5a3a1f" }),
  );
  mk("npc_villager_dark", (ctx) =>
    drawVillager(ctx, { skin: "#c48a64", skinShadow: "#9f6d45", hair: "#3f260f" }),
  );

  mk("npc_shopkeeper", (ctx) => drawShopkeeper(ctx, { skin: "#f2c7a5", skinShadow: "#d8a787" }));
  mk("npc_shopkeeper_dark", (ctx) => drawShopkeeper(ctx, { skin: "#bf8456", skinShadow: "#9c6a3c" }));

  mk("npc_buyer", (ctx) => drawBuyer(ctx, { skin: "#f2c7a5", skinShadow: "#d8a787" }));
  mk("npc_buyer_dark", (ctx) => drawBuyer(ctx, { skin: "#c48a64", skinShadow: "#9f6d45" }));
  mk("npc_sailor", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    // shirt with stripes
    ctx.fillStyle = "#0ea5e9";
    ctx.fillRect(9, 8, 6, 9);
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(9, 14, 6, 3);
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(9, 9, 6, 2);
    ctx.fillRect(9, 12, 6, 1);
    // head + beard
    ctx.fillStyle = "#f2c7a5";
    ctx.fillRect(10, 4, 4, 4);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(10, 7, 4, 1);
    // cap
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(9, 2, 6, 1);
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(9, 3, 6, 1);
    // boots
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(10, 17, 2, 2);
    ctx.fillRect(13, 17, 2, 2);
  });
}

export function ensureChestTextures(scene: Phaser.Scene) {
  if (scene.textures.exists("chest_closed")) return;

  const mk = (key: string, draw: (ctx: CanvasRenderingContext2D) => void) => {
    const c = document.createElement("canvas");
    c.width = 24;
    c.height = 24;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    draw(ctx);
    scene.textures.addImage(key, c as unknown as HTMLImageElement);
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  };

  mk("chest_closed", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    // base
    ctx.fillStyle = "#6b4f2a";
    ctx.fillRect(6, 10, 12, 8);
    ctx.fillStyle = "#5b4122";
    ctx.fillRect(6, 16, 12, 2);
    // lid
    ctx.fillStyle = "#7a5a30";
    ctx.fillRect(6, 7, 12, 4);
    // latch
    ctx.fillStyle = "#f5d76e";
    ctx.fillRect(11, 11, 2, 3);
  });

  mk("chest_open", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    // base
    ctx.fillStyle = "#6b4f2a";
    ctx.fillRect(6, 12, 12, 6);
    ctx.fillStyle = "#5b4122";
    ctx.fillRect(6, 16, 12, 2);
    // open lid
    ctx.fillStyle = "#7a5a30";
    ctx.fillRect(6, 6, 12, 3);
    ctx.fillStyle = "#3b2a16";
    ctx.fillRect(6, 9, 12, 2);
    // sparkle
    ctx.fillStyle = "#fde68a";
    ctx.fillRect(12, 4, 1, 1);
    ctx.fillRect(11, 5, 1, 1);
    ctx.fillRect(13, 5, 1, 1);
  });
}

export function ensureMonsterTexture(scene: Phaser.Scene) {
  if (scene.textures.exists("monster_slime")) return;
  const c = document.createElement("canvas");
  c.width = 24;
  c.height = 24;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");
  ctx.clearRect(0, 0, 24, 24);

  // Slime body
  ctx.fillStyle = "#16a34a";
  ctx.fillRect(6, 10, 12, 8);
  ctx.fillStyle = "#15803d";
  ctx.fillRect(6, 16, 12, 2);
  // highlight
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(7, 11, 4, 2);
  // eyes
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(10, 13, 1, 1);
  ctx.fillRect(13, 13, 1, 1);
  // mouth
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(11, 15, 2, 1);

  scene.textures.addImage("monster_slime", c as unknown as HTMLImageElement);
  scene.textures.get("monster_slime").setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export function ensureShadowStalkerTexture(scene: Phaser.Scene) {
  if (scene.textures.exists("enemy_shadow_stalker")) return;
  const c = document.createElement("canvas");
  c.width = 24;
  c.height = 24;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");
  ctx.clearRect(0, 0, 24, 24);

  // Body silhouette
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(6, 9, 12, 10);
  ctx.fillStyle = "#111827";
  ctx.fillRect(7, 11, 10, 6);
  // Back spikes
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(8, 7, 2, 3);
  ctx.fillRect(13, 6, 2, 4);
  // Eyes
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(10, 12, 1, 1);
  ctx.fillRect(13, 12, 1, 1);
  // Claws
  ctx.fillStyle = "#c084fc";
  ctx.fillRect(7, 17, 3, 2);
  ctx.fillRect(14, 17, 3, 2);

  scene.textures.addImage("enemy_shadow_stalker", c as unknown as HTMLImageElement);
  scene.textures.get("enemy_shadow_stalker").setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export function ensureGoblinAndArrowTextures(scene: Phaser.Scene) {
  if (scene.textures.exists("enemy_goblin")) return;

  const mk = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    draw(ctx);
    scene.textures.addImage(key, c as unknown as HTMLImageElement);
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  };

  // Goblin (24x24): green hood + face + tiny bow hint
  mk("enemy_goblin", 24, 24, (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    // hood/body
    ctx.fillStyle = "#166534";
    ctx.fillRect(7, 8, 10, 12);
    // face
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(9, 10, 6, 6);
    // eyes
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(10, 12, 1, 1);
    ctx.fillRect(13, 12, 1, 1);
    // belt
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(7, 16, 10, 2);
    // bow hint (right side)
    ctx.fillStyle = "#6b4f2a";
    ctx.fillRect(16, 11, 1, 7);
    ctx.fillRect(15, 11, 1, 1);
    ctx.fillRect(15, 17, 1, 1);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(17, 14, 1, 1); // arrow nock highlight
  });

  // Arrow (16x6): shaft + tip + fletching
  mk("proj_arrow", 16, 6, (ctx) => {
    ctx.clearRect(0, 0, 16, 6);
    // shaft
    ctx.fillStyle = "#6b4f2a";
    ctx.fillRect(2, 2, 10, 2);
    ctx.fillStyle = "#5b4122";
    ctx.fillRect(2, 3, 10, 1);
    // tip
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(12, 1, 3, 4);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(13, 1, 1, 4);
    // fletching
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(0, 1, 2, 4);
  });
}

export function ensureTrollTexture(scene: Phaser.Scene) {
  if (scene.textures.exists("enemy_troll")) return;
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");
  ctx.clearRect(0, 0, 32, 32);

  // Body
  ctx.fillStyle = "#14532d";
  ctx.fillRect(8, 12, 16, 14);
  ctx.fillStyle = "#166534";
  ctx.fillRect(9, 13, 14, 12);
  // Belly highlight
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(12, 16, 8, 6);
  // Shoulders
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(7, 10, 18, 3);
  // Head
  ctx.fillStyle = "#15803d";
  ctx.fillRect(10, 4, 12, 8);
  // Jaw tusks
  ctx.fillStyle = "#e7e5e4";
  ctx.fillRect(11, 11, 2, 2);
  ctx.fillRect(19, 11, 2, 2);
  // Eyes
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(13, 8, 2, 2);
  ctx.fillRect(17, 8, 2, 2);
  // Belt + bracers
  ctx.fillStyle = "#3a2a1a";
  ctx.fillRect(8, 22, 16, 2);
  ctx.fillRect(6, 18, 3, 3);
  ctx.fillRect(23, 18, 3, 3);
  // Club hint
  ctx.fillStyle = "#6b4f2a";
  ctx.fillRect(23, 6, 4, 16);
  ctx.fillStyle = "#8b5a2b";
  ctx.fillRect(24, 5, 2, 4);

  scene.textures.addImage("enemy_troll", c as unknown as HTMLImageElement);
  scene.textures.get("enemy_troll").setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export function ensureVillageHouseTexture(scene: Phaser.Scene) {
  if (scene.textures.exists("prop_house_village")) return;

  const w = 32 * 7;
  const h = 32 * 4;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  const rect = (x: number, y: number, ww: number, hh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, ww, hh);
  };
  const px = (x: number, y: number, color: string) => rect(x, y, 1, 1, color);

  ctx.clearRect(0, 0, w, h);

  // Roof
  rect(0, 0, w, 40, "#7c2d12"); // dark red
  rect(0, 0, w, 3, "#9a3412"); // highlight ridge
  for (let i = 0; i < 260; i++) {
    const x = 2 + ((i * 11) % (w - 4));
    const y = 4 + ((i * 7) % 34);
    px(x, y, i % 3 ? "#6b240f" : "#8a2e12");
  }
  // Roof overhang shadow
  rect(0, 40, w, 4, "#3b1a10");

  // Walls
  rect(10, 44, w - 20, h - 54, "#cbd5e1"); // plaster
  rect(10, 44, w - 20, 3, "#e5e7eb");
  rect(10, h - 14, w - 20, 4, "#94a3b8"); // base trim

  // Timber beams (simple)
  rect(10, 44, 6, h - 54, "#6b4f2a");
  rect(w - 16, 44, 6, h - 54, "#6b4f2a");
  rect(10, 60, w - 20, 4, "#6b4f2a");

  // Door (bottom center)
  const doorW = 22;
  const doorH = 30;
  const doorX = Math.floor(w / 2 - doorW / 2);
  const doorY = h - 14 - doorH;
  rect(doorX - 1, doorY - 1, doorW + 2, doorH + 2, "#4b3522"); // frame
  rect(doorX, doorY, doorW, doorH, "#6b4f2a");
  rect(doorX, doorY, doorW, 2, "#7a5a30");
  rect(doorX, doorY + doorH - 2, doorW, 2, "#5b4122");
  rect(doorX, doorY + 2, 2, doorH - 4, "#5b4122"); // left edge shadow
  rect(doorX + doorW - 2, doorY + 2, 2, doorH - 4, "#5b4122"); // right edge shadow
  rect(doorX + Math.floor(doorW / 2) - 1, doorY + 4, 2, doorH - 8, "#7a5a30"); // center seam
  rect(doorX + doorW - 4, doorY + Math.floor(doorH / 2), 2, 2, "#f5d76e"); // knob

  // Windows
  const win = (x: number, y: number) => {
    rect(x, y, 18, 14, "#0b1220");
    rect(x + 1, y + 1, 16, 12, "#1e3a8a"); // glass
    rect(x + 8, y + 1, 1, 12, "#94a3b8");
    rect(x + 1, y + 7, 16, 1, "#94a3b8");
    rect(x - 1, y - 1, 20, 2, "#6b4f2a");
    rect(x - 1, y + 13, 20, 2, "#6b4f2a");
  };
  win(32, 62);
  win(w - 50, 62);

  // Small porch step aligned with the entrance tile
  rect(doorX - 8, h - 12, doorW + 16, 4, "#8b5a2b");
  rect(doorX - 8, h - 12, doorW + 16, 1, "#9c6a35");

  scene.textures.addImage("prop_house_village", c as unknown as HTMLImageElement);
  scene.textures.get("prop_house_village").setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export function ensureStoreExteriorTexture(scene: Phaser.Scene) {
  if (scene.textures.exists("prop_store_exterior")) return;

  const tileSize = 32;
  const w = tileSize * 6;
  const h = tileSize * 4;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  const rect = (x: number, y: number, ww: number, hh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, ww, hh);
  };
  const px = (x: number, y: number, color: string) => rect(x, y, 1, 1, color);

  ctx.clearRect(0, 0, w, h);

  // Slate roof with subtle pattern
  rect(0, 0, w, 36, "#1e293b");
  rect(0, 0, w, 3, "#334155");
  for (let i = 0; i < 220; i++) {
    const x = 2 + ((i * 13) % (w - 4));
    const y = 4 + ((i * 9) % 30);
    px(x, y, i % 2 ? "#111827" : "#0f172a");
  }
  rect(0, 36, w, 4, "#0b1220");

  // Walls with trimmed base
  rect(8, 40, w - 16, h - 52, "#e5e7eb");
  rect(8, 40, w - 16, 3, "#f8fafc");
  rect(8, h - 12, w - 16, 4, "#cbd5e1");

  // Vertical beams and trim
  rect(8, 40, 5, h - 52, "#7c2d12");
  rect(w - 13, 40, 5, h - 52, "#7c2d12");
  rect(8, 58, w - 16, 4, "#7c2d12");

  // Sign band
  rect(Math.floor(w / 2) - 34, 48, 68, 10, "#0ea5e9");
  rect(Math.floor(w / 2) - 34, 48, 68, 2, "#38bdf8");
  rect(Math.floor(w / 2) - 32, 50, 64, 6, "#0b1220");
  rect(Math.floor(w / 2) - 16, 51, 32, 4, "#f5d76e");

  // Door (bottom center)
  const doorW = 20;
  const doorH = 28;
  const doorX = Math.floor(w / 2 - doorW / 2);
  const doorY = h - 12 - doorH;
  rect(doorX, doorY, doorW, doorH, "#6b4f2a");
  rect(doorX, doorY, doorW, 3, "#7a5a30");
  rect(doorX + doorW - 5, doorY + Math.floor(doorH / 2), 2, 2, "#f5d76e");
  // Door frame highlight
  rect(doorX - 2, doorY, 2, doorH, "#c084fc");
  rect(doorX + doorW, doorY, 2, doorH, "#c084fc");

  // Windows with teal tint
  const win = (x: number, y: number) => {
    rect(x, y, 16, 12, "#0b1220");
    rect(x + 1, y + 1, 14, 10, "#0ea5e9");
    rect(x + 7, y + 1, 1, 10, "#cbd5e1");
    rect(x + 1, y + 6, 14, 1, "#cbd5e1");
    rect(x - 1, y - 1, 18, 2, "#7c2d12");
    rect(x - 1, y + 11, 18, 2, "#7c2d12");
  };
  win(26, 60);
  win(w - 42, 60);

  // Small porch step under the door tile
  rect(doorX - 6, h - 10, doorW + 12, 3, "#8b5a2b");
  rect(doorX - 6, h - 10, doorW + 12, 1, "#9c6a35");

  scene.textures.addImage("prop_store_exterior", c as unknown as HTMLImageElement);
  scene.textures.get("prop_store_exterior").setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export function ensureBoatTexture(scene: Phaser.Scene) {
  if (scene.textures.exists("prop_boat")) return;
  const bw = 96;
  const bh = 48;
  const c = document.createElement("canvas");
  c.width = bw;
  c.height = bh;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");
  ctx.clearRect(0, 0, bw, bh);

  // Hull
  ctx.fillStyle = "#7c2d12";
  ctx.fillRect(6, 18, bw - 12, 16);
  ctx.fillStyle = "#5b210c";
  ctx.fillRect(6, 28, bw - 12, 6);
  // Keel shadow
  ctx.fillStyle = "#3a1a0a";
  ctx.fillRect(8, 32, bw - 16, 4);

  // Trim + planks
  ctx.fillStyle = "#9a3412";
  ctx.fillRect(6, 16, bw - 12, 4);
  for (let x = 10; x < bw - 10; x += 12) {
    ctx.fillRect(x, 18, 2, 16);
  }

  // Deck boards
  ctx.fillStyle = "#a16207";
  ctx.fillRect(14, 14, bw - 28, 10);
  ctx.fillStyle = "#facc15";
  for (let x = 14; x < bw - 14; x += 10) ctx.fillRect(x, 15, 1, 8);

  // Small mast + rope
  ctx.fillStyle = "#facc15";
  ctx.fillRect(Math.floor(bw / 2) - 2, 8, 4, 12);
  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(Math.floor(bw / 2) - 2, 6, 4, 2);

  scene.textures.addImage("prop_boat", c as unknown as HTMLImageElement);
  scene.textures.get("prop_boat").setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export function ensureItemAndPropTextures(scene: Phaser.Scene) {
  const mk = (key: string, draw: (ctx: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) return;
    const c = document.createElement("canvas");
    c.width = 24;
    c.height = 24;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    draw(ctx);
    scene.textures.addImage(key, c as unknown as HTMLImageElement);
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  };

  mk("item_key", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    ctx.fillStyle = "#f5d76e";
    ctx.fillRect(10, 10, 6, 2);
    ctx.fillRect(14, 8, 2, 6);
    ctx.fillStyle = "#d6b24c";
    ctx.fillRect(10, 12, 2, 2);
    ctx.fillRect(12, 12, 1, 2);
  });

  mk("prop_door_locked", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    ctx.fillStyle = "#6b4f2a";
    ctx.fillRect(3, 1, 18, 22);
    ctx.fillStyle = "#5b4122";
    ctx.fillRect(3, 21, 18, 2);
    ctx.fillStyle = "#f5d76e";
    ctx.fillRect(18, 14, 2, 2);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(9, 12, 4, 4);
  });

  mk("prop_door_open", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    ctx.fillStyle = "#6b4f2a";
    ctx.fillRect(3, 1, 18, 22);
    ctx.fillStyle = "#5b4122";
    ctx.fillRect(3, 21, 18, 2);
    ctx.fillStyle = "#f5d76e";
    ctx.fillRect(18, 14, 2, 2);
  });

  mk("prop_torch", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    // handle
    ctx.fillStyle = "#6b4f2a";
    ctx.fillRect(11, 10, 2, 8);
    // flame
    ctx.fillStyle = "#f97316";
    ctx.fillRect(11, 6, 2, 4);
    ctx.fillStyle = "#fde68a";
    ctx.fillRect(12, 7, 1, 2);
  });

  mk("item_sword", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    // blade
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(11, 4, 2, 12);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(12, 4, 1, 12);
    // guard
    ctx.fillStyle = "#f5d76e";
    ctx.fillRect(9, 16, 6, 2);
    // handle
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(11, 18, 2, 3);
    // pommel
    ctx.fillStyle = "#f5d76e";
    ctx.fillRect(11, 21, 2, 1);
  });

  mk("item_dagger", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    // short blade
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(11, 7, 2, 7);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(12, 7, 1, 7);
    // small guard
    ctx.fillStyle = "#f5d76e";
    ctx.fillRect(10, 14, 4, 1);
    // handle
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(11, 15, 2, 5);
    ctx.fillStyle = "#f5d76e";
    ctx.fillRect(11, 20, 2, 1);
  });

  mk("item_longsword", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    // longer blade
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(11, 3, 2, 14);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(12, 3, 1, 14);
    // guard
    ctx.fillStyle = "#f5d76e";
    ctx.fillRect(8, 17, 8, 2);
    // handle
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(11, 19, 2, 3);
    ctx.fillStyle = "#f5d76e";
    ctx.fillRect(11, 22, 2, 1);
  });

  mk("item_spear", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    // shaft
    ctx.fillStyle = "#6b4f2a";
    ctx.fillRect(11, 4, 2, 16);
    ctx.fillStyle = "#5b4122";
    ctx.fillRect(12, 4, 1, 16);
    // tip
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(10, 2, 4, 3);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(12, 2, 1, 3);
    // wrap
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(10, 12, 4, 2);
  });

  mk("item_bread", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(6, 10, 12, 7);
    ctx.fillStyle = "#a46a33";
    ctx.fillRect(6, 10, 12, 2);
    ctx.fillStyle = "#6b4f2a";
    ctx.fillRect(6, 16, 12, 1);
    // scoring lines
    ctx.fillStyle = "#c9a36a";
    ctx.fillRect(9, 11, 1, 4);
    ctx.fillRect(12, 11, 1, 4);
    ctx.fillRect(15, 11, 1, 4);
  });

  mk("item_stew", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    // bowl
    ctx.fillStyle = "#3b1a10";
    ctx.fillRect(6, 13, 12, 5);
    ctx.fillStyle = "#6b4f2a";
    ctx.fillRect(7, 14, 10, 3);
    // stew surface
    ctx.fillStyle = "#f97316";
    ctx.fillRect(8, 14, 8, 2);
    ctx.fillStyle = "#fde68a";
    ctx.fillRect(10, 14, 1, 1);
    ctx.fillRect(13, 15, 1, 1);
    // steam
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(9, 8, 1, 3);
    ctx.fillRect(12, 7, 1, 4);
    ctx.fillRect(15, 8, 1, 3);
  });

  mk("item_leather_armor", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    // chest piece
    ctx.fillStyle = "#6b4f2a";
    ctx.fillRect(8, 7, 8, 12);
    ctx.fillStyle = "#5b4122";
    ctx.fillRect(8, 15, 8, 4);
    // straps
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(9, 7, 2, 4);
    ctx.fillRect(13, 7, 2, 4);
    // buckle
    ctx.fillStyle = "#f5d76e";
    ctx.fillRect(11, 15, 2, 2);
  });

  mk("item_iron_armor", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    // chest plate
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(8, 7, 8, 12);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(8, 15, 8, 4);
    // highlights
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(9, 8, 2, 9);
    // rivets
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(9, 10, 1, 1);
    ctx.fillRect(14, 10, 1, 1);
    // buckle
    ctx.fillStyle = "#f5d76e";
    ctx.fillRect(11, 15, 2, 2);
  });

  mk("item_mythril_helm", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(9, 6, 6, 5);
    ctx.fillStyle = "#0ea5e9";
    ctx.fillRect(9, 10, 6, 2);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(10, 7, 4, 1);
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(10, 9, 1, 1);
    ctx.fillRect(13, 9, 1, 1);
  });

  mk("item_mythril_leggings", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    ctx.fillStyle = "#0ea5e9";
    ctx.fillRect(9, 10, 3, 9);
    ctx.fillRect(12, 10, 3, 9);
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(9, 17, 3, 2);
    ctx.fillRect(12, 17, 3, 2);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(10, 11, 1, 5);
    ctx.fillRect(13, 11, 1, 5);
  });

  mk("item_mythril_armor", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    // chest plate
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(8, 7, 8, 12);
    ctx.fillStyle = "#0ea5e9";
    ctx.fillRect(8, 15, 8, 4);
    // highlights
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(9, 8, 2, 9);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(13, 9, 1, 3);
    // buckle
    ctx.fillStyle = "#f5d76e";
    ctx.fillRect(11, 15, 2, 2);
  });

  mk("item_bow", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    // Curved single-piece longbow (side profile)
    const limb = "#8b5a2b";
    const limbHi = "#a46a33";
    const grip = "#6b4f2a";
    const gripShadow = "#4a3520";
    const tip = "#c9a36a";
    const string = "#e8d5a2";

    // Helper to fill pixel
    const px = (x: number, y: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    };

    // Limb pixels tracing a lean arc
    const limbPixels: Array<[number, number, string?]> = [
      [12, 2], [13, 2],
      [12, 3], [13, 3],
      [12, 4], [13, 4],
      [11, 5], [12, 5], [13, 5],
      [11, 6], [12, 6], [13, 6],
      [11, 7], [12, 7], [13, 7],
      [10, 8], [11, 8], [12, 8],
      [10, 9], [11, 9], [12, 9],
      [10,10], [11,10], [12,10],
      [10,11], [11,11], [12,11],
      [10,12], [11,12], [12,12],
      [10,13], [11,13], [12,13],
      [10,14], [11,14], [12,14],
      [10,15], [11,15], [12,15],
      [11,16], [12,16], [13,16],
      [11,17], [12,17], [13,17],
      [12,18], [13,18],
      [12,19], [13,19],
      [12,20], [13,20],
      [12,21], [13,21],
      [13,22],
    ];
    limbPixels.forEach(([x, y]) => px(x, y, limb));

    // Tips
    px(12, 1, tip); px(13, 1, tip);
    px(12, 23, tip); px(13, 23, tip);

    // Grip wrap
    ctx.fillStyle = grip;
    ctx.fillRect(10, 10, 3, 5);
    ctx.fillStyle = gripShadow;
    ctx.fillRect(10, 12, 3, 2);

    // String (offset right)
    ctx.fillStyle = string;
    ctx.fillRect(15, 3, 1, 18);

    // Inner highlight to hint curvature
    const hiPixels: Array<[number, number]> = [
      [12, 5], [12, 6], [12, 7],
      [11, 8], [11, 9], [11,10], [11,11], [11,12],
      [11,13], [11,14], [11,15],
      [12,16], [12,17], [12,18],
    ];
    hiPixels.forEach(([x, y]) => px(x, y, limbHi));
  });

  mk("item_coins", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    // Small coin stack + sparkle. Keep it readable at 24x24.
    const gold = "#f5d76e";
    const goldShadow = "#d6b24c";
    const outline = "#3a2a1a";

    // Stack base
    ctx.fillStyle = outline;
    ctx.fillRect(7, 14, 10, 6);
    ctx.fillStyle = goldShadow;
    ctx.fillRect(8, 15, 8, 4);
    ctx.fillStyle = gold;
    ctx.fillRect(8, 15, 8, 2);

    // Top coin
    ctx.fillStyle = outline;
    ctx.fillRect(9, 9, 6, 5);
    ctx.fillStyle = goldShadow;
    ctx.fillRect(10, 10, 4, 3);
    ctx.fillStyle = gold;
    ctx.fillRect(10, 10, 4, 1);

    // Sparkle
    ctx.fillStyle = "#fde68a";
    ctx.fillRect(16, 7, 1, 1);
    ctx.fillRect(15, 8, 1, 1);
    ctx.fillRect(17, 8, 1, 1);
    ctx.fillRect(16, 9, 1, 1);
  });

  mk("item_arrows", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    const drawArrow = (x: number, y: number) => {
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(x, y, 8, 2); // shaft
      ctx.fillRect(x + 7, y - 1, 2, 4); // head
      ctx.fillStyle = "#9ca3af";
      ctx.fillRect(x + 1, y + 1, 6, 1); // highlight
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(x - 1, y, 2, 2); // fletching base
    };
    drawArrow(6, 8);
    drawArrow(5, 12);
    drawArrow(7, 16);
  });

  if (!scene.textures.exists("prop_bridge_center")) {
    const bw = 96;
    const bh = 64;
    const c = document.createElement("canvas");
    c.width = bw;
    c.height = bh;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    ctx.clearRect(0, 0, bw, bh);

    // Deck shadow
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(0, Math.floor(bh / 2) - 12, bw, 32);

    // Wooden planks
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(0, Math.floor(bh / 2) - 14, bw, 30);
    ctx.fillStyle = "#a46a33";
    ctx.fillRect(0, Math.floor(bh / 2) - 14, bw, 6);

    // Plank seams + nails
    ctx.fillStyle = "#6b4f2a";
    for (let x = 10; x < bw; x += 12) ctx.fillRect(x, Math.floor(bh / 2) - 14, 2, 30);
    ctx.fillStyle = "#3a2a1a";
    for (let x = 8; x < bw; x += 12) {
      ctx.fillRect(x, Math.floor(bh / 2) - 10, 2, 2);
      ctx.fillRect(x + 4, Math.floor(bh / 2) + 6, 2, 2);
    }

    // Rope rails + posts
    ctx.fillStyle = "#9c6a35";
    ctx.fillRect(0, Math.floor(bh / 2) - 20, bw, 4);
    ctx.fillRect(0, Math.floor(bh / 2) + 18, bw, 4);
    ctx.fillStyle = "#6b4f2a";
    for (let x = 6; x < bw; x += 18) {
      ctx.fillRect(x, Math.floor(bh / 2) - 22, 4, 10);
      ctx.fillRect(x, Math.floor(bh / 2) + 14, 4, 10);
    }

    scene.textures.addImage("prop_bridge_center", c as unknown as HTMLImageElement);
    scene.textures.get("prop_bridge_center").setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  mk("item_heart", (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    const pat = getHeartPattern();
    const colors = {
      outline: "#b91c1c",
      fill: "#ef4444",
      highlight: "#fb7185",
    } as const;

    const drawLayer = (c: keyof typeof colors) => {
      ctx.fillStyle = colors[c];
      for (const px of pat.pixels) {
        if (px.c !== c) continue;
        ctx.fillRect(pat.offsetX + px.x, pat.offsetY + px.y, 1, 1);
      }
    };

    // Outline first, then fill, then highlight for readability.
    drawLayer("outline");
    drawLayer("fill");
    drawLayer("highlight");
  });
}

export function ensureUiPouchTexture(scene: Phaser.Scene) {
  if (scene.textures.exists("ui_pouch")) return;

  const c = document.createElement("canvas");
  // Wider-than-tall so it reads like a small satchel.
  c.width = 28;
  c.height = 22;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  ctx.clearRect(0, 0, c.width, c.height);

  // Colors
  const outline = "#2b2014";
  const body = "#6b4f2a";
  const bodyShadow = "#5b4122";
  const flap = "#7f6236";
  const handleDark = "#3a2a1a";
  const handleLight = "#f5d76e";

  // Body (wider, with slight taper)
  ctx.fillStyle = outline;
  ctx.fillRect(5, 6, 18, 13);
  ctx.fillStyle = body;
  ctx.fillRect(6, 8, 16, 10);
  ctx.fillStyle = bodyShadow;
  ctx.fillRect(6, 16, 16, 2);

  // Flap (short, to emphasize handle above)
  ctx.fillStyle = flap;
  ctx.fillRect(6, 7, 16, 3);

  // Handle: obvious loop sitting above the flap
  ctx.fillStyle = handleDark;
  ctx.fillRect(9, 3, 10, 2); // top bar
  ctx.fillRect(9, 4, 2, 3); // left leg
  ctx.fillRect(17, 4, 2, 3); // right leg
  ctx.fillStyle = handleLight;
  ctx.fillRect(11, 4, 6, 1);

  // Clasp
  ctx.fillStyle = handleLight;
  ctx.fillRect(12, 13, 4, 2);
  ctx.fillStyle = handleDark;
  ctx.fillRect(13, 14, 2, 1);

  scene.textures.addImage("ui_pouch", c as unknown as HTMLImageElement);
  scene.textures.get("ui_pouch").setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export function ensureKeyDoorSwordTorchTextures(scene: Phaser.Scene) {
  const mk = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) return;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    draw(ctx);
    scene.textures.addImage(key, c as unknown as HTMLImageElement);
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  };

  mk("item_key", 24, 24, (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    ctx.fillStyle = "#f5d76e";
    ctx.fillRect(10, 8, 4, 2); // head
    ctx.fillRect(11, 10, 2, 6); // stem
    ctx.fillRect(9, 16, 6, 2); // teeth bar
    ctx.fillRect(9, 18, 2, 1);
    ctx.fillRect(13, 18, 2, 1);
    ctx.fillStyle = "#c9a94d";
    ctx.fillRect(11, 11, 1, 4);
  });

  mk("door_locked", 32, 32, (ctx) => {
    ctx.clearRect(0, 0, 32, 32);
    ctx.fillStyle = "#6b4f2a";
    ctx.fillRect(8, 4, 16, 24);
    ctx.fillStyle = "#5b4122";
    ctx.fillRect(8, 26, 16, 2);
    ctx.fillStyle = "#7a5a30";
    ctx.fillRect(9, 6, 14, 18);
    // lock
    ctx.fillStyle = "#f5d76e";
    ctx.fillRect(14, 16, 4, 4);
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(16, 17, 1, 2);
  });

  mk("door_open", 32, 32, (ctx) => {
    ctx.clearRect(0, 0, 32, 32);
    ctx.fillStyle = "#6b4f2a";
    ctx.fillRect(8, 4, 16, 24);
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(10, 6, 12, 20);
    ctx.fillStyle = "#7a5a30";
    ctx.fillRect(8, 4, 2, 24);
  });

  mk("torch", 16, 24, (ctx) => {
    ctx.clearRect(0, 0, 16, 24);
    ctx.fillStyle = "#6b4f2a";
    ctx.fillRect(7, 8, 2, 10);
    ctx.fillStyle = "#f97316";
    ctx.fillRect(6, 4, 4, 4);
    ctx.fillStyle = "#fde68a";
    ctx.fillRect(7, 5, 2, 2);
  });

  mk("item_sword", 24, 24, (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    ctx.fillStyle = "#9ca3af";
    ctx.fillRect(11, 4, 2, 12); // blade
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(11, 5, 1, 10); // blade highlight
    ctx.fillStyle = "#f5d76e";
    ctx.fillRect(9, 15, 6, 2); // guard
    ctx.fillStyle = "#6b4f2a";
    ctx.fillRect(11, 17, 2, 4); // grip
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(11, 21, 2, 1); // pommel
  });
}
