import "./style.css";
import { createGame } from "./game/createGame";
import { mountAuthOverlay } from "./ui/authOverlay";
import { loadSession, getOrCreateGuestSession, type Session } from "./services/auth/session";
import { loadCloudPlayerState } from "./services/game/cloudPlayerState";
import { applyLocalPlayerState } from "./services/game/playerStateLocal";
import { restartWorldScene } from "./game/restartWorldScene";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app element");

app.innerHTML = `<div id="game-root"></div>`;

const game = createGame("game-root");

async function continueWithSession(session: Session) {
  console.info("session", session);
  if (session.mode !== "firebase") return;

  const r = await loadCloudPlayerState(session);
  if (!r.ok) return;
  if (!r.state) return;

  // Apply local stores (inventory/equipment/flags/progress).
  applyLocalPlayerState({
    inventory: r.state.inventory,
    equipment: r.state.equipment,
    flags: r.state.flags,
    progress: r.state.progress,
  });

  // Restart scene at the saved location/HP.
  restartWorldScene(game, r.state.progress);
}

const existing = loadSession();
if (existing) {
  void continueWithSession(existing);
} else {
  // Non-blocking: user can pick login or guest.
  mountAuthOverlay({
    onContinue: (s) => void continueWithSession(s ?? getOrCreateGuestSession()),
  });
}
