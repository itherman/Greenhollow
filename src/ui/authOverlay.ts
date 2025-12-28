import { signInWithUsernamePassword, signUpWithUsernamePassword } from "../services/auth/authService";
import { getOrCreateGuestSession, saveSession, type Session } from "../services/auth/session";

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
  root.style.background = "rgba(0,0,0,0.6)";
  root.style.display = "flex";
  root.style.alignItems = "center";
  root.style.justifyContent = "center";
  root.style.zIndex = "9999";

  const card = el("div");
  card.style.width = "min(420px, calc(100vw - 32px))";
  card.style.maxWidth = "520px";
  card.style.background = "#141a1f";
  card.style.border = "1px solid #2a3a44";
  card.style.borderRadius = "12px";
  card.style.padding = "16px";
  card.style.color = "#fff";
  card.style.fontFamily = "system-ui, sans-serif";
  card.style.boxSizing = "border-box";

  const title = el("div");
  title.textContent = "Play";
  title.style.fontSize = "18px";
  title.style.marginBottom = "12px";
  card.appendChild(title);

  const msg = el("div");
  msg.style.minHeight = "20px";
  msg.style.marginBottom = "10px";
  msg.style.color = "#ffcc00";
  card.appendChild(msg);

  const username = el("input", { placeholder: "Username" }) as HTMLInputElement;
  username.style.width = "100%";
  username.style.boxSizing = "border-box";
  username.style.padding = "10px";
  username.style.marginBottom = "8px";
  username.style.borderRadius = "8px";
  username.style.border = "1px solid #2a3a44";
  username.style.background = "#0f1418";
  username.style.color = "#fff";

  const password = el("input", { placeholder: "Password", type: "password" }) as HTMLInputElement;
  password.style.width = "100%";
  password.style.boxSizing = "border-box";
  password.style.padding = "10px";
  password.style.marginBottom = "12px";
  password.style.borderRadius = "8px";
  password.style.border = "1px solid #2a3a44";
  password.style.background = "#0f1418";
  password.style.color = "#fff";

  card.appendChild(username);
  card.appendChild(password);

  const row = el("div");
  row.style.display = "flex";
  row.style.gap = "8px";
  row.style.flexWrap = "wrap";
  row.style.alignItems = "stretch";

  function button(label: string) {
    const b = el("button") as HTMLButtonElement;
    b.textContent = label;
    b.style.padding = "10px 12px";
    b.style.borderRadius = "10px";
    b.style.border = "1px solid #2a3a44";
    b.style.background = "#0f1418";
    b.style.color = "#fff";
    b.style.cursor = "pointer";
    b.style.boxSizing = "border-box";
    return b;
  }

  const signIn = button("Sign in");
  const signUp = button("Sign up");
  const guest = button("Continue as guest");
  guest.style.borderColor = "#3b6b88";

  row.appendChild(signIn);
  row.appendChild(signUp);
  row.appendChild(guest);
  card.appendChild(row);

  const note = el("div");
  note.style.marginTop = "12px";
  note.style.fontSize = "12px";
  note.style.color = "#b7c3cc";
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


