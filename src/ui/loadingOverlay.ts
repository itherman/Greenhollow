import { getGreenhollowTheme } from "./greenhollowTheme";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ensures an async task takes at least `minMs`. Tested separately to guarantee minimum display.
 */
export async function withMinDuration<T>(task: () => Promise<T>, minMs: number): Promise<T> {
  const start = Date.now();
  const result = await task();
  const remaining = Math.max(0, minMs - (Date.now() - start));
  if (remaining > 0) await wait(remaining);
  return result;
}

let overlayRoot: HTMLDivElement | null = null;
let treeEls: HTMLDivElement[] = [];
let msgEl: HTMLDivElement | null = null;

function ensureOverlay(message: string) {
  if (overlayRoot) {
    overlayRoot.style.opacity = "1";
    overlayRoot.style.pointerEvents = "auto";
    if (msgEl) msgEl.textContent = message;
    return;
  }

  const theme = getGreenhollowTheme();
  const root = document.createElement("div");
  root.id = "gh-loading-overlay";
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    background: "radial-gradient(circle at 50% 40%, rgba(16,26,20,0.9), rgba(11,18,32,0.92))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "12000",
    transition: "opacity 160ms ease",
  });

  const card = document.createElement("div");
  Object.assign(card.style, {
    width: "clamp(720px, 92vw, 1100px)",
    padding: "28px 32px 34px",
    background: "#0f171f",
    border: "2px solid #2b3a33",
    boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
    borderRadius: "10px",
    color: "#e8f0e6",
    fontFamily: "system-ui, sans-serif",
  });

  const title = document.createElement("div");
  title.textContent = "Signing in...";
  Object.assign(title.style, {
    fontSize: "26px",
    color: "#f5d76e",
    marginBottom: "14px",
    letterSpacing: "0.2px",
  });

  const msg = document.createElement("div");
  msg.textContent = message;
  Object.assign(msg.style, {
    fontSize: "18px",
    color: theme.colors.muted,
    marginBottom: "18px",
  });

  const row = document.createElement("div");
  Object.assign(row.style, {
    display: "grid",
    gridTemplateColumns: "repeat(10, 1fr)",
    gap: "8px",
    alignItems: "end",
    justifyItems: "center",
    background: "#0f1a14",
    border: "1px solid #2f3b32",
    borderRadius: "10px",
    padding: "14px 16px 18px",
    boxShadow: "inset 0 2px 6px rgba(0,0,0,0.35)",
    minWidth: "520px",
  });

  const makeTree = () => {
    const theme = getGreenhollowTheme();
    const tree = document.createElement("div");
    Object.assign(tree.style, {
      position: "relative",
      width: "24px",
      height: "40px",
      transformOrigin: "50% 100%",
      transform: "scale(0.45) translateY(10px)",
      transition: "transform 200ms ease, filter 200ms ease",
      imageRendering: "pixelated",
    });

    // Simple pixel-art pine tree matching title screen style
    // Pine silhouette: wide base, narrow top (horizontal lines)
    const canopyHeight = 26;
    const canopyContainer = document.createElement("div");
    Object.assign(canopyContainer.style, {
      position: "absolute",
      left: "0",
      right: "0",
      bottom: "8px",
      height: `${canopyHeight}px`,
      display: "flex",
      flexDirection: "column-reverse",
      alignItems: "center",
    });

    // Draw horizontal lines from bottom (wide) to top (narrow)
    for (let i = 0; i < canopyHeight; i++) {
      const width = 1 + (canopyHeight - 1 - i) * 2;
      const line = document.createElement("div");
      Object.assign(line.style, {
        width: `${width}px`,
        height: "1px",
        background: theme.colors.forest0,
        flexShrink: "0",
      });
      canopyContainer.appendChild(line);
    }

    const trunk = document.createElement("div");
    Object.assign(trunk.style, {
      position: "absolute",
      width: "4px",
      height: "8px",
      left: "50%",
      bottom: "0",
      transform: "translateX(-50%)",
      background: theme.colors.wood1,
    });

    tree.appendChild(canopyContainer);
    tree.appendChild(trunk);
    return tree;
  };

  treeEls = [];
  for (let i = 0; i < 10; i++) {
    const t = makeTree();
    treeEls.push(t);
    row.appendChild(t);
  }

  card.appendChild(title);
  card.appendChild(msg);
  card.appendChild(row);
  root.appendChild(card);
  document.body.appendChild(root);

  overlayRoot = root;
  msgEl = msg;
}

function setProgress(p: number) {
  const pct = Math.max(0, Math.min(1, p));
  treeEls.forEach((el, idx) => {
    const start = idx / 10;
    const span = 0.1;
    const growth = Math.max(0, Math.min(1, (pct - start) / span));
    const scale = 0.5 + growth * 0.85;
    const translateY = 10 - growth * 10;
    el.style.transform = `scale(${scale}) translateY(${translateY}px)`;
    el.style.filter = growth > 0.95 ? "drop-shadow(0 0 4px rgba(245,215,110,0.4))" : "none";
  });
}

async function fadeOut() {
  if (!overlayRoot) return;
  overlayRoot.style.opacity = "0";
  overlayRoot.style.pointerEvents = "none";
  await wait(200);
  overlayRoot?.remove();
  overlayRoot = null;
  treeEls = [];
  msgEl = null;
}

export async function withLoadingOverlay<T>(
  task: () => Promise<T>,
  opts?: { message?: string; minDurationMs?: number }
): Promise<T> {
  const message = opts?.message ?? "Loading your journey...";
  ensureOverlay(message);
  setProgress(0);
  // Ramp to ~90% quickly while the task runs.
  requestAnimationFrame(() => setProgress(0.3));
  setTimeout(() => setProgress(0.6), 180);
  setTimeout(() => setProgress(0.9), 420);

  const result = await withMinDuration(task, opts?.minDurationMs ?? 2000);
  setProgress(1);
  await wait(200);
  await fadeOut();
  return result;
}


