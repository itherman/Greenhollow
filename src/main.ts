import "./style.css";
import { createGame } from "./game/createGame";
import { setGameKeyboardEnabled } from "./game/keyboardGate";
import { mountAuthOverlay } from "./ui/authOverlay";
import { mountIntroOverlay } from "./ui/introOverlay";
import { loadSession, type Session } from "./services/auth/session";
import { loadCloudPlayerState } from "./services/game/cloudPlayerState";
import { applyLocalPlayerState } from "./services/game/playerStateLocal";
import { restartWorldScene } from "./game/restartWorldScene";
import { withLoadingOverlay } from "./ui/loadingOverlay";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app element");

app.innerHTML = `<div id="game-root"></div>`;

const game = createGame("game-root");

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
