import "./style.css";
import { createGame } from "./game/createGame";
import { setGameKeyboardEnabled } from "./game/keyboardGate";
import { mountAuthOverlay } from "./ui/authOverlay";
import { mountIntroOverlay } from "./ui/introOverlay";
import { computeGameParentSize } from "./core/viewportFit";
import { computeGameBaseSize } from "./core/gameViewportPolicy";
import { loadSession, type Session } from "./services/auth/session";
import { loadCloudPlayerState } from "./services/game/cloudPlayerState";
import { applyLocalPlayerState } from "./services/game/playerStateLocal";
import { restartWorldScene } from "./game/restartWorldScene";
import { withLoadingOverlay } from "./ui/loadingOverlay";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app element");

app.innerHTML = `<div id="game-root"></div>`;

const gameRoot = document.querySelector<HTMLDivElement>("#game-root");
if (!gameRoot) throw new Error("Missing #game-root element");

function applyGameRootSizing() {
  if (!gameRoot) return;
  const r = computeGameParentSize(window.innerWidth, window.innerHeight, {
    desktopMinWidthPx: 900,
    desktopMinHeightPx: 600,
    desktopCapFactor: 0.85,
  });
  gameRoot.style.setProperty("--game-root-width", `${r.parentWidthPx}px`);
  gameRoot.style.setProperty("--game-root-height", `${r.parentHeightPx}px`);
}

applyGameRootSizing();
window.addEventListener("resize", applyGameRootSizing, { passive: true });

const game = createGame("game-root");

function applyGameBaseSize() {
  const base = computeGameBaseSize(window.innerWidth, window.innerHeight);
  // Update the virtual game size so FIT reduces extreme letterboxing on orientation changes.
  game.scale.setGameSize(base.width, base.height);
}

applyGameBaseSize();
window.addEventListener("resize", applyGameBaseSize, { passive: true });

async function continueWithSession(session: Session) {
  console.info("session", session);
  if (session.mode !== "firebase") return;

  await withLoadingOverlay(async () => {
    const r = await loadCloudPlayerState(session);
    if (!r.ok || !r.state) return;

    // Apply local stores (inventory/equipment/flags/progress).
    applyLocalPlayerState({
      inventory: r.state.inventory,
      equipment: r.state.equipment,
      flags: r.state.flags,
      progress: r.state.progress,
    });

    // Restart scene at the saved location/HP.
    restartWorldScene(game, r.state.progress);
  }, { message: "Traveling to your camp..." });
}

const existing = loadSession();
// Intro overlay should prevent movement until the user starts.
setGameKeyboardEnabled(game, false);
mountIntroOverlay({
  onStart: () => {
    if (existing) {
      setGameKeyboardEnabled(game, true);
      void continueWithSession(existing);
      return;
    }

    // Non-blocking: user can pick login or guest.
    // Important: disable Phaser keyboard capture while the DOM auth overlay is active,
    // otherwise keys like WASD may not type into inputs.
    setGameKeyboardEnabled(game, false);
    mountAuthOverlay({
      onContinue: (session) => {
        setGameKeyboardEnabled(game, true);
        void continueWithSession(session);
      },
    });
  },
});
