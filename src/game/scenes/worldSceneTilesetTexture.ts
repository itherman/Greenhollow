import Phaser from "phaser";

/**
 * Extracted from `WorldScene.ensureTilesetTexture()` to keep `WorldScene.ts` smaller.
 *
 * This function executes with the given scene bound as `this`.
 */
export function ensureTilesetTexture(scene: any): void {
  (function (this: any) {
    if (this.textures.exists("tileset_2x2")) return;

    // Build a 3x3 tilesheet: 96x96, each tile is 32x32.
    // Indices are row-major (cols=3):
    // 0 grass, 1 wall, 2 forest, 3 cave, 4 dirt, 5 trees (canopy wall), 6 river
    const c = document.createElement("canvas");
    c.width = 96;
    c.height = 96;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    const rect = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };
    const px = (x: number, y: number, color: string) => rect(x, y, 1, 1, color);

    // 0 grass (shaded + speckles, no hard horizontal borders to avoid stripe artifacts)
    rect(0, 0, 32, 32, "#2b8a3e");
    for (let i = 0; i < 70; i++)
      px(1 + ((i * 7) % 30), 1 + ((i * 13) % 30), i % 3 ? "#2f9442" : "#257a38");
    for (let i = 0; i < 18; i++)
      px(2 + ((i * 11) % 28), 2 + ((i * 17) % 28), "#38a34a");

    // 1 wall/wood (beveled)
    rect(32, 0, 32, 32, "#6b4f2a");
    rect(32, 0, 32, 2, "#7a5a30");
    rect(32, 30, 32, 2, "#5b4122");
    for (let x = 34; x < 64; x += 6) {
      rect(x, 4, 2, 24, "#644826");
      rect(x + 1, 4, 1, 24, "#5b4122");
    }

    // 2 forest floor (darker, with leaf speckles)
    rect(64, 0, 32, 32, "#1b5e20");
    for (let i = 0; i < 60; i++)
      px(65 + ((i * 11) % 30), 1 + ((i * 5) % 30), i % 3 ? "#1f6a24" : "#164d1a");
    for (let i = 0; i < 20; i++)
      px(66 + ((i * 9) % 28), 2 + ((i * 19) % 28), "#2a8a3a");

    // 3 cave floor (stone with cracks)
    rect(0, 32, 32, 32, "#4b5563");
    rect(0, 32, 32, 1, "#5b6676");
    rect(0, 63, 32, 1, "#3b4450");
    for (let i = 0; i < 20; i++) px(2 + ((i * 9) % 28), 34 + ((i * 7) % 28), "#424b57");
    for (let i = 0; i < 10; i++) {
      const x = 2 + ((i * 5) % 28);
      const y = 34 + ((i * 11) % 28);
      px(x, y, "#2c333d");
      px(x + 1, y, "#2c333d");
    }

    // 4 dirt path
    rect(32, 32, 32, 32, "#8b5a2b");
    for (let i = 0; i < 50; i++)
      px(33 + ((i * 7) % 30), 33 + ((i * 11) % 30), i % 2 ? "#7a4d25" : "#9c6a35");
    for (let i = 0; i < 14; i++)
      px(34 + ((i * 13) % 28), 34 + ((i * 17) % 28), "#a8743a");

    // 5 tree wall (dense canopy). Designed to tile without obvious repeated "trunks".
    rect(64, 32, 32, 32, "#12441f"); // canopy base
    // darker rim (reads like depth)
    rect(64, 32, 32, 2, "#0a2a12");
    rect(64, 62, 32, 2, "#071f0e");
    rect(64, 32, 2, 32, "#0a2a12");
    rect(64 + 30, 32, 2, 32, "#071f0e");

    // Layered leaf speckles (deterministic pseudo-random patterns)
    for (let i = 0; i < 220; i++) {
      const x = 64 + 1 + ((i * 11 + 3) % 30);
      const y = 32 + 1 + ((i * 17 + 7) % 30);
      px(x, y, i % 5 ? "#145724" : "#0e3a19");
    }
    for (let i = 0; i < 90; i++) {
      const x = 64 + 2 + ((i * 19 + 5) % 28);
      const y = 32 + 2 + ((i * 23 + 11) % 28);
      px(x, y, i % 3 ? "#1a6b2c" : "#0b2f15");
    }
    // highlights
    for (let i = 0; i < 45; i++) {
      const x = 64 + 3 + ((i * 13 + 9) % 26);
      const y = 32 + 3 + ((i * 29 + 4) % 26);
      px(x, y, "#2a8a3a");
    }

    // soft shadow under canopy (helps borders read as a wall)
    for (let x = 64 + 2; x < 64 + 30; x += 2) {
      px(x, 32 + 29, "#071f0e");
    }

    // 6 river (shaded water with light ripples)
    rect(0, 64, 32, 32, "#1f639d");
    rect(0, 64, 32, 2, "#2974b8");
    rect(0, 94, 32, 2, "#174f81");
    for (let i = 0; i < 90; i++) {
      const x = 1 + ((i * 11 + 5) % 30);
      const y = 65 + ((i * 7 + 3) % 30);
      px(x, y, i % 4 ? "#2a78c4" : "#19558c");
    }
    for (let i = 0; i < 30; i++) {
      const x = 2 + ((i * 13 + 9) % 28);
      const y = 66 + ((i * 19 + 11) % 28);
      px(x, y, i % 2 ? "#3a8bd9" : "#165078");
    }

    // Fill unused slots to avoid accidental transparency.
    rect(32, 64, 32, 32, "#2b8a3e");
    rect(64, 64, 32, 32, "#2b8a3e");

    this.textures.addSpriteSheet("tileset_2x2", c as unknown as HTMLImageElement, {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Ensure nearest-neighbor sampling to avoid seams.
    this.textures.get("tileset_2x2").setFilter(Phaser.Textures.FilterMode.NEAREST);
  
  }).call(scene);
}
