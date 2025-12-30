import { hash2d01 } from "../core/hashNoise";
import { computeIntroOverlayLayout } from "../core/introOverlayLayout";
import { applyGreenhollowButton, getGreenhollowTheme } from "./greenhollowTheme";
import { createOverlayFrame } from "./overlayFrame";

type MountIntroOverlayOptions = {
  onStart: () => void;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Record<string, string>) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function drawIntro(canvas: HTMLCanvasElement) {
  // Low-res canvas scaled up with pixelated rendering.
  const w = 480;
  const h = 270;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;

  const t = getGreenhollowTheme();

  // Sky
  ctx.fillStyle = t.colors.night;
  ctx.fillRect(0, 0, w, 72);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 72, w, 14);

  // Grass field (banded for low-res look)
  ctx.fillStyle = t.colors.grass0;
  ctx.fillRect(0, 86, w, h - 86);
  ctx.fillStyle = t.colors.grass1;
  for (let y = 86; y < h; y += 4) ctx.fillRect(0, y, w, 2);

  // Tree border (top + sides)
  const tree = (x: number, baseY: number, height: number) => {
    // canopy
    ctx.fillStyle = t.colors.forest0;
    for (let i = 0; i < height; i++) {
      // Pine silhouette: wide base, narrow top.
      const width = 1 + (height - 1 - i) * 2;
      ctx.fillRect(x - Math.floor(width / 2), baseY - i, width, 1);
    }
    // trunk
    ctx.fillStyle = t.colors.wood1;
    ctx.fillRect(x - 1, baseY + 1, 3, 6);
  };
  for (let i = 0; i < 11; i++) tree(10 + i * 30, 84, 16 + (i % 3) * 3);
  for (let i = 0; i < 6; i++) {
    // Inset a bit so side trees look like full pines (not clipped wedges).
    tree(14, 95 + i * 18, 14 + (i % 2) * 2);
    tree(w - 14, 95 + i * 18, 14 + ((i + 1) % 2) * 2);
  }

  // Fireflies
  ctx.fillStyle = t.colors.gold;
  for (const [sx, sy] of [
    [48, 56],
    [76, 44],
    [112, 58],
    [214, 50],
    [238, 60],
    [196, 40],
  ]) {
    ctx.fillRect(sx, sy, 1, 1);
  }

  // Centered title on a wooden signboard for maximum readability.
  const signW = 276;
  const signH = 64;
  const signX = Math.floor((w - signW) / 2);
  const signY = 48;
  ctx.fillStyle = t.colors.wood0;
  ctx.fillRect(signX, signY, signW, signH);
  // wood grain (subtle, deterministic)
  ctx.save();
  ctx.globalAlpha = 0.18;
  for (let y = signY + 3; y < signY + signH - 3; y += 2) {
    for (let x = signX + 3; x < signX + signW - 3; x += 2) {
      const n = hash2d01(x, y, 9001);
      if (n < 0.93) continue;
      ctx.fillStyle = t.colors.wood1;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.restore();
  // border + inner bevel
  ctx.fillStyle = t.colors.wood1;
  ctx.fillRect(signX, signY, signW, 2);
  ctx.fillRect(signX, signY + signH - 2, signW, 2);
  ctx.fillRect(signX, signY, 2, signH);
  ctx.fillRect(signX + signW - 2, signY, 2, signH);
  ctx.fillStyle = "#8b6a3a";
  ctx.fillRect(signX + 2, signY + 2, signW - 4, 2);

  // Title rendered as clean, high-contrast letters (NO texture inside letters).
  const mask = document.createElement("canvas");
  mask.width = w;
  mask.height = h;
  const m = mask.getContext("2d");
  if (!m) return;
  m.imageSmoothingEnabled = false;
  m.clearRect(0, 0, w, h);
  m.textAlign = "center";
  m.textBaseline = "top";

  const title = "GREENHOLLOW";
  const padX = 10;
  const padY = 10;
  const maxTextW = signW - padX * 2;
  const maxTextH = signH - padY * 2;

  // Slight horizontal squeeze makes the letters narrower/more readable and helps fit.
  const sx = 0.86;

  // Fit font size to sign width (simple decrement loop; deterministic and cheap at this size).
  // IMPORTANT: we only use a fill mask (no stroke). Outline is computed from the raster grid.
  let fontSize = 52;
  while (fontSize > 18) {
    m.font = `${fontSize}px ui-serif, Georgia, "Times New Roman", serif`;
    const measured = m.measureText(title).width * sx;
    if (measured <= maxTextW && fontSize <= maxTextH + 10) break;
    fontSize -= 1;
  }

  const textX = w / 2;
  const textY = signY + Math.floor((signH - fontSize) / 2);

  // Rasterize at higher resolution then downsample to a crisp boolean grid.
  const R = 3;
  const hi = document.createElement("canvas");
  hi.width = w * R;
  hi.height = h * R;
  const hc = hi.getContext("2d");
  if (!hc) return;
  hc.imageSmoothingEnabled = false;
  hc.clearRect(0, 0, hi.width, hi.height);
  hc.textAlign = "center";
  hc.textBaseline = "top";

  // Apply horizontal squeeze around the center.
  hc.save();
  hc.translate(textX * R, 0);
  hc.scale(sx, 1);
  hc.translate(-textX * R, 0);
  hc.font = `${fontSize * R}px ui-serif, Georgia, "Times New Roman", serif`;
  hc.fillStyle = "#ffffff";
  hc.fillText(title, textX * R, textY * R);
  hc.restore();

  const hiImg = hc.getImageData(0, 0, hi.width, hi.height);
  const fill = new Uint8Array(w * h);
  const sampleAlpha = (x: number, y: number) => {
    // Sample near center of the hi-res block.
    const sx0 = Math.min(hi.width - 1, x * R + Math.floor(R / 2));
    const sy0 = Math.min(hi.height - 1, y * R + Math.floor(R / 2));
    return hiImg.data[(sy0 * hi.width + sx0) * 4 + 3]!;
  };
  const FILL_T = 120; // threshold: preserves inner holes/counters
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      fill[y * w + x] = sampleAlpha(x, y) >= FILL_T ? 1 : 0;
    }
  }

  // Outline computed from the fill grid (keeps counters/hollows intact).
  const outline = new Uint8Array(w * h);
  const idxOf = (x: number, y: number) => y * w + x;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idxOf(x, y);
      if (!fill[i]) continue;
      // edge if any 4-neighbor is empty
      const edge =
        (x > 0 && !fill[idxOf(x - 1, y)]) ||
        (x + 1 < w && !fill[idxOf(x + 1, y)]) ||
        (y > 0 && !fill[idxOf(x, y - 1)]) ||
        (y + 1 < h && !fill[idxOf(x, y + 1)]);
      if (edge) outline[i] = 1;
    }
  }

  // Render title clipped to the sign bounds so it never spills outside.
  ctx.save();
  ctx.beginPath();
  ctx.rect(signX + 2, signY + 2, signW - 4, signH - 4);
  ctx.clip();

  const SHADOW = "#000000";
  const OUTLINE = "#0b1220";
  const FILL = "#ffffff";

  // shadow (from fill grid only)
  ctx.fillStyle = SHADOW;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!fill[idxOf(x, y)]) continue;
      ctx.fillRect(x + 2, y + 2, 1, 1);
    }
  }
  // outline
  ctx.fillStyle = OUTLINE;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!outline[idxOf(x, y)]) continue;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // fill
  ctx.fillStyle = FILL;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!fill[idxOf(x, y)]) continue;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  ctx.restore();

  // Subtitle on a parchment ribbon (non-pixel-font, still low-res)
  const ribbonW = 344;
  const ribbonH = 36;
  const ribbonX = Math.floor((w - ribbonW) / 2);
  const ribbonY = 170;
  ctx.fillStyle = t.colors.parchment;
  ctx.fillRect(ribbonX, ribbonY, ribbonW, ribbonH);
  ctx.fillStyle = t.colors.wood1;
  ctx.fillRect(ribbonX, ribbonY, ribbonW, 2);
  ctx.fillRect(ribbonX, ribbonY + ribbonH - 2, ribbonW, 2);
  ctx.fillStyle = t.colors.ink;
  ctx.font = '24px ui-serif, Georgia, "Times New Roman", serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("A medieval pixel adventure", w / 2, ribbonY + ribbonH / 2);
}

