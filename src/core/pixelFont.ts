export type PixelGlyph = {
  w: number;
  h: number;
  rows: string[]; // '.' empty, '#' filled
};

export const PIXEL_FONT_5X7: Record<string, PixelGlyph> = {
  // 5x7 uppercase glyphs used by "GREENHOLLOW"
  A: { w: 5, h: 7, rows: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"] },
  E: { w: 5, h: 7, rows: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"] },
  G: { w: 5, h: 7, rows: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."] },
  H: { w: 5, h: 7, rows: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"] },
  I: { w: 5, h: 7, rows: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"] },
  L: { w: 5, h: 7, rows: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"] },
  N: { w: 5, h: 7, rows: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"] },
  O: { w: 5, h: 7, rows: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."] },
  R: { w: 5, h: 7, rows: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"] },
  W: { w: 5, h: 7, rows: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"] },
  " ": { w: 5, h: 7, rows: [".....", ".....", ".....", ".....", ".....", ".....", "....."] },
};

export type PixelTextLayout = {
  w: number;
  h: number;
  pixels: Array<{ x: number; y: number }>;
};

export function layoutPixelText(text: string): PixelTextLayout {
  const s = text.toUpperCase();
  const glyphs = [...s].map((ch) => PIXEL_FONT_5X7[ch] ?? null);
  if (glyphs.some((g) => !g)) throw new Error("pixelFont: missing glyph");

  const h = 7;
  const glyphW = 5;
  const gap = 1;
  const w = s.length ? s.length * glyphW + (s.length - 1) * gap : 0;

  const pixels: Array<{ x: number; y: number }> = [];
  let ox = 0;
  for (let i = 0; i < s.length; i++) {
    const g = glyphs[i]!;
    for (let y = 0; y < h; y++) {
      const row = g.rows[y]!;
      for (let x = 0; x < glyphW; x++) {
        if (row[x] === "#") pixels.push({ x: ox + x, y });
      }
    }
    ox += glyphW + gap;
  }
  return { w, h, pixels };
}


