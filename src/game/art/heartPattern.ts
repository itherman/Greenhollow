export type PixelColorKey = "outline" | "fill" | "highlight";

export type Pixel = { x: number; y: number; c: PixelColorKey };

export type HeartPattern = {
  w: number;
  h: number;
  offsetX: number;
  offsetY: number;
  pixels: Pixel[];
};

/**
 * Small pixel-art heart pattern intended to be rendered with NEAREST scaling.
 * Kept as a pure function so we can unit-test its shape (symmetry, bounds, etc).
 */
export function getHeartPattern(): HeartPattern {
  // 11x11 heart in a 24x24 canvas, centered-ish.
  const w = 11;
  const h = 11;
  const offsetX = 6;
  const offsetY = 6;

  // Legend:
  // - 'o' outline
  // - 'f' fill
  // - 'h' highlight
  // - '.' empty
  // Note: highlight is intentionally NOT symmetric.
  const rows = [
    "..oo...oo..",
    ".offo.offo.",
    "offfffffffo",
    "offfffffffo",
    "offfffffffo",
    ".offfffffo.",
    "..offfffo..",
    "...offfo...",
    "....ofo....",
    ".....o.....",
    "...........",
  ];

  const pixels: Pixel[] = [];
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y]!;
    if (row.length !== w) throw new Error("heartPattern: invalid row width");
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      if (ch === ".") continue;
      if (ch === "o") pixels.push({ x, y, c: "outline" });
      else if (ch === "f") pixels.push({ x, y, c: "fill" });
      else if (ch === "h") pixels.push({ x, y, c: "highlight" });
      else throw new Error(`heartPattern: unknown char '${ch}'`);
    }
  }

  // Add a small highlight cluster (layered on top of fill).
  pixels.push({ x: 3, y: 2, c: "highlight" });
  pixels.push({ x: 3, y: 3, c: "highlight" });
  pixels.push({ x: 4, y: 3, c: "highlight" });

  return { w, h, offsetX, offsetY, pixels };
}


