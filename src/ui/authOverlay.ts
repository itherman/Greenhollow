import { signInWithUsernamePassword, signUpWithUsernamePassword } from "../services/auth/authService";
import { getOrCreateGuestSession, saveSession, type Session } from "../services/auth/session";
import {
  applyGreenhollowButton,
  applyGreenhollowCard,
  applyGreenhollowInput,
  getGreenhollowTheme,
} from "./greenhollowTheme";

type MountAuthOverlayOptions = {
  onContinue: (session: Session) => void;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Record<string, string>) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

export function mountAuthOverlay(opts: MountAuthOverlayOptions) {
  const root = el("div", { id: "auth-overlay" });
  root.style.position = "fixed";
  root.style.inset = "0";
  root.style.background = "radial-gradient(circle at 50% 40%, rgba(31,91,53,0.45), rgba(11,18,32,0.88))";
  root.style.display = "flex";
  root.style.alignItems = "center";
  root.style.justifyContent = "center";
  root.style.zIndex = "9999";

  const card = el("div");
  card.style.width = "clamp(640px, 60vw, 900px)";
  card.style.maxWidth = "900px";
  card.style.textAlign = "center";
  applyGreenhollowCard(card);

  const title = el("div");
  title.textContent = "Greenhollow";
  title.style.fontSize = "48px";
  title.style.marginBottom = "14px";
  title.style.letterSpacing = "0.6px";
  title.style.textAlign = "center";
  card.appendChild(title);

  const subtitle = el("div");
  subtitle.textContent = "Enter the woods.";
  subtitle.style.fontSize = "28px";
  subtitle.style.color = getGreenhollowTheme().colors.muted;
  subtitle.style.marginBottom = "24px";
  subtitle.style.textAlign = "center";
  card.appendChild(subtitle);

  const msg = el("div");
  msg.style.minHeight = "20px";
  msg.style.marginBottom = "18px";
  msg.style.fontSize = "20px";
  msg.style.color = getGreenhollowTheme().colors.danger;
  msg.style.textAlign = "center";
  card.appendChild(msg);

  const username = el("input", { placeholder: "Username" }) as HTMLInputElement;
  applyGreenhollowInput(username);
  username.style.marginBottom = "18px";
  username.style.fontSize = "22px";
  username.style.padding = "18px 20px";
  username.style.textAlign = "center";
  username.style.width = "60%";
  username.style.marginLeft = "auto";
  username.style.marginRight = "auto";
  username.style.textAlign = "center";

  const password = el("input", { placeholder: "Password", type: "password" }) as HTMLInputElement;
  applyGreenhollowInput(password);
  password.style.marginBottom = "20px";
  password.style.fontSize = "22px";
  password.style.padding = "18px 20px";
  password.style.textAlign = "center";
  password.style.width = "60%";
  password.style.marginLeft = "auto";
  password.style.marginRight = "auto";

  card.appendChild(username);
  card.appendChild(password);

  const row = el("div");
  row.style.display = "flex";
  row.style.gap = "16px";
  row.style.flexWrap = "wrap";
  row.style.alignItems = "stretch";
  row.style.justifyContent = "center";

  function button(label: string) {
    const b = el("button") as HTMLButtonElement;
    b.textContent = label;
    b.style.boxSizing = "border-box";
    b.style.fontSize = "24px";
    b.style.padding = "18px 24px";
    b.style.minWidth = "190px";
    return b;
  }

  const signIn = button("Sign in");
  const signUp = button("Sign up");
  const guest = button("Continue as guest");
  applyGreenhollowButton(signIn, "primary");
  applyGreenhollowButton(signUp, "secondary");
  applyGreenhollowButton(guest, "secondary");
  // Enlarge buttons after theme defaults so overrides stick.
  [signIn, signUp, guest].forEach((b) => {
    b.style.fontSize = "24px";
    b.style.padding = "18px 24px";
    b.style.minWidth = "190px";
  });
  guest.style.borderColor = getGreenhollowTheme().colors.wood0;

  row.appendChild(signIn);
  row.appendChild(signUp);
  row.appendChild(guest);
  card.appendChild(row);

  const note = el("div");
  note.style.marginTop = "20px";
  note.style.fontSize = "20px";
  note.style.color = getGreenhollowTheme().colors.muted;
  note.style.textAlign = "center";
  note.textContent =
    "Guest mode works offline. Login enables cloud features (leaderboard later).";
  card.appendChild(note);

  function done(session: Session) {
    saveSession(session);
    root.remove();
    opts.onContinue(session);
  }

  guest.onclick = () => {
    done(getOrCreateGuestSession());
  };

  async function doAuth(kind: "signin" | "signup") {
    msg.textContent = "";
    const u = username.value;
    const p = password.value;
    const res =
      kind === "signin"
        ? await signInWithUsernamePassword({ username: u, password: p })
        : await signUpWithUsernamePassword({ username: u, password: p });

    if (!res.ok) {
      msg.textContent =
        res.reason === "invalid_username"
          ? "Invalid username (3-20 chars, a-z/0-9/_; must start with a letter)."
          : res.reason === "username_taken"
            ? "That username is taken."
            : "Login failed (Firebase not configured or wrong credentials).";
      return;
    }

    done({ mode: "firebase", uid: res.uid, username: res.username });
  }

  signIn.onclick = () => void doAuth("signin");
  signUp.onclick = () => void doAuth("signup");

  root.appendChild(card);
  document.body.appendChild(root);
}