export function mountIntroOverlay(opts: MountIntroOverlayOptions) {
  const overlay = createOverlayFrame({
    id: "intro-overlay",
    zIndex: 10000,
    background: "radial-gradient(circle at 50% 40%, rgba(20,58,38,0.55), rgba(11,18,32,0.92))",
    paddingPx: 16,
    minScale: 0.6,
    maxScale: 1.0,
  });

  const wrap = el("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.alignItems = "center";
  wrap.style.gap = "14px";
  wrap.style.padding = "24px";
  wrap.style.boxSizing = "border-box";
  wrap.style.maxWidth = "94vw";

  const canvas = el("canvas") as HTMLCanvasElement;
  canvas.style.width = "900px";
  canvas.style.height = "auto";
  canvas.style.aspectRatio = "16 / 9";
  canvas.style.border = "3px solid #5b4122";
  canvas.style.borderRadius = "16px";
  canvas.style.boxShadow = "0 12px 50px rgba(0,0,0,0.55)";
  (canvas.style as any).imageRendering = "pixelated";
  drawIntro(canvas);

  const btn = el("button") as HTMLButtonElement;
  btn.textContent = "Start";
  applyGreenhollowButton(btn, "primary");
  btn.style.fontSize = "24px";
  btn.style.padding = "18px 26px";
  btn.style.minWidth = "200px";
  btn.style.marginTop = "12px";

  const applyLayout = () => {
    // Keep the canvas width in a sensible range so it stays crisp at scale=1,
    // while overlayFrame guarantees it will still fit without scroll.
    const layout = computeIntroOverlayLayout(window.innerWidth, window.innerHeight);
    canvas.style.width = `${layout.canvasCssWidthPx}px`;
    overlay.update();
  };

  const start = () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("resize", applyLayout);
    overlay.destroy();
    opts.onStart();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") start();
  };

  btn.onclick = () => start();
  overlay.root.onclick = (e) => {
    // Clicking the dim background shouldn't immediately start by accident.
    if (e.target === overlay.root) return;
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", applyLayout, { passive: true });

  wrap.appendChild(canvas);
  wrap.appendChild(btn);
  overlay.frame.appendChild(wrap);
  applyLayout();
}


